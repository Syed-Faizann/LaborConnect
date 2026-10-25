import { getAuth, clerkClient } from "@clerk/express";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";
import TeamMember from "../models/teamMember.model.js";
import AdminTeam from "../models/adminTeam.model.js";

// 1. SYNC USER
// backend/src/controllers/auth.controller.js

export async function syncUser(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase();
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      email?.split("@")[0];

    const emailRegex = new RegExp(`^${email}$`, "i");

    // 1. Check Platform Admin Staff Assignment in AdminTeam
    const adminAssignment = await AdminTeam.findOne({ email: emailRegex });

    let user = await User.findOne({ clerkId: userId });

    // 2. Check if user is company owner
    let ownedCompany = null;
    if (user) {
      ownedCompany = await Company.findOne({ owner: user._id });
    }

    // 3. Check if user is company staff (Field Crew, Manager, etc.)
    const staffAssignment = await TeamMember.findOne({ email: emailRegex });

    let role = "customer";
    let companyRole = null;
    let adminRole = null;

    if (adminAssignment) {
      // Hired Admin Staff (Platform Manager, Auditor, Tester, Support)
      role = "admin";
      adminRole = adminAssignment.roleType || "manager";
      if (adminAssignment.status !== "active") {
        adminAssignment.status = "active";
        await adminAssignment.save();
      }
    } else if (user?.role === "admin") {
      // ROOT SUPER ADMIN (Not in staff roster, but role is admin in DB)
      role = "admin";
      adminRole = user?.adminRole === "manager" ? "super_admin" : (user?.adminRole || "super_admin");
    } else if (ownedCompany) {
      role = "company";
      companyRole = "owner";
    } else if (staffAssignment) {
      role = "company";
      companyRole = staffAssignment.roleType;
      if (staffAssignment.status !== "active") {
        staffAssignment.status = "active";
        await staffAssignment.save();
      }
    }

    if (user) {
      user.email = email;
      user.fullName = fullName;
      if (clerkUser.imageUrl) user.profilePic = clerkUser.imageUrl;

      user.role = role;
      user.companyRole = companyRole;
      user.adminRole = adminRole;
      await user.save();
    } else {
      user = await User.create({
        clerkId: userId,
        email,
        fullName,
        profilePic: clerkUser.imageUrl || "",
        role,
        companyRole,
        adminRole,
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// 2. CHECK AUTH (Guarantees fresh role resolution)
export async function checkAuth(req, res) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    let user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "company") {
      // Check if user is the direct owner
      const isOwner = await Company.findOne({ owner: user._id });
      if (isOwner) {
        user.companyRole = "owner";
      } else {
        const emailRegex = new RegExp(`^${user.email?.trim()}$`, "i");
        const staff = await TeamMember.findOne({ email: emailRegex });
        if (staff) {
          user.companyRole = staff.roleType; // Sets "field_crew"
        }
      }
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in checkAuth:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// 3. REMOVE USER
export async function removeUser(req, res) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await User.findOneAndDelete({ clerkId: userId });
    res.status(200).json({ message: "User data removed" });
  } catch (error) {
    console.error("Error removing user:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}