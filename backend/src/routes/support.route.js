// backend/src/routes/support.route.js
import express from "express";
import { submitSupportTicket } from "../controllers/support.controller.js";
import { supportUpload } from "../middleware/supportUpload.middleware.js";

const router = express.Router();

// POST /api/support/tickets (Handles both multipart/form-data image and text)
router.post(
  "/tickets",
  supportUpload.single("image"),
  submitSupportTicket
);

export default router;