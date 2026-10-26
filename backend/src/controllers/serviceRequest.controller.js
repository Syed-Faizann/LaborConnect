// backend/src/controllers/serviceRequest.controller.js
import mongoose from "mongoose";
import ServiceRequest from "../models/serviceRequest.model.js";
import Notification from "../models/notification.model.js";
import CompanyPage from "../models/companyPage.model.js";
import Company from "../models/company.model.js";
import User from "../models/user.model.js";
import Payment from "../models/payment.model.js";
import TeamMember from "../models/teamMember.model.js";
import { getAuth } from "@clerk/express";
import { geocodeAddress, geocodeIp, calculateDistanceMiles } from "../lib/geo.js";
import { uploadFile } from "../lib/imagekit.js";

async function resolveUser(req, res) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const user = await User.findOne({ clerkId });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  return user;
}

async function getEffectiveOwnerId(user) {
  const owned = await Company.findOne({ owner: user._id });
  if (owned) return user._id;

  if (user.email) {
    const assignment = await TeamMember.findOne({
      email: user.email.trim().toLowerCase(),
      roleType: { $in: ["manager", "auditor", "tester"] },
    });
    if (assignment && assignment.owner) {
      return assignment.owner;
    }
  }

  return user._id;
}

function normalizeDate(dStr) {
  if (!dStr) return "";
  const s = String(dStr).trim();
  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;
  }
  const mdy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${String(mdy[1]).padStart(2, "0")}-${String(mdy[2]).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDurationHours(durationHours, durationStr) {
  if (Number(durationHours) > 0) return Number(durationHours);
  if (typeof durationStr === "string") {
    const s = durationStr.toLowerCase();
    if (s.includes("half day") || s.includes("half-day") || s.includes("4 work") || s.includes("4h")) return 4;
    if (s.includes("full day") || s.includes("full-day") || s.includes("8 work") || s.includes("8h")) return 8;
    if (s.includes("1-2") || s.includes("1–2") || s.includes("2 work") || s.includes("2h")) return 2;
    if (s.includes("day") || s.includes("week")) return 8;
    const match = s.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
    if (match) return parseFloat(match[1]);
  }
  return 2;
}

function parseTimeRange(timeStr, durationHours, durationStr) {
  if (!timeStr || typeof timeStr !== "string") return null;

  const durH = parseDurationHours(durationHours, durationStr);
  const durMins = Math.round((durH > 0 ? durH : 2) * 60);

  const parseMinutes = (t) => {
    const match = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3]?.toUpperCase();

    if (meridian === "PM" && h < 12) h += 12;
    if (meridian === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const parts = timeStr.split(/–|-|to/i);
  const start = parseMinutes(parts[0]);
  if (start === null) return null;

  let end = parts[1] ? parseMinutes(parts[1]) : null;
  if (end === null || end <= start) {
    end = start + durMins;
  } else {
    if (durMins > end - start) {
      end = start + durMins;
    }
  }

  return { start, end };
}

function doTimesOverlap(t1, d1, dStr1, t2, d2, dStr2) {
  const r1 = parseTimeRange(t1, d1, dStr1);
  const r2 = parseTimeRange(t2, d2, dStr2);
  if (!r1 || !r2) return true;
  return r1.start < r2.end && r1.end > r2.start;
}

function formatMinutesTo12Hour(minutes) {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridian = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mStr = m > 0 ? `:${String(m).padStart(2, "0")}` : ":00";
  return `${h}${mStr} ${meridian}`;
}

// Global Customer Coordinate Resolver
async function resolveCustomerCoordinates(address, city, req) {
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

  // 3. Fallback to IP if not localhost
  if (!custCoords) {
    const rawIp =
      req?.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
      req?.socket?.remoteAddress ||
      req?.ip;
    custCoords = await geocodeIp(rawIp);
  }

  return custCoords;
}

// 0. PRE-CHECK SERVICE COVERAGE (Strict Global Enforcement)
export async function checkCoverage(req, res) {
  try {
    const { companyId, address, city } = req.body;
    if (!companyId) {
      return res.status(400).json({ inRange: false, message: "companyId is required" });
    }

    const companyPage = await CompanyPage.findById(companyId);
    if (!companyPage) {
      return res.status(404).json({ inRange: false, message: "Company not found" });
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

    // Geocode Customer Location (Strict - No fake bypasses)
    const custCoords = await resolveCustomerCoordinates(address, city, req);

    if (!custCoords || custCoords.lat == null || custCoords.lng == null) {
      return res.status(400).json({
        inRange: false,
        message: "Unable to verify your address or city location. Please provide a valid location.",
      });
    }

    if (companyLat && companyLng) {
      const distanceMiles = calculateDistanceMiles(
        companyLat,
        companyLng,
        custCoords.lat,
        custCoords.lng
      );

      // Strict radius check
      if (distanceMiles !== null && distanceMiles > allowedRadius) {
        return res.status(400).json({
          inRange: false,
          distanceMiles: Math.round(distanceMiles),
          allowedRadius,
          message: `Out of Service Area: Your location is approximately ${Math.round(
            distanceMiles
          )} miles away, but ${companyPage.name} only services up to a ${allowedRadius}-mile radius.`,
        });
      }

      return res.status(200).json({
        inRange: true,
        distanceMiles: Math.round(distanceMiles),
        allowedRadius,
      });
    }

    return res.status(200).json({ inRange: true, allowedRadius });
  } catch (error) {
    console.error("Error checking coverage:", error.message);
    res.status(500).json({ inRange: false, message: error.message || "Internal server error" });
  }
}

// 1. CREATE SERVICE REQUEST
export async function createServiceRequest(req, res) {
  try {
    const user = req.user || (await resolveUser(req, res));
    if (!user) return;

    // Use verified company and pricing from Express middleware
    const companyPage = req.companyPage || (await CompanyPage.findOne({ _id: req.body.companyId, published: true }));
    if (!companyPage) {
      return res.status(404).json({ message: "Company not found or is not published" });
    }

    const {
      title,
      description,
      service,
      duration,
      address,
      city,
      date,
      time,
      urgency,
    } = req.body;

    const pricing = req.bookingPricing || {};
    const gross = pricing.totalAmount || 100;
    const computedAdminFee = pricing.adminFee || Math.round(gross * 0.02 * 100) / 100;
    const computedPayout = pricing.companyPayout || Math.round((gross - computedAdminFee) * 100) / 100;
    const hours = pricing.hours || 8;
    const numWorkers = pricing.totalWorkers || 1;
    const parsedServices = pricing.services || [];

    let attachmentUrl;
    let attachmentName;
    if (req.file) {
      const uploaded = await uploadFile(req.file, "/service-requests");
      attachmentUrl = uploaded.url;
      attachmentName = uploaded.name;
    }

    const requestDoc = await ServiceRequest.create({
      customer: user._id,
      company: companyPage._id,
      service: service || parsedServices[0]?.name || "General Service",
      services: parsedServices,
      title: title || "Service Request",
      description: description || "",
      workers: numWorkers,
      duration: duration || `${hours} hours`,
      durationHours: hours,
      totalAmount: gross,
      adminFee: computedAdminFee,
      companyPayout: computedPayout,
      paymentStatus: "paid",
      address,
      city,
      date,
      time,
      urgency: urgency || "normal",
      attachmentUrl,
      attachmentName,
      status: "pending",
    });

    if (gross > 0) {
      await Payment.create({
        serviceRequest: requestDoc._id,
        company: companyPage._id,
        customer: user._id,
        stripePaymentIntentId: `pi_manual_${Date.now()}`,
        totalAmount: gross,
        adminFee: computedAdminFee,
        companyPayout: computedPayout,
        durationHours: hours,
        totalWorkers: numWorkers,
        status: "succeeded",
      });
    }

    try {
      await Notification.create({
        recipient: companyPage.owner,
        relatedRequest: requestDoc._id,
        title: `New Paid Request: ${requestDoc.title}`,
        message: `${user.fullName} booked a service for $${gross.toFixed(2)}. Net payout: $${computedPayout.toFixed(2)}.`,
        category: "announcement",
      });
    } catch (_) {}

    res.status(201).json(requestDoc);
  } catch (error) {
    console.error("Error creating service request:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// 2. GET COMPANY REQUESTS
export async function getMyCompanyRequests(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const targetOwnerId = await getEffectiveOwnerId(user);
    const companyPage = await CompanyPage.findOne({ owner: targetOwnerId });
    if (!companyPage) {
      return res.status(404).json({ message: "No company page found for this account" });
    }

    const requests = await ServiceRequest.find({ company: companyPage._id })
      .populate("customer", "fullName email profilePic phone")
      .populate("assignedCrew", "name role note photoUrl email")
      .populate("assignedWorkers.crewMember", "name role photoUrl email")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching company requests:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// 3. UPDATE REQUEST STATUS & DISPATCH MULTI-CREW
export async function updateRequestStatus(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (user.companyRole === "tester") {
      return res.status(403).json({ message: "Testers have read-only access." });
    }

    const { requestId } = req.params;
    const { status, assignedCrew, assignedWorkers, scheduledDate, scheduledTime, dispatchNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const targetOwnerId = await getEffectiveOwnerId(user);
    const companyPage = await CompanyPage.findOne({ owner: targetOwnerId });
    if (!companyPage) {
      return res.status(404).json({ message: "No company page found for this account" });
    }

    const existingReq = await ServiceRequest.findOne({ _id: requestId, company: companyPage._id });
    if (!existingReq) {
      return res.status(404).json({ message: "Request not found" });
    }

    let cleanCrewIds = [];
    if (Array.isArray(assignedCrew)) {
      cleanCrewIds = assignedCrew
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    } else if (assignedCrew && mongoose.Types.ObjectId.isValid(assignedCrew)) {
      cleanCrewIds = [new mongoose.Types.ObjectId(assignedCrew)];
    }

    const targetDate = scheduledDate || existingReq.scheduledDate || existingReq.date;
    const targetTime = scheduledTime || existingReq.scheduledTime || existingReq.time;
    const normalizedTargetDate = normalizeDate(targetDate);

    // Conflict Check
    const newStatus = status || existingReq.status;
    if (cleanCrewIds.length > 0 && normalizedTargetDate && ["accepted", "scheduled"].includes(newStatus)) {
      const activeRequests = await ServiceRequest.find({
        company: companyPage._id,
        _id: { $ne: requestId },
        status: { $in: ["accepted", "scheduled"] },
        $or: [
          { assignedCrew: { $in: cleanCrewIds } },
          { "assignedWorkers.crewMember": { $in: cleanCrewIds } },
        ],
      })
        .populate("assignedCrew", "name")
        .populate("assignedWorkers.crewMember", "name");

      for (const conflict of activeRequests) {
        const conflictDate = normalizeDate(conflict.scheduledDate || conflict.date);
        if (conflictDate === normalizedTargetDate) {
          const conflictTime = conflict.scheduledTime || conflict.time;
          const overlaps = doTimesOverlap(
            targetTime,
            existingReq.durationHours,
            existingReq.duration,
            conflictTime,
            conflict.durationHours,
            conflict.duration
          );

          if (overlaps) {
            let conflictingMemberName = "Technician";
            const conflictingCrew = conflict.assignedCrew?.find((c) =>
              cleanCrewIds.some((id) => id.equals(c._id))
            );
            if (conflictingCrew) {
              conflictingMemberName = conflictingCrew.name;
            } else {
              const conflictingWorker = conflict.assignedWorkers?.find((w) =>
                cleanCrewIds.some((id) => id.equals(w.crewMember?._id || w.crewMember))
              );
              if (conflictingWorker?.crewMember?.name) {
                conflictingMemberName = conflictingWorker.crewMember.name;
              } else {
                const memberDoc = await TeamMember.findById(cleanCrewIds[0]);
                if (memberDoc) conflictingMemberName = memberDoc.name;
              }
            }

            const conflictRange = parseTimeRange(conflictTime, conflict.durationHours, conflict.duration);
            const timeDisplay = conflictRange
              ? `${formatMinutesTo12Hour(conflictRange.start)} – ${formatMinutesTo12Hour(conflictRange.end)}`
              : conflictTime;

            return res.status(400).json({
              message: `Scheduling Conflict: ${conflictingMemberName} is already assigned to "${conflict.title}" on ${targetDate} during ${timeDisplay}. Until that task is completed, they cannot be assigned to overlapping tasks.`,
            });
          }
        }
      }
    }

    const updates = {};
    if (status) updates.status = status;
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;
    if (dispatchNotes !== undefined) updates.dispatchNotes = dispatchNotes;
    if (assignedCrew !== undefined) updates.assignedCrew = cleanCrewIds;
    if (assignedWorkers !== undefined && Array.isArray(assignedWorkers)) {
      updates.assignedWorkers = assignedWorkers;
    }

    const requestDoc = await ServiceRequest.findOneAndUpdate(
      { _id: requestId, company: companyPage._id },
      { $set: updates },
      { new: true }
    )
      .populate("customer", "fullName email profilePic phone")
      .populate("assignedCrew", "name role note photoUrl email")
      .populate("assignedWorkers.crewMember", "name role photoUrl email");

    // 1. Notify Customer
    try {
      let statusTitle = `Request Update: ${requestDoc.title}`;
      let statusMessage = `${companyPage.name || "Contractor"} updated your request to "${(status || requestDoc.status).toUpperCase()}".`;

      if (status === "scheduled" || cleanCrewIds.length > 0) {
        statusTitle = `Service Scheduled: ${requestDoc.title}`;
        const crewNames = requestDoc.assignedCrew?.map((c) => c.name).join(", ");
        statusMessage = `${companyPage.name} confirmed your appointment on ${targetDate} (${targetTime}).`;
        if (crewNames) {
          statusMessage += ` Technicians assigned: ${crewNames}.`;
        }
      }

      await Notification.create({
        recipient: requestDoc.customer._id,
        senderCompany: companyPage._id,
        relatedRequest: requestDoc._id,
        title: statusTitle,
        message: statusMessage,
        category: "request_update",
        isRead: false,
      });
    } catch (_) {}

    // 2. Notify Crew
    if (cleanCrewIds.length > 0) {
      const isRescheduled =
        (scheduledDate !== undefined && scheduledDate !== existingReq.scheduledDate) ||
        (scheduledTime !== undefined && scheduledTime !== existingReq.scheduledTime);

      for (const crewId of cleanCrewIds) {
        try {
          const member = await TeamMember.findById(crewId);
          if (member?.email) {
            const crewUser = await User.findOne({ email: member.email.trim().toLowerCase() });
            if (crewUser) {
              const workerSlot = requestDoc.assignedWorkers?.find(
                (w) =>
                  w.crewMember?._id?.toString() === crewId.toString() ||
                  w.crewMember?.toString() === crewId.toString()
              );
              const assignedTrade = workerSlot?.service || member.role || "Technician";

              const notifTitle = isRescheduled
                ? `Dispatch Rescheduled: ${requestDoc.title}`
                : `New Dispatch Assignment: ${requestDoc.title}`;

              const notifMessage = isRescheduled
                ? `The appointment for "${requestDoc.title}" has been rescheduled to ${targetDate} (${targetTime}) at ${requestDoc.address}, ${requestDoc.city}. Role: ${assignedTrade}.`
                : `You have been dispatched as ${assignedTrade} for "${requestDoc.title}" on ${targetDate} (${targetTime}) at ${requestDoc.address}, ${requestDoc.city}.`;

              await Notification.create({
                recipient: crewUser._id,
                senderCompany: companyPage._id,
                relatedRequest: requestDoc._id,
                title: notifTitle,
                message: notifMessage,
                category: "request_update",
                isRead: false,
                link: "/company-dashboard/requests",
              });
            }
          }
        } catch (err) {
          console.error("Failed to notify crew member:", err.message);
        }
      }
    }

    res.status(200).json(requestDoc);
  } catch (error) {
    console.error("Error updating request status:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// 4. GET CUSTOMER'S SUBMITTED REQUESTS
export async function getMySubmittedRequests(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const requests = await ServiceRequest.find({ customer: user._id })
      .populate("company", "name logoUrl phone email city state")
      .populate("assignedCrew", "name role photoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching your requests:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// 5. GET UNRATED COMPLETED REQUESTS (For Homepage prompt)
export async function getUnratedCompletedRequests(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const unrated = await ServiceRequest.find({
      customer: user._id,
      status: "completed",
      isRated: { $ne: true },
    })
      .populate("company", "name logoUrl city state")
      .sort({ updatedAt: -1 });

    res.status(200).json(unrated);
  } catch (error) {
    console.error("Error getting unrated requests:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// 6. SUBMIT RATING & REVIEW FOR COMPLETED REQUEST
export async function submitRequestRating(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { requestId } = req.params;
    const { rating, review } = req.body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5 stars" });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const requestDoc = await ServiceRequest.findOne({
      _id: requestId,
      customer: user._id,
      status: "completed",
    });

    if (!requestDoc) {
      return res.status(404).json({ message: "Completed service request not found" });
    }

    if (requestDoc.isRated) {
      return res.status(400).json({ message: "This request has already been rated" });
    }

    // Save rating and review on request
    requestDoc.rating = numRating;
    requestDoc.review = (review || "").trim();
    requestDoc.isRated = true;
    requestDoc.ratedAt = new Date();
    await requestDoc.save();

    // Recalculate average rating & reviewCount
    if (requestDoc.company) {
      const compPage = await CompanyPage.findOne({
        $or: [{ _id: requestDoc.company }, { owner: requestDoc.company }],
      });

      const companyPageId = compPage?._id || requestDoc.company;
      const ownerId = compPage?.owner;

      const allRatings = await ServiceRequest.find({
        $or: [{ company: companyPageId }, ...(ownerId ? [{ company: ownerId }] : [])],
        isRated: true,
        rating: { $exists: true, $gte: 1 },
      }).select("rating");

      const reviewCount = allRatings.length;
      const sum = allRatings.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
      const avgRating = reviewCount > 0 ? Number((sum / reviewCount).toFixed(1)) : 0;

      await CompanyPage.findByIdAndUpdate(companyPageId, {
        rating: avgRating,
        reviewCount,
      });

      if (ownerId) {
        await Company.findOneAndUpdate(
          { owner: ownerId },
          { rating: avgRating, reviewCount }
        );
      }
    }

    res.status(200).json({ success: true, message: "Thank you for your rating!", request: requestDoc });
  } catch (error) {
    console.error("Error submitting rating:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}