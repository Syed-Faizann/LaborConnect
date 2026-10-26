// backend/src/middleware/bookingValidation.middleware.js
import mongoose from "mongoose";
import CompanyPage from "../models/companyPage.model.js";
import Company from "../models/company.model.js";
import { geocodeAddress, geocodeIp, calculateDistanceMiles } from "../lib/geo.js";

export const DURATION_HOURS_MAP = {
  "1–2 hours": 2,
  "1-2 hours": 2,
  "Half day": 4,
  "Full day": 8,
  "2–3 days": 24,
  "2-3 days": 24,
  "1 week or more": 40,
};

export function parseDurationHours(durationHours, durationStr) {
  if (Number(durationHours) > 0) return Number(durationHours);
  if (typeof durationStr === "string") {
    if (DURATION_HOURS_MAP[durationStr]) return DURATION_HOURS_MAP[durationStr];
    const s = durationStr.toLowerCase();
    if (s.includes("half day") || s.includes("half-day") || s.includes("4h")) return 4;
    if (s.includes("full day") || s.includes("full-day") || s.includes("8h")) return 8;
    if (s.includes("1-2") || s.includes("1–2") || s.includes("2h")) return 2;
    if (s.includes("2-3") || s.includes("2–3") || s.includes("24h")) return 24;
    if (s.includes("week") || s.includes("40h")) return 40;
    const match = s.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
    if (match) return parseFloat(match[1]);
  }
  return 2;
}

export async function resolveCustomerCoordinates(address, city, req) {
  let custCoords = null;
  const fullAddress = [address, city].filter(Boolean).join(", ");

  // 1. Try full street + city
  if (fullAddress) {
    custCoords = await geocodeAddress(fullAddress);
  }

  // 2. Try city / area alone
  if (!custCoords && city) {
    custCoords = await geocodeAddress(city);
  }

  // 3. Fallback to IP if geocoding failed and request has IP
  if (!custCoords) {
    const rawIp =
      req?.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
      req?.socket?.remoteAddress ||
      req?.ip;
    custCoords = await geocodeIp(rawIp);
  }

  return custCoords;
}

/**
 * Re-validates Service Area:
 * Enforces company coverage radius and customer coordinates before allowing bookings or payments.
 */
export async function validateServiceArea(req, res, next) {
  try {
    const { companyId, address, city } = req.body;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "A valid companyId is required." });
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ message: "Service address is required." });
    }

    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ message: "City or service area is required." });
    }

    const companyPage = await CompanyPage.findOne({ _id: companyId, published: true });
    if (!companyPage) {
      return res.status(404).json({ message: "Company not found or is not published." });
    }

    const companyProfile = await Company.findOne({ owner: companyPage.owner });
    let companyLat = companyPage.lat || companyProfile?.lat;
    let companyLng = companyPage.lng || companyProfile?.lng;
    const allowedRadius = companyPage.coverageRadius || companyProfile?.coverageRadius || 25;

    // Fallback: Geocode company if coordinates missing
    if (!companyLat || !companyLng) {
      const compLocationStr = [companyPage.street, companyPage.city, companyPage.state, companyPage.country]
        .filter(Boolean)
        .join(", ") || companyProfile?.hqLocation;

      if (compLocationStr) {
        const fixedCoords = await geocodeAddress(compLocationStr);
        if (fixedCoords) {
          companyLat = fixedCoords.lat;
          companyLng = fixedCoords.lng;
          await CompanyPage.findByIdAndUpdate(companyPage._id, {
            lat: fixedCoords.lat,
            lng: fixedCoords.lng,
            hqCoordinates: fixedCoords,
          });
        }
      }
    }

    // Fail-closed: company coordinates MUST exist
    if (!companyLat || !companyLng) {
      return res.status(400).json({
        message: "Company location is not properly configured. Cannot verify service area.",
      });
    }

    // Geocode customer coordinates
    const custCoords = await resolveCustomerCoordinates(address, city, req);
    if (!custCoords || custCoords.lat == null || custCoords.lng == null) {
      return res.status(400).json({
        message: "Unable to verify your address or city location. Please enter a valid address.",
      });
    }

    // Calculate distance
    const distanceMiles = calculateDistanceMiles(
      companyLat,
      companyLng,
      custCoords.lat,
      custCoords.lng
    );

    if (distanceMiles !== null && distanceMiles > allowedRadius) {
      return res.status(400).json({
        message: `Out of Service Area: Your location is approximately ${Math.round(
          distanceMiles
        )} miles away, but ${companyPage.name} only services up to a ${allowedRadius}-mile radius.`,
      });
    }

    // Attach for downstream handlers
    req.companyPage = companyPage;
    req.customerCoords = custCoords;
    req.distanceMiles = distanceMiles;
    next();
  } catch (error) {
    console.error("Error in validateServiceArea middleware:", error.message);
    res.status(500).json({ message: "Failed to validate service area." });
  }
}

/**
 * Re-validates Worker Count & Calculates Pricing on the Server:
 * Prevents tampered request bodies from specifying custom prices or invalid worker numbers.
 */
export async function validateWorkersAndPricing(req, res, next) {
  try {
    const companyPage = req.companyPage;
    if (!companyPage) {
      return res.status(500).json({ message: "Company context missing from service area validation." });
    }

    // Disallow self-booking
    if (req.user && companyPage.owner && companyPage.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Company owners cannot book services with their own company." });
    }

    const { services, service, workers, duration, durationHours } = req.body;
    const hours = parseDurationHours(durationHours, duration);

    let parsedServices = [];
    if (services) {
      try {
        parsedServices = typeof services === "string" ? JSON.parse(services) : services;
      } catch (_) {
        parsedServices = [];
      }
    }

    let calculatedTotal = 0;
    let totalWorkers = 0;
    const sanitizedServices = [];

    if (Array.isArray(parsedServices) && parsedServices.length > 0) {
      for (const s of parsedServices) {
        const sName = String(s.name || "").trim();
        const rawW = parseInt(s.workers, 10);
        // Worker count must be an integer between 1 and 20
        if (isNaN(rawW) || rawW < 1 || rawW > 20) {
          return res.status(400).json({
            message: `Invalid worker count for service "${sName}". Must be between 1 and 20.`,
          });
        }

        const match = companyPage.services?.find(
          (cs) => (typeof cs === "string" ? cs : cs?.name)?.toLowerCase() === sName.toLowerCase()
        );

        const rawPrice = match?.price ? parseFloat(String(match.price).replace(/[^0-9.]/g, "")) : 100;
        const rate = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 100;
        const subtotal = rate * hours * rawW;

        calculatedTotal += subtotal;
        totalWorkers += rawW;

        sanitizedServices.push({
          name: sName || "General Service",
          workers: rawW,
          rate,
          subtotal,
        });
      }
    } else {
      // Fallback: Single service calculation
      const rawW = parseInt(workers, 10);
      if (isNaN(rawW) || rawW < 1 || rawW > 20) {
        return res.status(400).json({ message: "Worker count must be an integer between 1 and 20." });
      }

      const sName = String(service || companyPage.services?.[0]?.name || "General Service").trim();
      const match = companyPage.services?.find(
        (cs) => (typeof cs === "string" ? cs : cs?.name)?.toLowerCase() === sName.toLowerCase()
      );

      const rawPrice = match?.price ? parseFloat(String(match.price).replace(/[^0-9.]/g, "")) : 100;
      const rate = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 100;
      const subtotal = rate * hours * rawW;

      calculatedTotal = subtotal;
      totalWorkers = rawW;
      sanitizedServices.push({
        name: sName,
        workers: rawW,
        rate,
        subtotal,
      });
    }

    if (calculatedTotal <= 0) calculatedTotal = 100;
    if (totalWorkers < 1 || totalWorkers > 50) {
      return res.status(400).json({ message: "Total worker count must be between 1 and 50." });
    }

    // 2% Platform Fee, 98% Company Payout
    const adminFee = Math.round(calculatedTotal * 0.02 * 100) / 100;
    const companyPayout = Math.round((calculatedTotal - adminFee) * 100) / 100;

    // Attach server-verified figures to request
    req.bookingPricing = {
      totalAmount: calculatedTotal,
      adminFee,
      companyPayout,
      hours,
      totalWorkers,
      services: sanitizedServices,
    };

    next();
  } catch (error) {
    console.error("Error in validateWorkersAndPricing middleware:", error.message);
    res.status(500).json({ message: "Failed to validate worker count and pricing." });
  }
}
