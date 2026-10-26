import express from "express";
import { protectRoute, requireCustomerRole } from "../middleware/auth.middleware.js";
import { companyUpload } from "../middleware/companyUpload.middleware.js";
import {
  validateServiceArea,
  validateWorkersAndPricing,
} from "../middleware/bookingValidation.middleware.js";
import {
  createServiceRequest,
  getMyCompanyRequests,
  updateRequestStatus,
  getMySubmittedRequests,
  checkCoverage,
  getUnratedCompletedRequests,
  submitRequestRating,
} from "../controllers/serviceRequest.controller.js";

const router = express.Router();
router.use(protectRoute);

router.post(
  "/",
  requireCustomerRole,
  companyUpload.single("attachment"),
  validateServiceArea,
  validateWorkersAndPricing,
  createServiceRequest
);

router.post("/check-coverage", checkCoverage);
router.get("/me", getMySubmittedRequests);
router.get("/company/me", getMyCompanyRequests);

// Rating & Feedback Endpoints
router.get("/unrated", getUnratedCompletedRequests);
router.post("/:requestId/rate", submitRequestRating);

router.patch("/:requestId/status", updateRequestStatus);

export default router;