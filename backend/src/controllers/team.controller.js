import TeamMember from "../models/teamMember.model.js";
import AdminTeam from "../models/adminTeam.model.js";
import Company from "../models/company.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getAuth } from "@clerk/express";

// ----------------------------------------------------
// Helper: Resolve Authenticated User
// ----------------------------------------------------
async function resolveUser(req, res) {
  if (req.user) return req.user;

  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ message: "Unauthorized. Please sign in again." });
    return null;
  }
  const user = await User.findOne({ clerkId });
  if (!user) {
    res.status(404).json({ message: "User account not found." });
    return null;
  }
  return user;
}

// ====================================================
// 1. SHARED: Search Registered User By Email
// ====================================================
export async function searchUserByEmail(req, res) {
  try {
    const caller = await resolveUser(req, res);
    if (!caller) return;

    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email query parameter is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = new RegExp(`^${cleanEmail}$`, "i");

    // 1. Look up registered user
    const targetUser = await User.findOne({ email: emailRegex }).select(
      "fullName email profilePic role companyRole adminRole"
    );

    if (!targetUser) {
      return res.status(404).json({
        message: "No registered user found with this email. Make sure they signed up first.",
      });
    }

    // RULES FOR COMPANIES SEARCHING MEMBERS
    let callerCompany = await Company.findOne({ owner: caller._id });
    if (!callerCompany && caller.companyRole === "manager") {
      const staffRecord = await TeamMember.findOne({ email: caller.email?.toLowerCase() });
      if (staffRecord) {
        callerCompany = await Company.findOne({ owner: staffRecord.owner });
      }
    }

    if (callerCompany) {
      if (cleanEmail === caller.email?.toLowerCase()) {
        return res.status(400).json({
          message: "You are already a member of this company workspace.",
        });
      }

      // Block if user is Super Admin
      const isPlatformAdmin =
        targetUser.role === "admin" ||
        Boolean(targetUser.adminRole) ||
        Boolean(await AdminTeam.findOne({ email: emailRegex }));

      if (isPlatformAdmin) {
        return res.status(400).json({
          message: "This user is a Platform Administrator and cannot be added to a company crew.",
        });
      }

      // Block if user owns another company
      const ownsCompany = await Company.findOne({
        $or: [{ owner: targetUser._id }, { email: emailRegex }],
      });

      if (ownsCompany) {
        const compTitle = ownsCompany.legalName || ownsCompany.name || "another registered company";
        return res.status(400).json({
          message: `This user already owns "${compTitle}" and cannot be added as a crew member.`,
        });
      }

      // Block if already in caller's own team
      const alreadyInMyTeam = await TeamMember.findOne({
        owner: callerCompany.owner,
        email: emailRegex,
      });
      if (alreadyInMyTeam) {
        return res.status(400).json({
          message: `This user is already on your company roster as ${alreadyInMyTeam.roleType.toUpperCase()}.`,
        });
      }

      // Block if already on another company's team
      const assignedToOtherCompany = await TeamMember.findOne({
        owner: { $ne: callerCompany.owner },
        email: emailRegex,
      }).populate("company", "legalName name");

      if (assignedToOtherCompany) {
        const otherCompName =
          assignedToOtherCompany.company?.legalName ||
          assignedToOtherCompany.company?.name ||
          "another company";
        return res.status(400).json({
          message: `This user is already an assigned ${assignedToOtherCompany.roleType.toUpperCase()} at "${otherCompName}". A user cannot belong to multiple companies.`,
        });
      }
    }

    // RULES FOR PLATFORM ADMINS SEARCHING STAFF
    if (caller.role === "admin") {
      const alreadyAdmin = await AdminTeam.findOne({ email: emailRegex });
      if (alreadyAdmin) {
        return res.status(400).json({
          message: `This user is already an assigned Platform Administrator (${alreadyAdmin.roleType.toUpperCase()}).`,
        });
      }

      // Block if user owns a company
      const isCompanyOwner = await Company.findOne({
        $or: [{ owner: targetUser._id }, { email: emailRegex }],
      });
      if (isCompanyOwner) {
        return res.status(400).json({
          message: `This user is the owner of "${isCompanyOwner.legalName || "a registered company"}". Company owners cannot be platform staff.`,
        });
      }

      // BLOCK: If user is on ANY company team (Field Crew, Manager, etc.)
      const assignedToCompany = await TeamMember.findOne({ email: emailRegex }).populate(
        "company",
        "legalName name"
      );

      if (assignedToCompany) {
        const compName =
          assignedToCompany.company?.legalName ||
          assignedToCompany.company?.name ||
          "a contractor company";
        return res.status(400).json({
          message: `This user is already an assigned ${assignedToCompany.roleType.toUpperCase()} at "${compName}". Company crew members cannot be platform staff.`,
        });
      }
    }

    res.status(200).json(targetUser);
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: error.message || "Failed to search user." });
  }
}

// ====================================================
// 2. COMPANY TEAM OPERATIONS
// ====================================================
export async function getMyTeam(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    let targetOwnerId = user._id;

    if (user.companyRole && user.companyRole !== "owner") {
      // Allow Field Crew, Manager, Auditor, Tester to get team roster
      const assignment = await TeamMember.findOne({
        email: user.email?.toLowerCase(),
      });
      if (assignment) {
        targetOwnerId = assignment.owner;
      }
    }

    const crew = await TeamMember.find({ owner: targetOwnerId }).sort({ createdAt: 1 });
    res.status(200).json(crew);
  } catch (error) {
    console.error("Error fetching company team:", error);
    res.status(500).json({ message: error.message || "Internal server error." });
  }
}

export async function addTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    // Field crew, auditors, and testers cannot add team members
    if (["auditor", "tester", "field_crew"].includes(user.companyRole)) {
      return res.status(403).json({
        message: "Your role does not have permission to add team members.",
      });
    }

    let ownerId = user._id;
    let company = await Company.findOne({ owner: user._id });

    // Allow managers to add crew members to the company
    if (!company && user.companyRole === "manager") {
      const managerAssignment = await TeamMember.findOne({ email: user.email?.toLowerCase() });
      if (managerAssignment) {
        ownerId = managerAssignment.owner;
        company = await Company.findOne({ owner: ownerId });
      }
    }

    if (!company) {
      return res.status(404).json({ message: "Company profile not found." });
    }

    const { name, role, email, roleType, note, photoUrl } = req.body;
    if (!name?.trim() || !role?.trim()) {
      return res.status(400).json({ message: "Name and job role are required." });
    }

    const cleanEmail = email?.trim().toLowerCase() || "";
    const emailRegex = new RegExp(`^${cleanEmail}$`, "i");

    if (cleanEmail) {
      if (cleanEmail === user.email?.toLowerCase()) {
        return res.status(400).json({
          message: "You cannot add yourself to the team roster.",
        });
      }

      const targetUser = await User.findOne({ email: emailRegex });

      // 1. Block if target is a Platform Admin
      const isPlatformAdmin =
        targetUser?.role === "admin" ||
        Boolean(targetUser?.adminRole) ||
        Boolean(await AdminTeam.findOne({ email: emailRegex }));

      if (isPlatformAdmin) {
        return res.status(400).json({
          message: "This user is a Platform Administrator and cannot be added to a company crew.",
        });
      }

      // 2. Block if target owns their own company
      const ownsCompany = await Company.findOne({
        $or: [
          { email: emailRegex },
          ...(targetUser ? [{ owner: targetUser._id }] : []),
        ],
      });

      if (ownsCompany) {
        return res.status(400).json({
          message: `This user already owns "${ownsCompany.legalName || "another company"}" and cannot be added to your team.`,
        });
      }

      // 3. Block if already on the same team
      const existingInSameTeam = await TeamMember.findOne({
        owner: ownerId,
        email: emailRegex,
      });
      if (existingInSameTeam) {
        return res.status(400).json({
          message: "This user is already a member of your company team.",
        });
      }

      // 4. Block if already on another company's team
      const existingInOtherCompany = await TeamMember.findOne({
        owner: { $ne: ownerId },
        email: emailRegex,
      }).populate("company", "legalName name");

      if (existingInOtherCompany) {
        const otherCompName =
          existingInOtherCompany.company?.legalName ||
          existingInOtherCompany.company?.name ||
          "another company";
        return res.status(400).json({
          message: `This user is already assigned as ${existingInOtherCompany.roleType.toUpperCase()} at "${otherCompName}". A user cannot belong to multiple companies.`,
        });
      }
    }

    const member = await TeamMember.create({
      owner: ownerId,
      company: company._id,
      name: name.trim(),
      role: role.trim(),
      email: cleanEmail,
      roleType: roleType || "field_crew",
      note: note?.trim(),
      photoUrl: photoUrl?.trim() || undefined,
      status: "invited",
    });

    if (cleanEmail) {
      const updatedUser = await User.findOneAndUpdate(
        { email: emailRegex },
        { role: "company", companyRole: roleType || "field_crew" },
        { new: true }
      );

      if (updatedUser) {
        try {
          await Notification.create({
            recipient: updatedUser._id,
            title: `Role Assigned: ${(roleType || "field_crew").toUpperCase()}`,
            message: `You have been added to "${company.legalName}" as ${role.trim()} with ${(roleType || "field_crew").toUpperCase()} access.`,
            category: "alert",
            link: "/company-dashboard",
            isRead: false,
          });
        } catch (notifErr) {
          console.error("Failed to notify user of role assignment:", notifErr);
        }
      }
    }

    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({ message: error.message || "Failed to add team member." });
  }
}

export async function removeTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (["auditor", "tester", "field_crew"].includes(user.companyRole)) {
      return res.status(403).json({
        message: "Your role does not have permission to remove team members.",
      });
    }

    let ownerId = user._id;
    if (user.companyRole === "manager") {
      const managerAssignment = await TeamMember.findOne({ email: user.email?.toLowerCase() });
      if (managerAssignment) ownerId = managerAssignment.owner;
    }

    const { memberId } = req.params;
    const deleted = await TeamMember.findOneAndDelete({ _id: memberId, owner: ownerId });

    if (!deleted) {
      return res.status(404).json({ message: "Team member not found." });
    }

    if (deleted.email) {
      const demotedUser = await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${deleted.email.trim()}$`, "i") } },
        { role: "customer", companyRole: null },
        { new: true }
      );

      if (demotedUser) {
        try {
          await Notification.create({
            recipient: demotedUser._id,
            title: "Team Access Revoked",
            message: `Your staff permissions for the company workspace have been revoked.`,
            category: "alert",
            isRead: false,
          });
        } catch (_) {}
      }
    }

    res.status(200).json({ message: "Member removed and access revoked." });
  } catch (error) {
    console.error("Error removing team member:", error);
    res.status(500).json({ message: error.message || "Failed to remove member." });
  }
}

// ====================================================
// 3. SUPER ADMIN TEAM OPERATIONS
// ====================================================
export async function getAdminTeam(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const list = await AdminTeam.find().sort({ createdAt: 1 });
    res.status(200).json(list);
  } catch (error) {
    console.error("Error fetching admin team:", error);
    res.status(500).json({ message: error.message || "Failed to fetch admin team." });
  }
}

export async function addAdminTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { name, role, email, roleType, note, photoUrl } = req.body;
    if (!name?.trim() || !role?.trim()) {
      return res.status(400).json({ message: "Name and title are required." });
    }

    const cleanEmail = email?.trim().toLowerCase() || "";
    const emailRegex = new RegExp(`^${cleanEmail}$`, "i");

    if (cleanEmail) {
      // 1. Block if already an admin
      const existing = await AdminTeam.findOne({ email: emailRegex });
      if (existing) {
        return res.status(400).json({
          message: "This email is already an assigned administrator on the platform.",
        });
      }

      // 2. Block if owns a company
      const isCompanyOwner = await Company.findOne({ email: emailRegex });
      if (isCompanyOwner) {
        return res.status(400).json({
          message: `This user owns "${isCompanyOwner.legalName || "a registered company"}". Company owners cannot be platform staff.`,
        });
      }

      // 3. BLOCK: If user is on ANY company team (Field Crew, Manager, Auditor, Tester)
      const isCompanyStaff = await TeamMember.findOne({ email: emailRegex }).populate(
        "company",
        "legalName name"
      );

      if (isCompanyStaff) {
        const compName =
          isCompanyStaff.company?.legalName ||
          isCompanyStaff.company?.name ||
          "a contractor company";
        return res.status(400).json({
          message: `Cannot add as admin: This user is already an assigned ${isCompanyStaff.roleType.toUpperCase()} for "${compName}". They must be removed from that company first.`,
        });
      }
    }

    const member = await AdminTeam.create({
      addedBy: user._id,
      name: name.trim(),
      role: role.trim(),
      email: cleanEmail,
      roleType: roleType || "manager",
      note: note?.trim() || "",
      photoUrl: photoUrl?.trim() || "",
      status: cleanEmail === user.email?.toLowerCase() ? "active" : "invited",
    });

    if (cleanEmail) {
      const adminUser = await User.findOneAndUpdate(
        { email: emailRegex },
        { role: "admin", adminRole: roleType || "manager" },
        { new: true }
      );

      if (adminUser) {
        try {
          await Notification.create({
            recipient: adminUser._id,
            title: `Platform Role Assigned: ${(roleType || "manager").toUpperCase()}`,
            message: `You have been granted platform administrative privileges as ${role.trim()}.`,
            category: "alert",
            link: "/admin",
            isRead: false,
          });
        } catch (_) {}
      }
    }

    res.status(201).json(member);
  } catch (error) {
    console.error("Error adding admin team member:", error);
    res.status(500).json({ message: error.message || "Failed to add staff administrator." });
  }
}

export async function deleteAdminTeamMember(req, res) {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const deleted = await AdminTeam.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Staff member not found." });
    }

    if (deleted.email) {
      await User.findOneAndUpdate(
        { email: { $regex: new RegExp(`^${deleted.email.trim()}$`, "i") } },
        { role: "customer", adminRole: null }
      );
    }

    res.status(200).json({ message: "Staff member removed and admin access revoked." });
  } catch (error) {
    console.error("Error deleting admin team member:", error);
    res.status(500).json({ message: error.message || "Failed to remove staff administrator." });
  }
}