// frontend/src/components/adminDashboardPages/AdminTeamPage.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Camera,
  CheckCircle,
  Clock,
  Eye,
  LifeBuoy,
  Loader2,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell, Card, useAdminRole } from "../AdminShell";
import {
  getAdminTeam,
  addAdminTeamMember,
  deleteAdminTeamMember,
  searchUserByEmail,
  uploadCompanyImage,
} from "../../services/api";

const ROLE_PERMISSIONS = {
  manager: {
    label: "Platform Manager",
    desc: "Full administrative access (verify companies, view finances, manage team & platform).",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    icon: ShieldCheck,
  },
  auditor: {
    label: "Compliance Auditor",
    desc: "Review and verify contractor business licenses, insurance (COI), and credentials.",
    color: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300",
    icon: Shield,
  },
  support: {
    label: "Support Specialist",
    desc: "Access customer & company messaging, customer disputes, and support tickets.",
    color: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
    icon: LifeBuoy,
  },
  tester: {
    label: "Inspector / Tester",
    desc: "Read-only inspection access across the platform dashboard.",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    icon: Eye,
  },
};

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function AdminTeamPage() {
  const { getToken } = useAuth();
  const { canManageTeam, isTester } = useAdminRole();
  const isReadOnly = isTester || !canManageTeam;

  const fileInputRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      setLoading(true);
      const token = await getToken();
      const list = await getAdminTeam(token);
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.message || "Failed to load admin team roster");
    } finally {
      setLoading(false);
    }
  }

  // 1. Search registered user by email
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
      toast.error(err.message || "No registered user found with this email.");
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

  // 2. Photo upload handler
  const handlePhotoUpload = async (e) => {
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Uploads are disabled.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/admin-team");
      setPhotoUrl(res.url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 3. Submit assignment to Admin Team
  const submit = async (e) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Assignment is disabled in read-only mode.");
      return;
    }
    if (!name.trim() || !role.trim()) {
      setError("Please provide both member name and job title.");
      return;
    }

    const emailToAssign = foundUser?.email || searchEmail.trim().toLowerCase();

    try {
      setIsSubmitting(true);
      setError("");
      const token = await getToken();

      const created = await addAdminTeamMember(
        {
          name: name.trim(),
          role: role.trim(),
          email: emailToAssign || undefined,
          roleType,
          note: note.trim() || undefined,
          photoUrl: photoUrl || undefined,
        },
        token
      );

      setMembers((prev) => [...prev, created]);
      handleClearFoundUser();
      setRoleType("manager");
      setNote("");
      toast.success("Staff member assigned with administrator privileges!");
    } catch (err) {
      setError(err.message || "Failed to assign staff administrator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Remove administrator
  const handleRemove = async (memberId) => {
    if (isReadOnly) {
      toast.error("Inspector / Tester mode: Member revocation disabled.");
      return;
    }
    if (!window.confirm("Revoke this member's administrative privileges?")) return;
    try {
      setDeletingId(memberId);
      const token = await getToken();
      await deleteAdminTeamMember(memberId, token);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
      toast.success("Privileges revoked and member removed.");
    } catch (err) {
      toast.error(err.message || "Failed to remove staff administrator.");
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <AdminShell title="Admin Team & Access" status={`${members.length} administrators`}>
      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-[440px_1fr]">
        
        {/* ASSIGN STAFF FORM */}
        <Card className="h-fit p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <UserPlus className="size-5 text-primary shrink-0" /> Assign Platform Staff
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isReadOnly
              ? "Read-only inspection mode: Staff assignment is disabled for this role."
              : "Search registered users to grant elevated Super Admin dashboard privileges."}
          </p>

          {/* SEARCH USER BY EMAIL */}
          <div className="mt-4 sm:mt-5 rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
            <label className="mb-1.5 block text-xs font-semibold">Search Registered User by Email</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="e.g. admin@laborconnect.com"
                  value={searchEmail}
                  disabled={isReadOnly || searching}
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
                      className="size-8 sm:size-9 rounded-full border border-emerald-300 object-cover shrink-0"
                    />
                  ) : (
                    <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 shrink-0">
                      {initials(foundUser.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-xs font-bold text-foreground truncate">
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
            
            {/* PHOTO UPLOAD */}
            <div>
              <label className="mb-1 block text-xs font-semibold">Staff Photo</label>
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
              <label className="mb-1 block text-xs font-semibold">Administrator Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Miller"
                className={inputClass}
                disabled={isSubmitting || isReadOnly}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">Title / Job Function *</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Verification Officer, Compliance Auditor"
                className={inputClass}
                disabled={isSubmitting || isReadOnly}
              />
            </div>

            
           {/* ROLE PERMISSION SELECTOR */}
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Administrative Access Level
              </label>
              <div className="relative">
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  disabled={isSubmitting || isReadOnly}
                  className="w-full rounded-xl border border-input bg-card pl-3.5 pr-8 py-2.5 text-xs sm:text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="manager">Platform Manager (Full Admin Access)</option>
                  <option value="auditor">Compliance Auditor (Verify Licenses &amp; COI)</option>
                  <option value="support">Support Specialist (Messages &amp; Inquiries)</option>
                  <option value="tester">Inspector / Tester (Read-only Inspection)</option>
                </select>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                {ROLE_PERMISSIONS[roleType]?.desc}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">Notes / Department (Optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Operations division, verification shift, internal direct phone..."
                className={`${inputClass} leading-relaxed`}
                disabled={isSubmitting || isReadOnly}
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
                : "Assign & Grant Admin Access"}
            </button>
          </form>
        </Card>

        {/* STAFF ROSTER */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 sm:pb-4 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold">Platform Staff Roster</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Internal platform personnel with authorized access to the administrative workspace.
              </p>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary shrink-0">
              {members.length} Administrators
            </span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading admin roster...
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-xs text-muted-foreground">
              No staff members registered yet. Use the assignment form on the left.
            </div>
          ) : (
            <div className="mt-4 sm:mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
              {members.map((m) => {
                const badge = ROLE_PERMISSIONS[m.roleType] || ROLE_PERMISSIONS.manager;
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
                              className="size-10 sm:size-11 rounded-full border border-border object-cover shrink-0"
                            />
                          ) : (
                            <div className="grid size-10 sm:size-11 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              {initials(m.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{m.name}</p>
                            <p className="text-xs font-medium text-primary truncate">{m.role}</p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemove(m._id)}
                            disabled={isDeleting}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer shrink-0"
                            title="Revoke Admin Access"
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
                          <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground max-w-[170px] sm:max-w-[200px]">
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
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
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
    </AdminShell>
  );
}