// middleware/auth.middleware.js
import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export function requireClerkAuth(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ message: "User profile is not synced yet" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Role Permission Middleware:
 * Ensures only users with 'customer' (or 'admin') roles can place bookings or trigger payments.
 */
export function requireCustomerRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  if (req.user.role !== "customer" && req.user.role !== "admin") {
    return res.status(403).json({
      message: "Forbidden: Only customer accounts are permitted to book services or initiate payments.",
    });
  }

  next();
}