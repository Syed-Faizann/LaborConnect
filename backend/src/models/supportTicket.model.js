// backend/src/models/supportTicket.model.js
import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
      default: () => `TK-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    // The user reporting the incident (Customer or Contractor)
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ["customer", "company"],
      required: true,
    },
    // Company name entered on the form
    reportedCompanyName: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional populated company reference if found in database
    reportedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    category: {
      type: String,
      enum: [
        "rejection_appeal",
        "no_show",
        "damage",
        "quality",
        "billing",
        "payment_refusal",
        "safety",
        "payout",
        "verification",
        "other",
      ],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "dismissed"],
      default: "open",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // URLs uploaded to ImageKit
    attachments: {
      type: [String],
      default: [],
    },
    adminNotes: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);