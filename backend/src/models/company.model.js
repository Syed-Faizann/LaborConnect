// backend/src/models/company.model.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    logoUrl: { type: String, default: "" },
    legalName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },

    entityType: { type: String, required: true },
    ein: { type: String, required: true },
    yearEstablished: { type: String, required: true },
    employeeRange: { type: String, required: true },
    projectVolume: { type: String, default: "" },

    // 🏢 Structured Headquarters Address
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "Pakistan" },
    hqLocation: { type: String, required: true },

    // Geocoded Coordinates & Operational Radius (Top-level & Nested)
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    hqCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    coverageRadius: { type: Number, default: 25 }, // radius in miles

    tradeCategories: { type: [String], default: [] },
    specialties: { type: [String], default: [] },
    availability: {
      emergency: { type: Boolean, default: false },
      weekend: { type: Boolean, default: false },
    },
    hourlyRate: { type: Number, default: 100 },
    dispatchFee: { type: Number, default: 0 },

    // Rating & Feedback Aggregation
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Step 4: Documents (Mixed + direct URLs)
    tradeLicense: { type: mongoose.Schema.Types.Mixed },
    tradeLicenseUrl: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    licenseExpiration: { type: String, default: "" },

    coiFile: { type: mongoose.Schema.Types.Mixed },
    coiUrl: { type: String, default: "" },

    workersCompExempt: { type: Boolean, default: false },
    certify: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

export default Company;