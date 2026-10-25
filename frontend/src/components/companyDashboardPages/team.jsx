// frontend/src/components/companyDashboardPages/team.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Camera,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, WorkspaceShell, useCompanyRole } from "../WorkspaceShell";
import { initials, useWorkspace } from "../../lib/workspace-store";
import { uploadCompanyImage, searchUserByEmail } from "../../services/api";

const ROLE_PERMISSIONS = {
  manager: {
    label: "Manager",
    desc: "Full access (manage requests, edit company page, dispatch crew)",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    icon: Shield,
  },
  auditor: {
    label: "Auditor",
    desc: "Can review & dispatch requests only. Cannot edit page or add members.",
    color: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300",
    icon: ShieldCheck,
  },
  tester: {
    label: "Tester",
    desc: "Read-only access to inspect the company dashboard.",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    icon: Eye,
  },
  field_crew: {
    label: "Field Crew",
    desc: "Field technician/laborer for dispatch only (messages access).",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300",
    icon: Wrench,
  },
};

export default function TeamPage() {
  const { getToken } = useAuth();
  const { crew, addCrewMember, removeCrewMember, crewLoading } = useWorkspace();
  const { canManageTeam, isTester } = useCompanyRole();
  const isReadOnly = isTester || !canManageTeam;

  const fileInputRef = useRef(null);

  // Search state
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [roleType, setRoleType] = useState("manager");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  // 1. Search for existing registered user by email
  const handleSearchUser = async (e) => {
    e?.preventDefault();
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Read-only inspection only.");
      return;
    }
    if (!searchEmail.trim()) {
      toast.error("Please enter an email address to search");
      return;
    }

    try {
      setSearching(true);
      setError("");
      setFoundUser(null);
      const token = await getToken();
      const user = await searchUserByEmail(searchEmail.trim(), token);

      setFoundUser(user);
      setName(user.fullName || "");
      if (user.profilePic) setPhotoUrl(user.profilePic);
      toast.success("Registered user found!");
    } catch (err) {
      setError(err.message || "User not found");
      toast.error(err.message || "No registered user found with this email. Make sure they signed up first.");
    } finally {
      setSearching(false);
    }
  };

  const handleClearFoundUser = () => {
    setFoundUser(null);
    setSearchEmail("");
    setName("");
    setPhotoUrl("");
    setRole("");
    setError("");
  };

  // 2. Custom photo upload handler
  const handlePhotoUpload = async (e) => {
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Photo upload is disabled.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/company-crew");
      setPhotoUrl(res.url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 3. Submit assignment to crew/team
  const submit = async (e) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Adding members is disabled.");
      return;
    }
    if (!name.trim() || !role.trim()) {
      setError("Please provide both a member name and trade/job title.");
      return;
    }

    const emailToAssign = foundUser?.email || searchEmail.trim().toLowerCase();

    try {
      setIsSubmitting(true);
      setError("");

      await addCrewMember({
        name: name.trim(),
        role: role.trim(),
        email: emailToAssign || undefined,
        roleType,
        note: note.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });

      handleClearFoundUser();
      setRoleType("manager");
      setNote("");
      toast.success("Role and access assigned successfully!");
    } catch (err) {
      setError(err.message || "Failed to assign team member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Member removal is disabled.");
      return;
    }
    if (!window.confirm("Remove this member and revoke their dashboard access?")) return;
    try {
      setDeletingId(memberId);
      await removeCrewMember(memberId);
      toast.success("Member removed");
    } catch (err) {
      setError(err.message || "Failed to remove member.");
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <WorkspaceShell
      title={isTester ? "Team Roster" : "Crews & Dispatch"}
      status={isTester ? "Read-Only Inspection" : `${crew?.length || 0} crew members`}
    >
      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-[440px_1fr]">
        
        {/* ADD MEMBER FORM CARD */}
        <Card className="p-4 sm:p-6 h-fit">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <UserPlus className="size-5 text-primary shrink-0" /> Assign Team Member &amp; Role
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isReadOnly
              ? "Read-only inspection mode: Team assignment is locked for this role."
              : "Search registered users by email to assign dashboard roles (Manager, Auditor, Tester), or add field crew."}
          </p>

          {/* STEP A: SEARCH REGISTERED EMAIL */}
          <div className="mt-4 sm:mt-5 rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
            <label className="mb-1.5 block text-xs font-semibold">Search Registered User by Email</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="e.g. user@gmail.com"
                  value={searchEmail}
                  disabled={searching || isReadOnly}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUser(e)}
                  className={`${inputClass} pl-9 text-xs`}
                />
              </div>
              <button
                type="button"
                onClick={handleSearchUser}
                disabled={searching || isReadOnly}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                <span>Search</span>
              </button>
            </div>

            {/* Found User Banner */}
            {foundUser && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 p-2.5 sm:p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {foundUser.profilePic ? (
                    <img
                      src={foundUser.profilePic}
                      alt={foundUser.fullName}
                      className="size-8 sm:size-9 rounded-full object-cover border border-emerald-300 shrink-0"
                    />
                  ) : (
                    <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 shrink-0">
                      {initials(foundUser.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1 truncate">
                      <span className="truncate">{foundUser.fullName}</span> <CheckCircle className="size-3 text-emerald-600 shrink-0" />
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{foundUser.email}</p>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleClearFoundUser}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
                    title="Clear"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3.5 sm:space-y-4">
            
            {/* PHOTO PREVIEW & UPLOAD */}
            <div>
              <label className="mb-1 block text-xs font-semibold">Photo</label>
              <div className="flex items-center gap-3">
                <div className="relative size-11 sm:size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {uploadingPhoto ? (
                    <div className="flex size-full items-center justify-center">
                      <Loader2 className="size-4 animate-spin text-primary" />
                    </div>
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Camera className="size-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isReadOnly}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto || isReadOnly}
                    className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {uploadingPhoto ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Custom Photo"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-semibold">
                Member name *
              </label>
              <input
                id="name"
                value={name}
                disabled={isSubmitting || isReadOnly}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ali Khan"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-xs font-semibold">
                Trade / Job Title *
              </label>
              <input
                id="role"
                value={role}
                disabled={isSubmitting || isReadOnly}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Operations Manager, Senior Plumber"
                className={inputClass}
              />
            </div>

            {/* DASHBOARD ACCESS ROLE */}
            <div>
              <label className="mb-1 block text-xs font-semibold">Dashboard Access Level &amp; Permissions</label>
              <div className="relative">
                <select
                  value={roleType}
                  disabled={isSubmitting || isReadOnly}
                  onChange={(e) => setRoleType(e.target.value)}
                  className={`${inputClass} truncate pr-8 cursor-pointer`}
                >
                  <option value="manager">Manager (Full dashboard &amp; crew management)</option>
                  <option value="auditor">Auditor (Review &amp; dispatch requests only)</option>
                  <option value="tester">Tester (Read-only inspection)</option>
                  <option value="field_crew">Field Crew Only (Messages access only)</option>
                </select>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                {ROLE_PERMISSIONS[roleType]?.desc}
              </p>
            </div>

            <div>
              <label htmlFor="note" className="mb-1 block text-xs font-semibold">
                Short bio or notes (optional)
              </label>
              <textarea
                id="note"
                value={note}
                disabled={isSubmitting || isReadOnly}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Certifications, license details, specialties..."
                className={`${inputClass} leading-relaxed`}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || uploadingPhoto || isReadOnly}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-opacity"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {isSubmitting
                ? "Assigning..."
                : isReadOnly
                ? "Assign Disabled (Read-Only Mode)"
                : "Assign & Add to Team"}
            </button>
          </form>
        </Card>

        {/* CREW ROSTER CARDS */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-border gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold">Crew Roster &amp; Assigned Roles</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff members authorized for dispatch and dashboard management.
              </p>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary shrink-0">
              {crew?.length || 0} Members
            </span>
          </div>

          {crewLoading ? (
            <div className="flex h-64 items-center justify-center text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading crew...
            </div>
          ) : !crew || crew.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-xs text-muted-foreground">
              No team members yet. Use the form on the left to assign your first member.
            </div>
          ) : (
            <div className="mt-4 sm:mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
              {crew.map((m) => {
                const badge = ROLE_PERMISSIONS[m.roleType] || ROLE_PERMISSIONS.field_crew;
                const RoleIcon = badge.icon;
                const isDeleting = deletingId === m._id;

                return (
                  <div
                    key={m._id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3.5 sm:p-4 transition hover:border-primary/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt={m.name}
                              className="size-10 sm:size-11 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="grid size-10 sm:size-11 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              {initials(m.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{m.name}</p>
                            <p className="text-xs text-primary font-medium truncate">{m.role}</p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemove(m._id)}
                            disabled={isDeleting}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer shrink-0"
                            title="Remove member"
                          >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        )}
                      </div>

                      {/* Access Badge & Email */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.color}`}
                        >
                          <RoleIcon className="size-3" /> {badge.label}
                        </span>

                        {m.email && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[170px] sm:max-w-[200px]">
                            <Mail className="size-3 shrink-0" /> <span className="truncate">{m.email}</span>
                          </span>
                        )}
                      </div>

                      {m.note && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{m.note}</p>}
                    </div>

                    {m.email && (
                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                        <span>
                          {m.status === "active" ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="size-3" /> Active (Logged in)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" /> Ready for login
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </WorkspaceShell>
  );
}