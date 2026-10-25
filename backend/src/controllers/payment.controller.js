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
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { companyId, services, duration } = req.body;

    const company = await CompanyPage.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const hours = DURATION_HOURS_MAP[duration] || 8;

    // Calculate total based on each service's custom price * workers * hours
    let calculatedTotal = 0;
    let totalWorkers = 0;

    services.forEach((s) => {
      const match = company.services.find(
        (cs) => cs.name.toLowerCase() === s.name.toLowerCase()
      );
      // Clean numeric rate e.g. "160$" -> 160
      const rawPrice = match?.price ? parseFloat(match.price.replace(/[^0-9.]/g, "")) : 100;
      const rate = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 100;
      const workers = Number(s.workers) || 1;

      calculatedTotal += rate * hours * workers;
      totalWorkers += workers;
    });

    if (calculatedTotal <= 0) calculatedTotal = 100;

    const adminFee = Math.round(calculatedTotal * 0.02 * 100) / 100; // 2%
    const companyPayout = Math.round((calculatedTotal - adminFee) * 100) / 100; // 98%

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

    const payment = await Payment.create({
      serviceRequest: serviceRequestId,
      company: companyId,
      customer: customerId,
      stripePaymentIntentId: paymentIntentId,
      totalAmount: Number(totalAmount),
      adminFee: Number(adminFee),
      companyPayout: Number(companyPayout),
      durationHours: Number(hours),
      totalWorkers: Number(totalWorkers),
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