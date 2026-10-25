import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyPage",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripePaymentIntentId: { type: String, required: true },
    totalAmount: { type: Number, required: true }, // e.g. 3840.00
    adminFee: { type: Number, required: true },    // 2% cut (76.80)
    companyPayout: { type: Number, required: true }, // 98% cut (3763.20)
    durationHours: { type: Number, required: true },
    totalWorkers: { type: Number, required: true },
    status: {
      type: String,
      enum: ["succeeded", "pending", "failed", "refunded"],
      default: "succeeded",
    },
  },
  { timestamps: true }
);

paymentSchema.index({ company: 1, createdAt: -1 });
paymentSchema.index({ customer: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;