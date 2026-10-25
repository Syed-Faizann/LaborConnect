import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyPage",
      required: true,
    },
    service: { type: String, default: "General Service" },
    services: [
      {
        name: { type: String },
        workers: { type: Number, default: 1 },
      },
    ],
    title: { type: String, required: true },
    description: { type: String, default: "" },
    workers: { type: Number, default: 1 },
    duration: { type: String, default: "8 hours" },
    durationHours: { type: Number, default: 8 },
    totalAmount: { type: Number, default: 0 },
    adminFee: { type: Number, default: 0 },
    companyPayout: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    urgency: {
      type: String,
      enum: ["normal", "urgent", "emergency", "flexible"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "scheduled", "completed", "declined"],
      default: "pending",
    },
    scheduledDate: { type: String },
    scheduledTime: { type: String },
    dispatchNotes: { type: String, default: "" },

    // MULTI-CREW ASSIGNMENT: Array of assigned TeamMember IDs
    assignedCrew: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TeamMember",
      },
    ],
    assignedWorkers: [
      {
        service: { type: String },
        crewMember: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
      },
    ],
    attachmentUrl: { type: String, default: "" },
    attachmentName: { type: String, default: "" },

    // RATING & FEEDBACK SYSTEM
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      trim: true,
      default: "",
    },
    isRated: {
      type: Boolean,
      default: false,
    },
    ratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
export default ServiceRequest;