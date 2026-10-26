import Stripe from "stripe";
import CompanyPage from "../models/companyPage.model.js";
import Payment from "../models/payment.model.js";
import ServiceRequest from "../models/serviceRequest.model.js";
import User from "../models/user.model.js";
import { getAuth } from "@clerk/express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DURATION_HOURS_MAP = {
  "1–2 hours": 2,
  "Half day": 4,
  "Full day": 8,
  "2–3 days": 20,
  "1 week or more": 40,
};

// POST /api/payments/create-intent
export async function createPaymentIntent(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const company = req.companyPage;
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Use server-verified pricing from middleware
    const { totalAmount: calculatedTotal, adminFee, companyPayout, hours, totalWorkers } =
      req.bookingPricing || {};

    if (!calculatedTotal || calculatedTotal <= 0) {
      return res.status(400).json({ message: "Invalid payment calculation." });
    }

    // Create Stripe PaymentIntent in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculatedTotal * 100),
      currency: "usd",
      metadata: {
        companyId: String(company._id),
        customerId: String(user._id),
        totalAmount: String(calculatedTotal),
        adminFee: String(adminFee),
        companyPayout: String(companyPayout),
        hours: String(hours),
        totalWorkers: String(totalWorkers),
      },
      description: `Service booking for ${company.name}`,
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: calculatedTotal,
      adminFee,
      companyPayout,
      hours,
    });
  } catch (error) {
    console.error("Payment intent error:", error.message);
    res.status(500).json({ message: error.message || "Failed to initialize payment" });
  }
}

// POST /api/payments/confirm
export async function confirmPaymentRecord(req, res) {
  try {
    const { paymentIntentId, serviceRequestId } = req.body;
    const user = req.user;

    if (!paymentIntentId || !serviceRequestId) {
      return res.status(400).json({ message: "paymentIntentId and serviceRequestId are required." });
    }

    // Verify service request ownership
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ message: "Service request not found." });
    }

    if (serviceRequest.customer.toString() !== user._id.toString() && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You do not own this service request." });
    }

    // Replay attack prevention: Ensure payment hasn't already been recorded
    const existingPayment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existingPayment) {
      return res.status(400).json({ message: "This payment has already been confirmed and processed." });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!intent || intent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment has not been completed" });
    }

    const {
      companyId,
      customerId,
      totalAmount,
      adminFee,
      companyPayout,
      hours,
      totalWorkers,
    } = intent.metadata;

    // Verify metadata customer matches caller
    if (customerId && customerId !== user._id.toString() && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Payment intent was created by another user." });
    }

    const payment = await Payment.create({
      serviceRequest: serviceRequestId,
      company: companyId || serviceRequest.company,
      customer: customerId || user._id,
      stripePaymentIntentId: paymentIntentId,
      totalAmount: Number(totalAmount) || serviceRequest.totalAmount,
      adminFee: Number(adminFee) || serviceRequest.adminFee,
      companyPayout: Number(companyPayout) || serviceRequest.companyPayout,
      durationHours: Number(hours) || serviceRequest.durationHours,
      totalWorkers: Number(totalWorkers) || serviceRequest.workers,
      status: "succeeded",
    });

    // Mark service request as paid
    await ServiceRequest.findByIdAndUpdate(serviceRequestId, {
      status: "accepted",
      paymentStatus: "paid",
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error("Error confirming payment record:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}