// backend/src/controllers/notification.controller.js
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { getAuth } from "@clerk/express";

async function resolveUser(req, res) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const user = await User.findOne({ clerkId });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  return user;
}

// GET /api/notifications
export async function getMyNotifications(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    // Fetch personal notifications + broadcast announcements
    const notifications = await Notification.find({
      $or: [{ recipient: user._id }, { isBroadcast: true }],
    })
      .populate("senderCompany", "name logoUrl phone city")
      .populate("relatedRequest", "title service status date time address")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/notifications/:id/read
export async function markAsRead(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, $or: [{ recipient: user._id }, { isBroadcast: true }] },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error("Error marking notification read:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/notifications/read-all
export async function markAllAsRead(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    await Notification.updateMany(
      { recipient: user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all read:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /api/notifications/broadcast (Admin-ready)
export async function createBroadcastNotification(req, res) {
  try {
    const { title, message, category } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const broadcast = await Notification.create({
      title,
      message,
      category: category || "announcement",
      isBroadcast: true,
      isRead: false,
    });

    res.status(201).json(broadcast);
  } catch (error) {
    console.error("Error creating broadcast notice:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}