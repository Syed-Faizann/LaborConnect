// backend/src/controllers/support.controller.js
import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";
import SupportTicket from "../models/supportTicket.model.js";
import Notification from "../models/notification.model.js"; // <-- 1. IMPORT NOTIFICATION
import { uploadFile } from "../lib/imagekit.js";

// Helper to resolve authenticated user from Clerk token
async function resolveUser(req) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return null;
    return await User.findOne({ clerkId });
  } catch {
    return req.user || null;
  }
}

// 1. POST /api/support/tickets
export async function submitSupportTicket(req, res) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ message: "You must be signed in to submit a support report." });
    }

    const {
      subject,
      description,
      category,
      priority,
      reporterRole,
      reportedCompanyName,
    } = req.body;

    if (!reportedCompanyName?.trim()) {
      return res.status(400).json({ message: "Company name is required." });
    }

    if (!subject?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Subject and description are required." });
    }

    const finalAttachments = [];

    // If an image was uploaded with the form
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, "/support-tickets");
        if (uploadResult?.url) {
          finalAttachments.push(uploadResult.url);
        }
      } catch (uploadError) {
        console.error("ImageKit upload error in support ticket:", uploadError);
      }
    }

    // Attempt to match company in database
    const matchedCompany = await Company.findOne({
      legalName: { $regex: new RegExp(`^${reportedCompanyName.trim()}$`, "i") },
    });

    const ticket = await SupportTicket.create({
      reporter: user._id,
      reporterRole: reporterRole === "company" ? "company" : "customer",
      reportedCompanyName: reportedCompanyName.trim(),
      reportedCompany: matchedCompany?._id || null,
      category: category || "other",
      priority: priority || "medium",
      subject: subject.trim(),
      description: description.trim(),
      attachments: finalAttachments,
      status: "open",
    });

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate("reporter", "fullName email profilePic role")
      .populate("reportedCompany", "legalName phone email status");

    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error("Error submitting support ticket:", error.message);
    res.status(500).json({ message: error.message || "Failed to submit report." });
  }
}

// 2. GET /api/admin/tickets (Admin only)
export async function getAdminSupportTickets(req, res) {
  try {
    const { status, role, priority } = req.query;
    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (role && role !== "all") filter.reporterRole = role;
    if (priority && priority !== "all") filter.priority = priority;

    const tickets = await SupportTicket.find(filter)
      .populate("reporter", "fullName email profilePic role")
      .populate("reportedCompany", "legalName phone email status")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching support tickets:", error.message);
    res.status(500).json({ message: "Failed to load support tickets." });
  }
}

// 3. PATCH /api/admin/tickets/:ticketId (Admin only)
export async function updateAdminSupportTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const { status, priority, adminNotes } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    if (status === "resolved" || status === "dismissed") {
      updates.resolvedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: updates },
      { new: true }
    )
      .populate("reporter", "fullName email profilePic role")
      .populate("reportedCompany", "legalName phone email status");

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found." });
    }

    // ========================================================
    // SEND NOTIFICATION TO REPORTER WITH THE ADMIN'S DESCRIPTION
    // ========================================================
    if (["in_progress", "resolved", "dismissed"].includes(status) && ticket.reporter) {
      try {
        const statusLabel =
          status === "resolved"
            ? "Resolved"
            : status === "in_progress"
            ? "In Progress"
            : "Dismissed";

        // Show the admin's added notes, or fallback to ticket subject summary
        const noteDescription = adminNotes?.trim()
          ? adminNotes.trim()
          : `Your support ticket regarding "${ticket.subject}" has been marked as ${statusLabel}.`;

        await Notification.create({
          recipient: ticket.reporter._id || ticket.reporter,
          title: `Support Ticket #${ticket.ticketId}: ${statusLabel}`,
          message: noteDescription,
          category: "alert",
          link: "/support",
          isBroadcast: false,
          isRead: false,
        });
      } catch (notifErr) {
        console.error("Failed to dispatch ticket notification:", notifErr.message);
      }
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error("Error updating support ticket:", error.message);
    res.status(500).json({ message: "Failed to update support ticket." });
  }
}