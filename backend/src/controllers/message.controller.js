// backend/src/controllers/message.controller.js
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Company from "../models/company.model.js";
import TeamMember from "../models/teamMember.model.js";
import AdminTeam from "../models/adminTeam.model.js";
import { getAuth } from "@clerk/express";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { uploadChatMedia } from "../lib/imagekitForMessages.js";

async function getReqUser(req) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return null;
  return await User.findOne({ clerkId });
}

export async function getUsersForSidebar(req, res) {
  try {
    const currentUser = await getReqUser(req);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    let allowedUserIds = new Set();
    const role = currentUser.role;
    const adminRole = currentUser.adminRole;

    // -------------------------------------------------------------
    // 1. ADMIN USERS
    // -------------------------------------------------------------
    if (role === "admin") {
      const isSuperAdminOrManager =
        !adminRole || adminRole === "super_admin" || adminRole === "manager";
      const isSupportSpecialist = adminRole === "support";

      // ALL Admin Staff see each other
      const adminStaff = await User.find({
        role: "admin",
        _id: { $ne: currentUser._id },
      });
      adminStaff.forEach((a) => allowedUserIds.add(String(a._id)));

      // Super Admin & Platform Manager: See all company owners
      if (isSuperAdminOrManager) {
        const companies = await Company.find().populate("owner");
        companies.forEach((c) => {
          if (c.owner && String(c.owner._id) !== String(currentUser._id)) {
            allowedUserIds.add(String(c.owner._id));
          }
        });
      }

      // Help Specialist (Support):
      if (isSupportSpecialist) {
        const managerAssignments = await TeamMember.find({
          $or: [{ roleType: "manager" }, { role: { $regex: /^manager$/i } }],
        });
        const managerEmails = managerAssignments
          .map((m) => m.email?.toLowerCase().trim())
          .filter(Boolean);

        if (managerEmails.length > 0) {
          const managerUsers = await User.find({ email: { $in: managerEmails } });
          managerUsers.forEach((u) => allowedUserIds.add(String(u._id)));
        }
      }
    }

    // -------------------------------------------------------------
    // 2. COMPANY USERS (Owner, Manager, Field Crew, Auditor, Tester)
    // -------------------------------------------------------------
    else if (role === "company") {
      const emailRegex = new RegExp(`^${currentUser.email?.trim()}$`, "i");

      const ownedCompany = await Company.findOne({ owner: currentUser._id });
      const isCompanyOwner = Boolean(ownedCompany);
      const isCompanyManager = currentUser.companyRole === "manager";

      let companyOwnerId = currentUser._id;
      if (!isCompanyOwner) {
        const assignment = await TeamMember.findOne({ email: emailRegex });
        if (assignment) {
          companyOwnerId = assignment.owner;
        }
      }

      // A. Add Company Owner to chat (if current user is a teammate)
      if (String(companyOwnerId) !== String(currentUser._id)) {
        allowedUserIds.add(String(companyOwnerId));
      }

      // B. Add fellow company teammates (Manager, Field Crew, Auditor, Tester)
      const allTeammates = await TeamMember.find({ owner: companyOwnerId });
      const teammateEmails = allTeammates
        .map((t) => t.email?.toLowerCase().trim())
        .filter(Boolean);

      if (teammateEmails.length > 0) {
        const teammateUsers = await User.find({
          email: { $in: teammateEmails },
          _id: { $ne: currentUser._id },
        });
        teammateUsers.forEach((u) => allowedUserIds.add(String(u._id)));
      }

      // C. Help Specialist (Support) available to Owner & Manager
      if (isCompanyOwner || isCompanyManager) {
        const supportUsers = await User.find({
          role: "admin",
          adminRole: "support",
        });
        supportUsers.forEach((s) => allowedUserIds.add(String(s._id)));
      }

      // D. Company Owner sees Super Admin
      if (isCompanyOwner) {
        const superAdmins = await User.find({
          role: "admin",
          $or: [{ adminRole: "super_admin" }, { adminRole: null }, { adminRole: "manager" }],
        });
        superAdmins.forEach((a) => {
          if (String(a._id) !== String(currentUser._id)) {
            allowedUserIds.add(String(a._id));
          }
        });
      }

      // E. CUSTOMERS: Both Company Manager AND Company Owner see customers who messaged them!
      // (When no manager is configured, customers reach the owner directly)
      if (isCompanyOwner || isCompanyManager) {
        const directMessages = await Message.find({
          $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }],
        });

        const otherIds = new Set();
        directMessages.forEach((m) => {
          const other =
            String(m.senderId) === String(currentUser._id)
              ? String(m.receiverId)
              : String(m.senderId);
          otherIds.add(other);
        });

        if (otherIds.size > 0) {
          const customerUsers = await User.find({
            _id: { $in: Array.from(otherIds) },
            role: "customer",
          });
          customerUsers.forEach((c) => allowedUserIds.add(String(c._id)));
        }
      }
    }

    // -------------------------------------------------------------
    // 3. CUSTOMER USERS
    // -------------------------------------------------------------
    else {
      // Find all messages involving the customer
      const customerMessages = await Message.find({
        $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }],
      });

      const otherIds = new Set();
      customerMessages.forEach((m) => {
        const other =
          String(m.senderId) === String(currentUser._id)
            ? String(m.receiverId)
            : String(m.senderId);
        otherIds.add(other);
      });

      if (otherIds.size > 0) {
        const otherIdArray = Array.from(otherIds);

        // Filter out admins (customers never see super admins)
        const nonAdminUsers = await User.find({
          _id: { $in: otherIdArray },
          role: { $ne: "admin" },
        }).select("_id email role companyRole");

        // Add any company owners or managers directly messaged
        nonAdminUsers.forEach((u) => {
          if (u.role === "company") {
            allowedUserIds.add(String(u._id));
          }
        });
      }
    }

    // Fetch and enrich contacts with company information
    const users = await User.find({ _id: { $in: Array.from(allowedUserIds) } }).select(
      "-clerkId"
    );

    const enriched = await Promise.all(
      users.map(async (u) => {
        let comp = await Company.findOne({ owner: u._id });

        let memberRec = null;
        if (!comp && u.email) {
          memberRec = await TeamMember.findOne({
            email: new RegExp(`^${u.email.trim()}$`, "i"),
          });
          if (memberRec) {
            comp = await Company.findOne({ owner: memberRec.owner });
          }
        }

        const resolvedCompanyRole =
          u.companyRole ||
          (comp && String(comp.owner) === String(u._id)
            ? "owner"
            : memberRec
            ? memberRec.roleType || memberRec.role
            : null);

        return {
          ...u.toObject(),
          companyName: comp?.legalName || comp?.name || null,
          companyStatus: comp?.status || null,
          verified: comp?.status === "verified",
          companyRole: resolvedCompanyRole,
        };
      })
    );

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const currentUser = await getReqUser(req);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: currentUser._id, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: currentUser._id },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: userToChatId, receiverId: currentUser._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const currentUser = await getReqUser(req);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const { id: receiverId } = req.params;
    const { text } = req.body;
    let mediaUrl = "";

    if (req.file) {
      mediaUrl = await uploadChatMedia(req.file);
    }

    if (!text && !mediaUrl) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = await Message.create({
      senderId: currentUser._id,
      receiverId,
      text: text || "",
      mediaUrl,
    });

    // Real-time broadcast to the receiver
    io.to(String(receiverId)).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUnreadMessagesCount(req, res) {
  try {
    const currentUser = await getReqUser(req);
    if (!currentUser) return res.status(200).json({ count: 0 });

    const count = await Message.countDocuments({
      receiverId: currentUser._id,
      read: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error.message);
    res.status(200).json({ count: 0 });
  }
}