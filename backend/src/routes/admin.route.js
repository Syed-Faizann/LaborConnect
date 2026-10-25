// backend/src/routes/admin.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/adminOnly.middleware.js";
import {
  getAdminStats,
  getAllCompanies,
  updateCompanyStatus,
  getAdminFinancialStats,
  getSettings,
  updateSettings,
  broadcastNotification,
  deleteNotification,
} from "../controllers/admin.controller.js";
import {
  getAdminTeam,
  addAdminTeamMember,
  deleteAdminTeamMember,
} from "../controllers/team.controller.js";
import {
  getAdminSupportTickets,
  updateAdminSupportTicket,
} from "../controllers/support.controller.js";
import { supportUpload } from "../middleware/supportUpload.middleware.js";

const router = express.Router();

// 1. PUBLIC / CONTRACTOR ACCESSIBLE ENDPOINT
router.get("/settings/public", getSettings);

// 2. PROTECTED ADMIN ROUTES
router.use(protectRoute, adminOnly);

router.get("/stats", getAdminStats);
router.get("/financial-stats", getAdminFinancialStats);
router.get("/companies", getAllCompanies);
router.patch("/companies/:companyId/status", updateCompanyStatus);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

// Admin team
router.get("/team", getAdminTeam);
router.post("/team", addAdminTeamMember);
router.delete("/team/:id", deleteAdminTeamMember);

// Support tickets
router.get("/tickets", getAdminSupportTickets);
router.patch("/tickets/:ticketId", updateAdminSupportTicket);

// Broadcast Notifications
router.post(
  "/notifications/broadcast",
  supportUpload.single("image"),
  broadcastNotification
);
router.delete("/notifications/:id", deleteNotification);

// ⚠️ MAKE SURE THIS LINE IS AT THE VERY BOTTOM:
export default router;