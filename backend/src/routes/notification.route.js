// backend/src/routes/notification.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/adminOnly.middleware.js";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  createBroadcastNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(protectRoute);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.post("/broadcast", adminOnly, createBroadcastNotification);

export default router;