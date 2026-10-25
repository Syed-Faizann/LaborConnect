// backend/src/models/companyPage.model.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    desc: { type: String, trim: true, default: "" },
    price: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const credentialSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    detail: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    detail: { type: String, trim: true, default: "" },
    imageUrl: String,
  },
  { _id: true }
);

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    photoUrl: String,
  },
  { _id: true }
);

const emergencyServiceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true, default: "24/7 Emergency Service" },
    description: {
      type: String,
      trim: true,
      default:
        "Immediate response for burst pipes, severe blockages, and critical water damage mitigation scenarios across the metro area.",
    },
  },
  { _id: false }
);

const weekendServiceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true, default: "Weekend & Holiday Availability" },
    description: {
      type: String,
      trim: true,
      default:
        "On-call dispatch available Saturdays, Sundays, and holidays for scheduled and urgent service.",
    },
  },
  { _id: false }
);

const companyPageSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: { type: String, trim: true, default: "" },
    tagline: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    website: { type: String, trim: true, default: "" },
    yearsInBusiness: { type: String, trim: true, default: "" },
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "Pakistan" },

    // Operational Coverage & Geocoded Coordinates
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    hqCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    coverageRadius: { type: Number, default: 25 }, // radius in miles

    logoUrl: String,
    coverImageUrl: String,

    about: { type: String, trim: true, default: "" },
    specialties: { type: [String], default: [] },
    serviceArea: { type: String, trim: true, default: "" },

    services: { type: [serviceSchema], default: [] },
    credentials: { type: [credentialSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    team: { type: [teamMemberSchema], default: [] },

    // Availability & Emergency Badges
    emergencyService: { type: emergencyServiceSchema, default: () => ({}) },
    weekendService: { type: weekendServiceSchema, default: () => ({}) },

    // Real profile view counter
    views: { type: Number, default: 0 },

    published: { type: Boolean, default: false },

    // Live rating and review counters
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError on nodemon reloads
const CompanyPage =
  mongoose.models.CompanyPage || mongoose.model("CompanyPage", companyPageSchema);

export default CompanyPage;