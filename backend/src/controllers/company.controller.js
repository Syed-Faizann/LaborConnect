// Inside backend/src/controllers/company.controller.js
import Company from "../models/company.model.js";
import CompanyPage from "../models/companyPage.model.js";
import User from "../models/user.model.js";
import TeamMember from "../models/teamMember.model.js";
import AdminSettings from "../models/adminSettings.model.js";
import AdminTeam from "../models/adminTeam.model.js";
import Notification from "../models/notification.model.js";
import { getAuth } from "@clerk/express";
import { uploadFile } from "../lib/imagekit.js";
import { geocodeAddress } from "../lib/geo.js";

export async function registerCompany(req, res) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const settings = await AdminSettings.findOne();
    if (settings && settings.acceptRegistrations === false) {
      return res.status(403).json({
        message: "Company registrations are currently paused by the platform administrator. Please try again later.",
      });
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = user.email?.trim().toLowerCase();
    const emailRegex = new RegExp(`^${userEmail}$`, "i");

    const existing = await Company.findOne({ owner: user._id });
    if (existing) {
      return res.status(409).json({ message: "You have already registered a company" });
    }

    const activeStaffAssignment = await TeamMember.findOne({ email: emailRegex });
    if (activeStaffAssignment) {
      return res.status(403).json({
        message:
          "You are already an assigned team member for a contractor company. You cannot register your own company while working on another company's team.",
      });
    }

    const adminAssignment = await AdminTeam.findOne({ email: emailRegex });
    if (adminAssignment || user.role === "admin") {
      return res.status(403).json({
        message: "Platform administrators cannot register contractor companies.",
      });
    }

    if (user.companyRole && user.companyRole !== "owner") {
      return res.status(403).json({
        message:
          "Your account is linked to an existing company team. You cannot register a new company.",
      });
    }

    const body = req.body;

    const findFile = (...fieldNames) => {
      if (Array.isArray(req.files)) {
        return req.files.find((f) => fieldNames.includes(f.fieldname)) || null;
      }
      if (req.files && typeof req.files === "object") {
        for (const name of fieldNames) {
          if (req.files[name]?.[0]) return req.files[name][0];
        }
      }
      return null;
    };

    const logo = findFile("logo", "logoFile", "image");
    const tradeLicense = findFile("tradeLicenseFile", "tradeLicense", "licenseFile", "license");
    const coi = findFile("coiFile", "coiCertificate", "coi", "insuranceFile");

    if (settings?.requireEin !== false && !body.ein?.trim()) {
      return res.status(400).json({ message: "Federal Tax ID (EIN) is required by platform policy." });
    }

    if (settings?.requireTradeLicense !== false && !tradeLicense) {
      return res.status(400).json({ message: "A valid Trade License file is required by platform policy." });
    }

    if (settings?.requireInsurance !== false && !coi) {
      return res.status(400).json({ message: "Proof of General Liability Insurance (COI) is required by platform policy." });
    }

    // 📍 1. BUILD STRUCTURED HEADQUARTERS ADDRESS
    const street = body.mainAddress || body.street || "";
    const city = body.city || "";
    const state = body.state || "";
    const country = body.country || "Pakistan";

    const fullHqLocation =
      [street, city, state, country].filter(Boolean).join(", ") ||
      body.hqLocation ||
      "";

    // Upload files and geocode full address concurrently
    const [logoResult, tradeLicenseResult, coiResult, geoCoords] = await Promise.all([
      logo ? uploadFile(logo, "/companies/logos") : null,
      tradeLicense ? uploadFile(tradeLicense, "/companies/licenses") : null,
      coi ? uploadFile(coi, "/companies/coi") : null,
      fullHqLocation ? geocodeAddress(fullHqLocation) : null,
    ]);

    console.log(`[Geocoding Check] Address: "${fullHqLocation}" -> Coordinates:`, geoCoords);

    const safeParse = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch (_) {
        return fallback;
      }
    };

    const parsedSpecialties = safeParse(body.specialties, []);
    const parsedCoverageRadius = Number(body.coverageRadius) || 25;

    // 2. CREATE COMPANY WITH STRUCTURED ADDRESS & GPS
    const company = await Company.create({
      owner: user._id,
      legalName: body.legalName,
      phone: body.phone,
      email: body.email,
      website: body.website || "",
      logoUrl: logoResult?.url || "",
      entityType: body.entityType,
      ein: body.ein || "",
      yearEstablished: body.yearEstablished,
      employeeRange: body.employeeRange,

      street,
      city,
      state,
      country,
      hqLocation: fullHqLocation,

      lat: geoCoords?.lat ?? null,
      lng: geoCoords?.lng ?? null,
      hqCoordinates: {
        lat: geoCoords?.lat ?? null,
        lng: geoCoords?.lng ?? null,
      },
      specialties: parsedSpecialties,
      coverageRadius: parsedCoverageRadius,

      tradeLicense: tradeLicenseResult
        ? {
            name: tradeLicenseResult.name || tradeLicense?.originalname || "Trade_License.pdf",
            url: tradeLicenseResult.url,
          }
        : undefined,
      tradeLicenseUrl: tradeLicenseResult?.url || "",

      licenseNumber: body.licenseNumber || "",
      licenseExpiration: body.licenseExpiration || "",

      coiFile: coiResult
        ? {
            name: coiResult.name || coi?.originalname || "COI_Certificate.pdf",
            url: coiResult.url,
          }
        : undefined,
      coiUrl: coiResult?.url || "",

      workersCompExempt: String(body.workersCompExempt) === "true",
      certify: String(body.certify) === "true",
      status: "pending",
    });

    // 3. AUTO-SYNC & LOCK INTO COMPANYPAGE STOREFRONT
    try {
      await CompanyPage.findOneAndUpdate(
        { owner: user._id },
        {
          $set: {
            name: body.legalName,
            phone: body.phone,
            email: body.email,
            website: body.website || "",
            street,
            city: city || fullHqLocation,
            state,
            country,
            logoUrl: logoResult?.url || "",
            specialties: parsedSpecialties,
            coverageRadius: parsedCoverageRadius,
            lat: geoCoords?.lat ?? null,
            lng: geoCoords?.lng ?? null,
            hqCoordinates: {
              lat: geoCoords?.lat ?? null,
              lng: geoCoords?.lng ?? null,
            },
          },
          $setOnInsert: {
            owner: user._id,
            published: false,
          },
        },
        { upsert: true, new: true }
      );
    } catch (_) {}

    res.status(201).json(company);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already registered a company" });
    }
    console.error("Error registering company:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function getMyCompanyStatus(req, res) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userEmail = user.email?.trim().toLowerCase();

    let company = await Company.findOne({ owner: user._id });
    if (company) {
      return res.status(200).json({
        ...company.toObject(),
        memberRole: "owner",
      });
    }

    if (userEmail) {
      const assignment = await TeamMember.findOne({
        email: { $regex: new RegExp(`^${userEmail}$`, "i") },
      });

      if (assignment) {
        company = await Company.findOne({ owner: assignment.owner });
        if (company) {
          await User.findByIdAndUpdate(user._id, {
            role: "company",
            companyRole: assignment.roleType,
          });

          return res.status(200).json({
            ...company.toObject(),
            memberRole: assignment.roleType,
          });
        }
      }
    }

    return res.status(404).json({ message: "No company registration found" });
  } catch (error) {
    console.error("Error in getMyCompanyStatus:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}