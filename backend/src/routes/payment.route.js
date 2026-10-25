import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createPaymentIntent,
  confirmPaymentRecord,
} from "../controllers/payment.controller.js";

const router = express.Router();
router.use(protectRoute);

router.post("/create-intent", createPaymentIntent);
router.post("/confirm", confirmPaymentRecord);

export default router;