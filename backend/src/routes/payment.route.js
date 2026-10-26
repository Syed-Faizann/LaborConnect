import express from "express";
import { protectRoute, requireCustomerRole } from "../middleware/auth.middleware.js";
import {
  validateServiceArea,
  validateWorkersAndPricing,
} from "../middleware/bookingValidation.middleware.js";
import {
  createPaymentIntent,
  confirmPaymentRecord,
} from "../controllers/payment.controller.js";

const router = express.Router();
router.use(protectRoute);

router.post(
  "/create-intent",
  requireCustomerRole,
  validateServiceArea,
  validateWorkersAndPricing,
  createPaymentIntent
);
router.post("/confirm", confirmPaymentRecord);

export default router;