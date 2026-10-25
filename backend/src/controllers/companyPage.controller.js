// backend/src/controllers/companyPage.controller.js
import mongoose from "mongoose";
import CompanyPage from "../models/companyPage.model.js";
import TeamMember from "../models/teamMember.model.js";
import Company from "../models/company.model.js";
import User from "../models/user.model.js";
import ServiceRequest from "../models/serviceRequest.model.js";
import { getAuth } from "@clerk/express";
import { uploadFile } from "../lib/imagekit.js";
import { geocodeAddress } from "../lib/geo.js";

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

export async function getMyCompanyPage(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    let targetOwnerId = user._id;

    if (user.companyRole && user.companyRole !== "owner") {
      const assignment = await TeamMember.findOne({
        email: user.email?.toLowerCase(),
        roleType: { $in: ["manager", "auditor", "tester"] },
      });
      if (assignment) {
        targetOwnerId = assignment.owner;
      }
    }

    let page = await CompanyPage.findOne({ owner: targetOwnerId });
    if (!page) {
      page = await CompanyPage.create({ owner: targetOwnerId });
    }

    // Auto-sync fallback from official Company if CompanyPage was missing logo or city
    const officialCompany = await Company.findOne({ owner: targetOwnerId });
    if (officialCompany) {
      let needsSave = false;
      if (officialCompany.logoUrl && !page.logoUrl) {
        page.logoUrl = officialCompany.logoUrl;
        needsSave = true;
      }
      if (officialCompany.hqLocation && !page.city) {
        page.city = officialCompany.city || officialCompany.hqLocation;
        page.street = officialCompany.street || page.street;
        page.state = officialCompany.state || page.state;
        page.country = officialCompany.country || page.country;
        page.lat = officialCompany.lat || page.lat;
        page.lng = officialCompany.lng || page.lng;
        page.hqCoordinates = officialCompany.hqCoordinates || page.hqCoordinates;
        needsSave = true;
      }
      if (needsSave) {
        await page.save();
      }
    }

    res.status(200).json(page);
  } catch (error) {
    console.error("Error fetching company page:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function uploadCompanyImage(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const folder = req.query.folder || "/company-pages";
    const uploaded = await uploadFile(req.file, folder);

    res.status(200).json({ url: uploaded.url, name: uploaded.name });
  } catch (error) {
    console.error("Error uploading image to ImageKit:", error.message);
    res.status(500).json({ message: error.message || "Failed to upload image" });
  }
}

const ALLOWED_FIELDS = [
  "name",
  "tagline",
  "phone",
  "email",
  "website",
  "yearsInBusiness",
  "street",
  "city",
  "state",
  "country",
  "about",
  "specialties",
  "serviceArea",
  "services",
  "credentials",
  "projects",
  "published",
  "logoUrl",
  "coverImageUrl",
  "emergencyService",
  "weekendService",
];

export async function updateMyCompanyPage(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in req.body) {
        let val = req.body[key];
        if (
          typeof val === "string" &&
          ["services", "credentials", "projects", "specialties", "emergencyService", "weekendService"].includes(key)
        ) {
          try {
            val = JSON.parse(val);
          } catch (_) {}
        }
        updates[key] = val;
      }
    }

    if (updates.published === true) {
      const company = await Company.findOne({ owner: user._id, status: "verified" });
      if (!company) {
        return res.status(403).json({
          message: "You cannot publish your storefront until your company registration has been verified.",
        });
      }
    }

    if ("services" in updates && Array.isArray(updates.services)) {
      updates.services = updates.services
        .filter((s) => s && s.name && String(s.name).trim())
        .map((s) => {
          const item = {
            name: String(s.name).trim(),
            desc: s.desc ? String(s.desc).trim() : "",
            price: s.price ? String(s.price).trim() : "",
          };
          if (s._id && mongoose.Types.ObjectId.isValid(s._id)) {
            item._id = s._id;
          }
          return item;
        });
    }

    // Handle direct file uploads if sent via multipart form
    if (req.files) {
      if (req.files.logo?.[0]) {
        const logoUpload = await uploadFile(req.files.logo[0], "/companies/logos");
        updates.logoUrl = logoUpload.url;
      }
      if (req.files.coverImage?.[0]) {
        const coverUpload = await uploadFile(req.files.coverImage[0], "/company-pages/covers");
        updates.coverImageUrl = coverUpload.url;
      }
    }

    // Check if address/city/state/country changed
    const isAddressUpdated =
      "city" in updates || "street" in updates || "state" in updates || "country" in updates;

    let geoCoords = null;
    let newLocationStr = "";

    if (isAddressUpdated) {
      const currentPage = await CompanyPage.findOne({ owner: user._id });
      const street = "street" in updates ? updates.street : currentPage?.street || "";
      const city = "city" in updates ? updates.city : currentPage?.city || "";
      const state = "state" in updates ? updates.state : currentPage?.state || "";
      const country = "country" in updates ? updates.country : currentPage?.country || "Pakistan";

      newLocationStr = [street, city, state, country].filter(Boolean).join(", ");
      if (!newLocationStr && city) newLocationStr = city;

      if (newLocationStr) {
        try {
          geoCoords = await geocodeAddress(newLocationStr);
          if (geoCoords && geoCoords.lat != null && geoCoords.lng != null) {
            updates.lat = parseFloat(geoCoords.lat.toFixed(7));
            updates.lng = parseFloat(geoCoords.lng.toFixed(7));
            updates.hqCoordinates = {
              lat: updates.lat,
              lng: updates.lng,
            };
          }
        } catch (geoErr) {
          console.warn("Geocoding failed for updated location:", geoErr.message);
        }
      }
    }

    // 1. Update CompanyPage
    const page = await CompanyPage.findOneAndUpdate(
      { owner: user._id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 2. Sync to Company Model
    const companyUpdates = {};

    if ("logoUrl" in updates) {
      companyUpdates.logoUrl = updates.logoUrl || "";
    }

    if (isAddressUpdated) {
      if (newLocationStr) companyUpdates.hqLocation = newLocationStr;
      if ("street" in updates) companyUpdates.street = updates.street;
      if ("city" in updates) companyUpdates.city = updates.city;
      if ("state" in updates) companyUpdates.state = updates.state;
      if ("country" in updates) companyUpdates.country = updates.country;

      if (geoCoords && geoCoords.lat != null && geoCoords.lng != null) {
        companyUpdates.lat = parseFloat(geoCoords.lat.toFixed(7));
        companyUpdates.lng = parseFloat(geoCoords.lng.toFixed(7));
        companyUpdates.hqCoordinates = {
          lat: companyUpdates.lat,
          lng: companyUpdates.lng,
        };
      }
    }

    if (Object.keys(companyUpdates).length > 0) {
      await Company.findOneAndUpdate(
        { owner: user._id },
        { $set: companyUpdates }
      );
    }

    res.status(200).json(page);
  } catch (error) {
    console.error("Error updating company page:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// GET /api/company-page/public/:companyPageId — read-only fetch with manager resolution & owner fallback
export async function getPublicCompanyPage(req, res) {
  try {
    const { companyPageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }

    const page = await CompanyPage.findOne({
      $or: [{ _id: companyPageId }, { owner: companyPageId }],
      published: true,
    }).populate("owner", "fullName email profilePic role");

    if (!page) {
      return res.status(404).json({ message: "Company page not found" });
    }

    const ownerId = page.owner?._id || page.owner;

    // Verify company is active and verified
    const company = await Company.findOne({ owner: ownerId, status: "verified" });
    if (!company) {
      return res.status(404).json({ message: "Company profile is not active or unverified" });
    }

    const pageObj = page.toObject();

    // 🏢 Combine all address fields into the full headquarters location
    const combinedHq = [page.street, page.city, page.state, page.country]
      .filter(Boolean)
      .join(", ");

    pageObj.hqLocation = company.hqLocation || combinedHq || page.city;
    pageObj.street = page.street || company.street || "";
    pageObj.country = page.country || company.country || "Pakistan";

    const managerMember = await TeamMember.findOne({
      owner: ownerId,
      $or: [
        { roleType: "manager" },
        { role: { $regex: /^manager$/i } },
      ],
    });

    pageObj.manager = null;

    if (managerMember?.email) {
      const managerUser = await User.findOne({
        email: new RegExp(`^${managerMember.email.trim()}$`, "i"),
      }).select("_id fullName email profilePic companyRole");

      if (managerUser) {
        pageObj.manager = {
          _id: managerUser._id,
          name: managerUser.fullName || managerMember.name,
          email: managerUser.email,
          profilePic: managerUser.profilePic || managerMember.photoUrl || "",
        };
      }
    }

    res.status(200).json(pageObj);
  } catch (error) {
    console.error("Error fetching public company page:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// POST /api/company-page/public/:companyPageId/view
export async function recordCompanyPageView(req, res) {
  try {
    const { companyPageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyPageId)) {
      return res.status(400).json({ message: "Invalid company page ID" });
    }

    const page = await CompanyPage.findOneAndUpdate(
      { _id: companyPageId, published: true },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!page) {
      return res.status(404).json({ message: "Company page not found or not published" });
    }

    res.status(200).json({ success: true, views: page.views });
  } catch (error) {
    console.error("Error recording view:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// GET /api/company-page/public — ONLY return verified companies with live aggregated ratings
export async function listPublishedCompanyPages(req, res) {
  try {
    const verifiedCompanies = await Company.find({ status: "verified" }).select("owner rating reviewCount");
    const verifiedOwnerIds = verifiedCompanies.map((c) => c.owner);

    const pages = await CompanyPage.find({
      published: true,
      owner: { $in: verifiedOwnerIds },
    })
      .select(
        "name tagline about specialties city state logoUrl coverImageUrl services team published views emergencyService weekendService owner rating reviewCount street country"
      )
      .sort({ updatedAt: -1 })
      .lean();

    const pageIds = pages.map((p) => p._id);
    const ownerIds = pages.map((p) => p.owner).filter(Boolean);

    const ratingsAgg = await ServiceRequest.aggregate([
      {
        $match: {
          company: { $in: [...pageIds, ...ownerIds] },
          isRated: true,
          rating: { $gte: 1 },
        },
      },
      {
        $group: {
          _id: "$company",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const aggMap = new Map();
    ratingsAgg.forEach((r) => {
      aggMap.set(r._id.toString(), {
        rating: Number(r.avgRating.toFixed(1)),
        reviewCount: r.count,
      });
    });

    const companyMap = new Map();
    verifiedCompanies.forEach((c) => {
      companyMap.set(c.owner.toString(), c);
    });

    const enrichedPages = pages.map((page) => {
      const agg =
        aggMap.get(page._id.toString()) ||
        (page.owner ? aggMap.get(page.owner.toString()) : null);
      const comp = page.owner ? companyMap.get(page.owner.toString()) : null;

      const finalRating = agg?.rating || page.rating || comp?.rating || 0;
      const finalCount = agg?.reviewCount || page.reviewCount || comp?.reviewCount || 0;

      return {
        ...page,
        status: "verified",
        isVerified: true,
        rating: finalRating,
        reviewCount: finalCount,
      };
    });

    res.status(200).json(enrichedPages);
  } catch (error) {
    console.error("Error listing company pages:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function removeTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { memberId } = req.params;
    if (!memberId || memberId === "undefined") {
      return res.status(400).json({ message: "Invalid team member ID" });
    }

    const targetId = mongoose.Types.ObjectId.isValid(memberId)
      ? new mongoose.Types.ObjectId(memberId)
      : memberId;

    const page = await CompanyPage.findOneAndUpdate(
      { owner: user._id },
      { $pull: { team: { _id: targetId } } },
      { new: true }
    );

    if (!page) {
      return res.status(404).json({ message: "Company page not found" });
    }

    res.status(200).json(page);
  } catch (error) {
    console.error("Error removing team member:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function addTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { name, role, note, photoUrl } = req.body;
    if (!name?.trim() || !role?.trim()) {
      return res.status(400).json({ message: "Name and role are required" });
    }

    const page = await CompanyPage.findOneAndUpdate(
      { owner: user._id },
      {
        $push: {
          team: {
            name: name.trim(),
            role: role.trim(),
            note: note?.trim(),
            photoUrl: photoUrl?.trim() || undefined,
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(page);
  } catch (error) {
    console.error("Error adding team member:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}