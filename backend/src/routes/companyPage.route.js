// backend/src/routes/companyPage.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { companyUpload } from "../middleware/companyUpload.middleware.js";
import {
  getMyCompanyPage,
  updateMyCompanyPage,
  uploadCompanyImage,
  addTeamMember,
  removeTeamMember,
  getPublicCompanyPage,
  recordCompanyPageView, // <-- ADD THIS
  listPublishedCompanyPages,
} from "../controllers/companyPage.controller.js";

const router = express.Router();

// Public routes
router.get("/public", listPublishedCompanyPages);
router.get("/public/:companyPageId", getPublicCompanyPage);
router.post("/public/:companyPageId/view", recordCompanyPageView); // <-- ADD THIS

// Authenticated owner routes
router.use(protectRoute);
// ... rest remains unchanged

router.get("/me", getMyCompanyPage);

// Single dedicated image upload (e.g. Logo, Banner, Project photos)
router.post("/me/upload-image", companyUpload.single("image"), uploadCompanyImage);

// Full update with optional direct file attachments
router.put(
  "/me",
  companyUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateMyCompanyPage
);

router.post("/me/team", addTeamMember);
router.delete("/me/team/:memberId", removeTeamMember);

export default router;