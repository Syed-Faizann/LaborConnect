// frontend/src/components/companyDashboardPages/CompanyPage.jsx
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  BadgeCheck,
  Camera,
  ExternalLink,
  Eye,
  FileText,
  Images,
  Loader2,
  PencilRuler,
  Plus,
  ShieldCheck,
  Store,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";

import { Card, WorkspaceShell, useCompanyRole } from "../WorkspaceShell";
import { initials, useWorkspace } from "../../lib/workspace-store";
import { uploadCompanyImage } from "../../services/api";

export default function CompanyPage() {
  const { team, company, loading, removeMember } = useWorkspace();
  const { isTester } = useCompanyRole();
  const [removingId, setRemovingId] = useState(null);

  if (loading) {
    return (
      <WorkspaceShell title="Company Page Management">
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading company profile...
        </div>
      </WorkspaceShell>
    );
  }

  const handleRemoveMember = async (id) => {
    if (isTester) {
      alert("Inspector / Tester mode: Member removal is disabled.");
      return;
    }
    if (!id) return;
    if (!window.confirm("Remove this team member from your company page?")) return;
    try {
      setRemovingId(id);
      await removeMember(id);
    } catch (err) {
      alert("Failed to remove team member: " + err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const sections = [
    {
      icon: BadgeCheck,
      title: "1. Basic Info & Identity",
      desc: company.name ? `${company.name}, ${company.phone || "No phone"}` : "Not set up yet",
      state: company.name ? "Completed" : "Incomplete",
      to: "/company-dashboard/company-page-edit#section-basic",
    },
    {
      icon: FileText,
      title: "2. About Company",
      desc: company.about ? `${company.about.slice(0, 50)}...` : "Add company bio and specialties.",
      state: company.about ? "Completed" : "Incomplete",
      to: "/company-dashboard/company-page-edit#section-about",
    },
    {
      icon: Wrench,
      title: "3. Services Catalog",
      desc: `${company.services?.length || 0} active services listed.`,
      state: `${company.services?.length || 0} Services Active`,
      to: "/company-dashboard/company-page-edit#section-services",
    },
    {
      icon: Users,
      title: "4. Key Personnel & Team",
      desc: team?.length
        ? `${team.length} featured pro${team.length === 1 ? "" : "s"} (${team[0]?.name}).`
        : "No members added yet.",
      state: `${team?.length || 0} Members Displayed`,
      to: "/company-dashboard/company-page-edit#section-team",
    },
    {
      icon: ShieldCheck,
      title: "5. Verified Credentials",
      desc: `${company.credentials?.length || 0} trade licenses / credentials on record.`,
      state: `${company.credentials?.length || 0} Registered`,
      to: "/company-dashboard/company-page-edit#section-credentials",
    },
    {
      icon: Images,
      title: "6. Projects & Showcase",
      desc: `${company.projects?.length || 0} job showcases published.`,
      state: `${company.projects?.length || 0} Projects Published`,
      to: "/company-dashboard/company-page-edit#section-projects",
    },
  ];

  return (
    <WorkspaceShell
      title="Company Page Management"
      status={company?.published ? "Published • Visible to Customers" : "Draft"}
      actions={
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Link
            to={company?._id ? `/companies/${company._id}` : "/marketplace"}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-muted cursor-pointer shrink-0"
          >
            <ExternalLink className="size-3.5 sm:size-4" />
            <span>
              <span className="hidden xs:inline">View </span>Live Page
            </span>
          </Link>
          {!isTester && (
            <Link
              to="/company-dashboard/company-page-edit"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 shrink-0"
            >
              <PencilRuler className="size-3.5 sm:size-4" /> Edit Company Page
            </Link>
          )}
        </div>
      }
    >
      {/* Published / Active State Card */}
      {company?.published ? (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="grid size-11 sm:size-12 place-items-center rounded-xl bg-foreground text-xs font-bold text-background shrink-0">
                {initials(company.name) || "AB"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold leading-tight truncate">
                  <span className="truncate">{company.name || "Your Company Name"}</span>
                  <BadgeCheck className="size-4 text-primary shrink-0" />
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{company.tagline || "No tagline added"}</p>
              </div>
            </div>
            
            <span className="self-start sm:self-center rounded-lg border border-success/30 bg-success/10 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase text-success shrink-0">
              Published &amp; Active
            </span>
          </div>

          {!isTester && (
            <div className="mt-4 sm:mt-5 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
              <Link
                to="/company-dashboard/company-page-edit"
                className="w-full sm:w-auto text-center rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Edit Page
              </Link>
            </div>
          )}
        </Card>
      ) : (
        /* Draft / Unpublished State Card */
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="grid size-10 sm:size-11 place-items-center rounded-xl bg-accent text-accent-foreground shrink-0">
              <Store className="size-5" />
            </div>
            <span className="rounded-lg bg-muted px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
              Draft / Unpublished
            </span>
          </div>
          <h2 className="mt-4 sm:mt-5 text-lg sm:text-xl font-bold">Complete &amp; Publish Your Company Page</h2>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Build your company profile so customers can find your services, reviews, and crew details.
          </p>
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border pt-4 sm:pt-5">
            <span className="text-xs sm:text-sm text-muted-foreground">Autosaves to database</span>
            {!isTester ? (
              <Link
                to="/company-dashboard/company-page-edit"
                className="w-full sm:w-auto text-center flex items-center justify-center gap-2 rounded-xl bg-primary px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" /> Edit Company Page
              </Link>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                Editing disabled in read-only inspection mode
              </span>
            )}
          </div>
        </div>
      )}

      {/* Profile Sections Overview */}
      <Card className="mt-5 sm:mt-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Profile Sections Overview</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Quickly jump into editing specific parts of your company's storefront.
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-foreground">
                    <s.icon className="size-4 text-primary shrink-0" /> <span className="truncate">{s.title}</span>
                  </p>
                  <Link to={s.to} className="text-xs sm:text-sm font-semibold text-primary hover:underline shrink-0">
                    {isTester ? "Inspect" : "Edit"}
                  </Link>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{s.desc}</p>
              </div>
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-medium text-primary">{s.state}</p>
            </div>
          ))}
        </div>

        {/* Key Personnel Subsection */}
        <div className="mt-5 sm:mt-6 border-t border-border pt-5 sm:pt-6">
          <h3 className="text-sm sm:text-base font-bold">Key Personnel (shown on your public page)</h3>
          
          <div className="mt-3.5 sm:mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {team?.map((m) => {
              const memberId = m._id || m.id;
              return (
                <div key={memberId} className="flex items-start gap-3 rounded-xl border border-border p-3 sm:p-4">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="size-9 sm:size-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(m.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-primary font-medium truncate">{m.role}</p>
                    {m.note && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{m.note}</p>}
                  </div>
                  {!isTester && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(memberId)}
                      disabled={removingId === memberId}
                      className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50 cursor-pointer p-1"
                      aria-label={`Remove ${m.name}`}
                    >
                      {removingId === memberId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Member Form */}
          <KeyPersonnelAddForm isTester={isTester} />
        </div>
      </Card>
    </WorkspaceShell>
  );
}

function KeyPersonnelAddForm({ isTester }) {
  const { getToken } = useAuth();
  const { addMember } = useWorkspace();
  const [draft, setDraft] = useState({ name: "", role: "", note: "", photoUrl: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef(null);

  if (isTester) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-3.5 sm:p-4 text-center text-xs text-muted-foreground">
        Adding and editing key personnel is locked in Read-Only Inspector / Tester Mode.
      </div>
    );
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      setError("");
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/company-pages/team");
      setDraft((d) => ({ ...d, photoUrl: res.url }));
    } catch (err) {
      setError(err.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.role.trim()) return;
    try {
      setIsSubmitting(true);
      setError("");
      await addMember({
        name: draft.name.trim(),
        role: draft.role.trim(),
        note: draft.note.trim() || undefined,
        photoUrl: draft.photoUrl || undefined,
      });
      setDraft({ name: "", role: "", note: "", photoUrl: "" });
    } catch (err) {
      setError(err.message || "Failed to add team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 grid grid-cols-1 items-center gap-2.5 sm:gap-3 rounded-xl border-2 border-dashed border-border bg-surface p-3.5 sm:p-4 sm:grid-cols-[auto_1fr_1fr] md:grid-cols-[auto_1fr_1fr_1fr_auto]"
    >
      {/* Photo picker */}
      <div className="flex items-center gap-3">
        <label
          className="relative grid size-12 sm:size-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border bg-card transition-opacity hover:opacity-80"
          title="Upload profile photo"
        >
          {uploadingPhoto ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : draft.photoUrl ? (
            <img src={draft.photoUrl} alt="Preview" className="size-full object-cover" />
          ) : (
            <Camera className="size-4 text-muted-foreground" />
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={uploadingPhoto}
          />
        </label>
        <span className="text-xs text-muted-foreground sm:hidden">
          {draft.photoUrl ? "Photo attached" : "Tap to add photo"}
        </span>
      </div>

      <input
        className="rounded-xl border border-border bg-card px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
        placeholder="Member name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <input
        className="rounded-xl border border-border bg-card px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
        placeholder="Role"
        value={draft.role}
        onChange={(e) => setDraft({ ...draft, role: e.target.value })}
      />
      <input
        className="rounded-xl border border-border bg-card px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
        placeholder="Short bio (optional)"
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
      />
      <button
        type="submit"
        disabled={isSubmitting || uploadingPhoto}
        className="w-full md:w-auto flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add
      </button>

      {error && <p className="col-span-full text-xs text-destructive">{error}</p>}
    </form>
  );
}