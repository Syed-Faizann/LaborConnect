// backend/src/middleware/adminOnly.middleware.js
import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export async function adminOnly(req, res, next) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error("Error in adminOnly middleware:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}