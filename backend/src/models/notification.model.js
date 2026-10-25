// backend/src/models/notification.model.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // null when it's a broadcast notice for all users
    },
    senderCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyPage",
    },
    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["request_update", "announcement", "alert"],
      default: "request_update",
    },
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      default: "",
    },
    // Add imageUrl to your notificationSchema fields:
imageUrl: {
  type: String,
  default: "",
},
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;