import mongoose from "mongoose";
import Company from "../models/company.model.js";
import CompanyPage from "../models/companyPage.model.js";
import User from "../models/user.model.js";
import TeamMember from "../models/teamMember.model.js"; // <-- Added TeamMember import
import AdminTeam from "../models/adminTeam.model.js";
import AdminSettings from "../models/adminSettings.model.js";
import Notification from "../models/notification.model.js";
import SupportTicket from "../models/supportTicket.model.js";
import Payment from "../models/payment.model.js";
import ServiceRequest from "../models/serviceRequest.model.js";
import { uploadFile } from "../lib/imagekit.js";

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
export async function getAdminStats(req, res) {
  try {
    const [totalUsers, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments({ status: "pending" }),
      Company.countDocuments({ status: "verified" }),
      Company.countDocuments({ status: "rejected" }),
    ]);

    res.status(200).json({
      totalUsers,
      pendingCount,
      verifiedCount,
      rejectedCount,
    });
  } catch (error) {
    console.error("Error in getAdminStats:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// ==========================================
// 2. FINANCIAL STATS & 2% FEE BREAKDOWN
// ==========================================
export async function getAdminFinancialStats(req, res) {
  try {
    // 1. Try to fetch from Payment collection first
    let payments = await Payment.find({ status: "succeeded" })
      .populate("company", "name logoUrl")
      .populate("customer", "fullName email")
      .sort({ createdAt: -1 });

    // 2. If no Payment docs yet, fallback to ServiceRequest collection
    if (!payments || payments.length === 0) {
      const requests = await ServiceRequest.find({
        status: { $ne: "declined" },
      })
        .populate("company", "name logoUrl")
        .populate("customer", "fullName email")
        .sort({ createdAt: -1 });

      payments = requests.map((r) => {
        const gross = r.totalAmount || 0;
        const fee = r.adminFee || Math.round(gross * 0.02 * 100) / 100;
        const payout = r.companyPayout || Math.round((gross - fee) * 100) / 100;

        return {
          _id: r._id,
          company: r.company,
          customer: r.customer,
          durationHours: r.durationHours || 8,
          totalWorkers: r.workers || 1,
          totalAmount: gross,
          adminFee: fee,
          companyPayout: payout,
          status: "succeeded",
          createdAt: r.createdAt,
        };
      });
    }

    const totalVolume = payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const totalAdminRevenue = payments.reduce((acc, p) => acc + (p.adminFee || 0), 0);
    const totalCompanyPayouts = payments.reduce((acc, p) => acc + (p.companyPayout || 0), 0);

    // Group fees by company for chart
    const companyEarningsMap = {};
    payments.forEach((p) => {
      const companyName = p.company?.name || "Contractor";
      if (!companyEarningsMap[companyName]) {
        companyEarningsMap[companyName] = {
          name: companyName,
          totalProcessed: 0,
          adminFeePaid: 0,
          companyEarned: 0,
          jobsCount: 0,
        };
      }
      companyEarningsMap[companyName].totalProcessed += p.totalAmount || 0;
      companyEarningsMap[companyName].adminFeePaid += p.adminFee || 0;
      companyEarningsMap[companyName].companyEarned += p.companyPayout || 0;
      companyEarningsMap[companyName].jobsCount += 1;
    });

    res.status(200).json({
      totalVolume,
      totalAdminRevenue,
      totalCompanyPayouts,
      transactionsCount: payments.length,
      companyChartData: Object.values(companyEarningsMap),
      recentTransactions: payments.slice(0, 15),
    });
  } catch (error) {
    console.error("Error getting financial stats:", error.message);
    res.status(500).json({ message: error.message || "Failed to load financial statistics" });
  }
}

// ==========================================
// 3. COMPANIES MANAGEMENT
// ==========================================
export async function getAllCompanies(req, res) {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};

    const companies = await Company.find(filter)
      .populate("owner", "fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(companies);
  } catch (error) {
    console.error("Error in getAllCompanies:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function getPendingCompanies(req, res) {
  req.query.status = "pending";
  return getAllCompanies(req, res);
}

export async function updateCompanyStatus(req, res) {
  try {
    const { companyId } = req.params;
    const { status } = req.body;

    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { status },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (status === "verified" && company.owner) {
      await Promise.all([
        User.findByIdAndUpdate(company.owner, { role: "company" }),
        CompanyPage.findOneAndUpdate(
          { owner: company.owner },
          { published: true }
        ),
      ]);
    }

    if (status !== "verified" && company.owner) {
      await Promise.all([
        User.findByIdAndUpdate(company.owner, { role: "customer" }),
        CompanyPage.findOneAndUpdate(
          { owner: company.owner },
          { published: false }
        ),
      ]);
    }

    if (["verified", "rejected"].includes(status) && company.owner) {
      await Notification.create({
        recipient: company.owner,
        title: `Company Registration ${status === "verified" ? "Approved" : "Rejected"}`,
        message:
          status === "verified"
            ? `Congratulations! ${company.legalName} has been approved. You now have full contractor dashboard access.`
            : `Your registration for ${company.legalName} was rejected. Your public listing has been removed from the marketplace.`,
        category: "alert",
      });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("Error in updateCompanyStatus:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// ==========================================
// 4. ADMIN TEAM CRUD & STRICT CONFLICT CHECKS
// ==========================================
export async function getAdminTeam(req, res) {
  try {
    const team = await AdminTeam.find().sort({ createdAt: 1 });
    res.status(200).json(team);
  } catch (error) {
    console.error("Error in getAdminTeam:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function addAdminTeamMember(req, res) {
  try {
    const { name, role, email, note, photoUrl } = req.body;

    if (!name?.trim() || !role?.trim()) {
      return res.status(400).json({ message: "Name and role are required" });
    }

    if (email?.trim()) {
      const targetEmail = email.trim().toLowerCase();
      const emailRegex = new RegExp(`^${targetEmail}$`, "i");

      // 1. BLOCK: Check if user is already an assigned crew/staff of ANY contractor company
      const crewMember = await TeamMember.findOne({ email: emailRegex });
      if (crewMember) {
        return res.status(400).json({
          message:
            "Cannot add as admin: This user is already assigned to a contractor company team.",
        });
      }

      // 2. BLOCK: Check if user already owns a contractor company
      const userDoc = await User.findOne({ email: emailRegex });
      const companyOwnerByEmail = await Company.findOne({ email: emailRegex });
      const companyOwnerById = userDoc ? await Company.findOne({ owner: userDoc._id }) : null;

      if (companyOwnerByEmail || companyOwnerById) {
        return res.status(400).json({
          message:
            "Cannot add as admin: This user is already a registered contractor company owner.",
        });
      }

      // 3. BLOCK: Check if already in AdminTeam
      const existingAdmin = await AdminTeam.findOne({ email: emailRegex });
      if (existingAdmin) {
        return res.status(400).json({
          message: "This user is already a platform admin team member.",
        });
      }

      // 4. Update the User model if they have already registered an account
      if (userDoc) {
        userDoc.role = "admin";
        userDoc.adminRole = role.trim().toLowerCase();
        await userDoc.save();
      }
    }

    const member = await AdminTeam.create({
      name: name.trim(),
      role: role.trim(),
      email: email?.trim().toLowerCase() || undefined,
      note: note?.trim() || undefined,
      photoUrl: photoUrl?.trim() || undefined,
      status: "ready",
    });

    res.status(201).json(member);
  } catch (error) {
    console.error("Error in addAdminTeamMember:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function deleteAdminTeamMember(req, res) {
  try {
    const id = req.params.id || req.params.memberId;
    const deleted = await AdminTeam.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Admin team member not found" });
    }

    // Revert user role back to customer if they registered with this email
    if (deleted.email) {
      await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${deleted.email}$`, "i") } },
        { $set: { role: "customer", adminRole: null } }
      );
    }

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in deleteAdminTeamMember:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// ==========================================
// 5. PLATFORM SETTINGS
// ==========================================
export async function getSettings(req, res) {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in getSettings:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

// Inside backend/src/controllers/admin.controller.js

export async function updateSettings(req, res) {
  try {
    // Strip _id, __v, createdAt to avoid Mongoose immutable field errors
    const { _id, __v, createdAt, updatedAt, ...updateData } = req.body;

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in updateSettings:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}
// ==========================================
// 6. BROADCAST NOTIFICATIONS
// ==========================================
export async function broadcastNotification(req, res) {
  try {
    const { title, message, category } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    let imageUrl = "";
    if (req.file) {
      const uploadRes = await uploadFile(req.file, "/notifications");
      imageUrl = uploadRes.url;
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      category: category || "announcement",
      imageUrl,
      isBroadcast: true,
      isRead: false,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error("Error in broadcastNotification:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNotification:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}
