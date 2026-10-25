import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    formTitle: { type: String, default: "Register your service company" },
    supportEmail: { type: String, default: "support@laborconnect.com" },
    reviewTime: { type: String, default: "2–3 business days" },
    intro: {
      type: String,
      default:
        "Tell us about your company and the services you provide. Our team will review your details before approval.",
    },
    requireEin: { type: Boolean, default: true },
    requireInsurance: { type: Boolean, default: true },
    requireServiceArea: { type: Boolean, default: true },
    requireTradeLicense: { type: Boolean, default: true },
    allowWebsite: { type: Boolean, default: false },
    manualReview: { type: Boolean, default: true },
    emailConfirmation: { type: Boolean, default: true },
    expiryAlerts: { type: Boolean, default: true },
    acceptRegistrations: { type: Boolean, default: true },
    categories: {
      type: [String],
      default: ["Plumbing", "Electrical", "Gardening", "Cleaning", "Carpentry", "HVAC", "Roofing"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminSettings", adminSettingsSchema);