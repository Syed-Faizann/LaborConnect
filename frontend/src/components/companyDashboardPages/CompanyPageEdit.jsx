// frontend/src/components/companyDashboardPages/CompanyPageEdit.jsx
import { Link, useNavigate } from "react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  BadgeCheck,
  Building2,
  Camera,
  Eye,
  FileText,
  Fan,
  Hammer,
  HardHat,
  Image as ImageIcon,
  Images,
  Loader2,
  Paintbrush,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Trees,
  Upload,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import { Card, WorkspaceShell, useCompanyRole } from "../WorkspaceShell";
import { initials, useWorkspace } from "../../lib/workspace-store";
import { uploadCompanyImage, getPublicPlatformSettings } from "../../services/api";

const steps = [
  { id: "section-basic", n: 1, title: "Basic Information", desc: "Identity, logos & contacts", icon: BadgeCheck },
  { id: "section-about", n: 2, title: "About Company", desc: "Bio, mission, specialties", icon: FileText },
  { id: "section-services", n: 3, title: "Services Offered", desc: "Catalog, pricing, badges", icon: Wrench },
  { id: "section-team", n: 4, title: "Key Personnel", desc: "Technicians, certs & leads", icon: Users },
  { id: "section-credentials", n: 5, title: "Credentials & Licenses", desc: "State license, COI, bonds", icon: ShieldCheck },
  { id: "section-projects", n: 6, title: "Projects & Photos", desc: "Job showcase galleries", icon: Images },
  { id: "section-preview", n: 7, title: "Preview & Publish", desc: "Final client perspective", icon: Eye },
];

const ICON_MAP = {
  plumbing: Wrench,
  electrical: Zap,
  gardening: Trees,
  gardner: Trees,
  gardener: Trees,
  landscaping: Trees,
  cleaning: Building2,
  carpentry: Hammer,
  hvac: Fan,
  painting: Paintbrush,
  construction: HardHat,
  roofing: ShieldCheck,
};

function getCategoryIcon(name = "") {
  const lower = name.toLowerCase().trim();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

// Worldwide Countries List
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Australia",
  "Germany",
  "France",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Austria",
  "Bahrain",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Chile",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "Greece",
  "Hong Kong",
  "Hungary",
  "India",
  "Indonesia",
  "Ireland",
  "Italy",
  "Japan",
  "Jordan",
  "Kuwait",
  "Lebanon",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Oman",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "Vietnam",
];

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60 disabled:cursor-not-allowed";

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <p className="mb-2 text-[11px] text-muted-foreground leading-tight">{hint}</p>}
      {children}
    </div>
  );
}

function Section({ id, n, title, desc, children }) {
  return (
    <Card id={id} className="scroll-mt-28 p-4 sm:p-7">
      <div className="mb-5 sm:mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
              {n}
            </span>
            <h3 className="text-base sm:text-lg font-bold">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        </div>
        <span className="text-[11px] sm:text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </span>
      </div>
      {children}
    </Card>
  );
}

function ServiceCategoryTile({ category, service, isSelected, onToggle, onFieldChange, isReadOnly }) {
  const Icon = category?.icon || Wrench;

  if (!isSelected) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isReadOnly && onToggle()}
        onKeyDown={(e) => !isReadOnly && e.key === "Enter" && onToggle()}
        className={`flex flex-col justify-start gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 text-left transition-all ${
          isReadOnly
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:border-primary/40 hover:bg-muted"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-10 sm:size-11 place-items-center rounded-xl bg-accent text-accent-foreground shrink-0">
            <Icon className="size-5" />
          </div>
          <span className="rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] sm:text-xs font-medium text-muted-foreground shrink-0">
            {isReadOnly ? "Locked" : "Click to add"}
          </span>
        </div>
        <div>
          <p className="font-bold text-sm sm:text-base text-foreground">{category.name}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {category.defaultDesc || `Click to add ${category.name} to your profile`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary/40 bg-accent/30 p-4 sm:p-5 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm sm:text-base text-foreground truncate">{category.name}</p>
            <p className="text-xs font-semibold text-primary">Added to your services</p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
          >
            Deselect
          </button>
        )}
      </div>

      <div className="mt-1 space-y-2.5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
            Description
          </label>
          <textarea
            rows={2}
            disabled={isReadOnly}
            className={inputClass}
            value={service?.desc ?? ""}
            placeholder={`Description for ${category.name}`}
            onChange={(e) => onFieldChange("desc", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
            Pricing
          </label>
          <input
            disabled={isReadOnly}
            className={inputClass}
            value={service?.price ?? ""}
            placeholder="Pricing (e.g. 160$ or $85/hr)"
            onChange={(e) => onFieldChange("price", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default function CompanyPageEdit() {
  const { getToken } = useAuth();
  const { company, updateCompany, saveCompany, team, loading } = useWorkspace();
  const { isTester } = useCompanyRole();
  const isReadOnly = isTester;
  const navigate = useNavigate();

  const [adminCategories, setAdminCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [specialtyDraft, setSpecialtyDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProjectIndex, setUploadingProjectIndex] = useState(null);
  const [uploadingNewProject, setUploadingNewProject] = useState(false);

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const projectGalleryInputRef = useRef(null);

  useEffect(() => {
    async function loadAdminCategories() {
      try {
        setLoadingCategories(true);
        const settings = await getPublicPlatformSettings();
        if (settings?.categories && Array.isArray(settings.categories)) {
          setAdminCategories(settings.categories);
        }
      } catch (err) {
        console.warn("Could not load admin categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadAdminCategories();
  }, []);

  const categoryTiles = useMemo(() => {
    return (adminCategories || []).map((name) => ({
      name,
      icon: getCategoryIcon(name),
      defaultDesc: `Professional ${name.toLowerCase()} services and project support.`,
    }));
  }, [adminCategories]);

  const progress = useMemo(() => {
    if (!company) return 0;
    const checks = [
      company.name,
      company.phone,
      company.email,
      company.about,
      company.services?.length ? "y" : "",
      team?.length ? "y" : "",
      company.credentials?.length ? "y" : "",
      company.projects?.length ? "y" : "",
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [company, team]);

  const setField = (key, value) => {
    if (isReadOnly) return;
    updateCompany({ [key]: value });
  };

  const updateList = (key, list) => {
    if (isReadOnly) return;
    updateCompany({ [key]: list });
  };

  const findServiceIndex = (name) =>
    (company.services || []).findIndex(
      (s) => s?.name?.toLowerCase().trim() === name?.toLowerCase().trim()
    );

  const handleToggleCategory = (category) => {
    if (isReadOnly) return;
    const idx = findServiceIndex(category.name);
    if (idx === -1) {
      updateList("services", [
        ...(company.services || []),
        { name: category.name, desc: category.defaultDesc || "", price: "" },
      ]);
    } else {
      updateList("services", company.services.filter((_, i) => i !== idx));
    }
  };

  const handleServiceFieldChange = (name, key, value) => {
    if (isReadOnly) return;
    const idx = findServiceIndex(name);
    if (idx === -1) return;
    const next = [...company.services];
    next[idx] = { ...next[idx], [key]: value };
    updateList("services", next);
  };

  const handleLogoUpload = async (e) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      setFeedback(null);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/companies/logos");
      setField("logoUrl", res.url);
      setFeedback({ type: "success", text: "Logo updated! Click 'Save Draft' or 'Publish' to save to your profile." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to upload logo." });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      setFeedback(null);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/company-pages/covers");
      setField("coverImageUrl", res.url);
      setFeedback({ type: "success", text: "Cover banner uploaded successfully." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to upload cover banner." });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleProjectPhotoUpload = async (e, index) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProjectIndex(index);
      setFeedback(null);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/company-pages/projects");
      const nextProjects = [...company.projects];
      nextProjects[index] = { ...nextProjects[index], imageUrl: res.url };
      updateList("projects", nextProjects);
      setFeedback({ type: "success", text: "Project photo updated." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to upload project photo." });
    } finally {
      setUploadingProjectIndex(null);
    }
  };

  const handleQuickAddProjectWithPhoto = async (e) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingNewProject(true);
      setFeedback(null);
      const token = await getToken();
      const res = await uploadCompanyImage(file, token, "/company-pages/projects");
      updateList("projects", [
        ...(company.projects || []),
        { title: file.name.replace(/\.[^/.]+$/, ""), detail: "", imageUrl: res.url },
      ]);
      setFeedback({ type: "success", text: "Project created with uploaded photo." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to upload photo." });
    } finally {
      setUploadingNewProject(false);
      if (projectGalleryInputRef.current) projectGalleryInputRef.current.value = "";
    }
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) {
      setFeedback({ type: "error", text: "Inspector / Tester mode: Saving drafts is disabled." });
      return;
    }
    try {
      setIsSaving(true);
      setFeedback(null);
      await saveCompany();
      setFeedback({ type: "success", text: "Draft saved! Address and GPS coordinates updated." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to save draft" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isReadOnly) {
      setFeedback({ type: "error", text: "Inspector / Tester mode: Publishing is disabled." });
      return;
    }
    try {
      setIsPublishing(true);
      setFeedback(null);
      await saveCompany({ published: true });
      navigate("/company-dashboard/company-page");
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to publish page" });
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceShell title="Edit Company Page">
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading company details...
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Create / Edit Company Page"
      status={isReadOnly ? "Read-Only Inspection" : company.published ? "Published • Live" : "Draft"}
      actions={
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing || isReadOnly}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSaving ? <Loader2 className="size-3.5 sm:size-4 animate-spin" /> : <Save className="size-3.5 sm:size-4" />}
            <span>{isReadOnly ? "Draft Locked" : isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          <Link
            to="/company-dashboard/company-page"
            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary transition-colors hover:bg-accent shrink-0"
          >
            <Eye className="size-3.5 sm:size-4" />
            <span>
              <span className="hidden xs:inline">Live </span>Preview
            </span>
          </Link>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isSaving || isReadOnly}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isPublishing ? <Loader2 className="size-3.5 sm:size-4 animate-spin" /> : <Upload className="size-3.5 sm:size-4" />}
            <span>{isReadOnly ? "Publish Locked" : isPublishing ? "Publishing..." : "Publish Page"}</span>
          </button>
        </div>
      }
    >
      {feedback && (
        <div
          className={`mb-5 sm:mb-6 rounded-xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium ${
            feedback.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex items-start gap-8">
        {/* Navigation Sidebar (Desktop only) */}
        <aside className="sticky top-24 hidden w-72 shrink-0 rounded-2xl border border-border bg-card p-5 shadow-card xl:block">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Form Sections</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">7 sections to complete</p>
            </div>
            <span className="text-xs font-bold text-primary">{progress}%</span>
          </div>
          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <nav className="space-y-1">
            {steps.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors hover:bg-muted"
              >
                <span className="grid size-6 place-items-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                  {s.n}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-[10px] text-muted-foreground">{s.desc}</span>
                </span>
                <s.icon className="size-3.5 text-primary" />
              </a>
            ))}
          </nav>
        </aside>

        {/* Content Pane */}
        <div className="min-w-0 flex-1 space-y-6 sm:space-y-8">
          
          {/* 1 Basic Info */}
          <Section
            id="section-basic"
            n={1}
            title="Company Information"
            desc="Set up your public brand identity, primary contact channels and headquarters location."
          >
            <div className="mb-5 sm:mb-7 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-b border-border pb-5 sm:pb-7">
              {/* Logo */}
              <div>
                <p className="mb-2 text-xs font-bold">Company Logo</p>
                <div className="relative group w-fit">
                  <label
                    className={`relative grid size-20 sm:size-24 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-foreground text-background transition-opacity ${
                      isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:opacity-90"
                    }`}
                  >
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center gap-1 text-[11px] sm:text-xs text-background">
                        <Loader2 className="size-4 sm:size-5 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" className="size-full object-cover" />
                    ) : (
                      <span className="text-lg sm:text-xl font-black">{initials(company.name) || "AB"}</span>
                    )}
                    {!isReadOnly && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="size-5 text-white" />
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo || isReadOnly}
                    />
                  </label>
                  {company.logoUrl && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setField("logoUrl", "")}
                      className="absolute -right-2 -top-2 rounded-full border border-border bg-card p-1 text-muted-foreground shadow-sm hover:text-destructive cursor-pointer"
                      title="Remove Logo"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Click to change. Syncs to your registration profile.
                </p>
              </div>

              {/* Cover Banner */}
              <div className="min-w-0 flex-1 w-full">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold">Cover Banner</p>
                  {company.coverImageUrl && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setField("coverImageUrl", "")}
                      className="text-xs text-destructive hover:underline cursor-pointer"
                    >
                      Remove Banner
                    </button>
                  )}
                </div>
                <label
                  className={`relative grid h-20 sm:h-24 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface text-xs text-muted-foreground transition-colors ${
                    isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted"
                  }`}
                >
                  {uploadingCover ? (
                    <span className="flex items-center gap-2 font-medium">
                      <Loader2 className="size-4 animate-spin text-primary" /> Uploading banner...
                    </span>
                  ) : company.coverImageUrl ? (
                    <img src={company.coverImageUrl} alt="Cover Banner" className="size-full object-cover" />
                  ) : (
                    <span className="flex items-center gap-1.5 sm:gap-2 px-2 text-center">
                      <Upload className="size-4 shrink-0" /> Click to upload banner image
                    </span>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover || isReadOnly}
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2">
              <Field label="Company Name" required>
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.name || ""}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Precision HVAC Specialists LLC"
                />
              </Field>
              <Field label="Tagline">
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.tagline || ""}
                  onChange={(e) => setField("tagline", e.target.value)}
                  placeholder="Short one-line description"
                />
              </Field>
              <Field label="Phone" required>
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.phone || ""}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </Field>
              <Field label="Service Email" required>
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.email || ""}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="service@yourcompany.com"
                />
              </Field>
              <Field label="Website">
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.website || ""}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </Field>
              <Field label="Years in Business">
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.yearsInBusiness || ""}
                  onChange={(e) => setField("yearsInBusiness", e.target.value)}
                  placeholder="e.g. 12"
                />
              </Field>
            </div>

            {/* Structured Headquarters Address */}
            <div className="space-y-4 pt-4 border-t border-border mt-5">
              <Field 
                label="Main Address / Building / Area" 
                hint="Building name, plaza, suite number, or street address"
              >
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.street || ""}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="e.g. Suite 402, Al-Rehman Plaza, Canal Road"
                />
              </Field>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                <Field label="City" required hint="Used for coverage calculations">
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={company.city || ""}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="e.g. Faisalabad, London, New York"
                  />
                </Field>

                <Field label="State / Province">
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={company.state || ""}
                    onChange={(e) => setField("state", e.target.value)}
                    placeholder="e.g. Punjab, Texas, Ontario"
                  />
                </Field>

                <Field label="Country" required>
                  <div className="relative">
                    <select
                      disabled={isReadOnly}
                      className={`${inputClass} truncate pr-8 cursor-pointer`}
                      value={company.country || ""}
                      onChange={(e) => setField("country", e.target.value)}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* 2 About */}
          <Section
            id="section-about"
            n={2}
            title="About Your Company"
            desc="Tell customers who you are, what you specialise in and where you work."
          >
            <div className="space-y-4 sm:space-y-5">
              <Field label="Company Bio" required hint={`${company.about?.length || 0} characters`}>
                <textarea
                  rows={5}
                  disabled={isReadOnly}
                  className={`${inputClass} leading-relaxed`}
                  value={company.about || ""}
                  onChange={(e) => setField("about", e.target.value)}
                  placeholder="Tell customers about your company, experience, specialties, and the type of work you provide..."
                />
              </Field>

              <Field label="Specialties">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {company.specialties?.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-accent-foreground"
                    >
                      <span>{s}</span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setField("specialties", company.specialties.filter((x) => x !== s))}
                          className="cursor-pointer hover:opacity-75"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {!isReadOnly && (
                    <input
                      value={specialtyDraft}
                      onChange={(e) => setSpecialtyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && specialtyDraft.trim()) {
                          e.preventDefault();
                          setField("specialties", [...(company.specialties || []), specialtyDraft.trim()]);
                          setSpecialtyDraft("");
                        }
                      }}
                      placeholder="+ Add specialty (press Enter)"
                      className="w-full sm:w-48 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  )}
                </div>
              </Field>

              <Field label="Service Area">
                <input
                  disabled={isReadOnly}
                  className={inputClass}
                  value={company.serviceArea || ""}
                  onChange={(e) => setField("serviceArea", e.target.value)}
                  placeholder="e.g. Austin Metro, Round Rock, Cedar Park"
                />
              </Field>
            </div>
          </Section>

          {/* 3 Services Offered */}
          <Section
            id="section-services"
            n={3}
            title="Services Offered"
            desc="Select the categories and trade services your business provides. These sync directly from the platform administrator's approved categories."
          >
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {loadingCategories ? (
                <div className="col-span-full flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" /> Loading allowed trade categories...
                </div>
              ) : categoryTiles.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-border p-6 sm:p-8 text-center text-xs text-muted-foreground">
                  No trade services have been activated by the platform administrator yet.
                </div>
              ) : (
                categoryTiles.map((category) => {
                  const idx = findServiceIndex(category.name);
                  const isSelected = idx !== -1;
                  const service = isSelected ? company.services[idx] : null;
                  return (
                    <ServiceCategoryTile
                      key={category.name}
                      category={category}
                      service={service}
                      isSelected={isSelected}
                      isReadOnly={isReadOnly}
                      onToggle={() => handleToggleCategory(category)}
                      onFieldChange={(key, value) => handleServiceFieldChange(category.name, key, value)}
                    />
                  );
                })
              )}
            </div>
          </Section>

          {/* 4 Key Personnel */}
          <Section
            id="section-team"
            n={4}
            title="Key Personnel"
            desc="Shown publicly on your storefront. Add or remove personnel from Company Page Management."
          >
            {team?.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {team.map((m) => (
                  <div key={m._id} className="flex items-start gap-3 rounded-xl border border-border p-3.5 sm:p-4">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.name} className="size-9 sm:size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(m.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-xs sm:text-sm">{m.name}</p>
                      <p className="text-xs text-primary font-medium">{m.role}</p>
                      {m.note && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{m.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No key personnel added yet. Head to Company Page Management to add featured team members.
              </p>
            )}
            <Link
              to="/company-dashboard/company-page"
              className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
            >
              {isReadOnly ? "Inspect Key Personnel →" : "Manage Key Personnel →"}
            </Link>
          </Section>

          {/* 5 Credentials */}
          <Section
            id="section-credentials"
            n={5}
            title="Credentials &amp; Certifications"
            desc="Licenses, insurance and registrations shown as verified badges."
          >
            <div className="space-y-3">
              {company.credentials?.map((c, i) => (
                <div key={c._id || i} className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={c.name}
                    placeholder="Credential"
                    onChange={(e) => {
                      const next = [...company.credentials];
                      next[i] = { ...c, name: e.target.value };
                      updateList("credentials", next);
                    }}
                  />
                  <input
                    disabled={isReadOnly}
                    className={inputClass}
                    value={c.detail}
                    placeholder="Number / details"
                    onChange={(e) => {
                      const next = [...company.credentials];
                      next[i] = { ...c, detail: e.target.value };
                      updateList("credentials", next);
                    }}
                  />
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => updateList("credentials", company.credentials.filter((_, idx) => idx !== i))}
                      className="grid size-10 place-items-center self-end sm:self-center rounded-xl border border-border text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                      aria-label="Remove credential"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() =>
                    updateList("credentials", [
                      ...(company.credentials || []),
                      { name: "", detail: "" },
                    ])
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary hover:bg-muted cursor-pointer"
                >
                  <Plus className="size-4" /> Add Credential
                </button>
              )}
            </div>
          </Section>

          {/* 6 Projects with Photo Uploads */}
          <Section
            id="section-projects"
            n={6}
            title="Recent Projects &amp; Photos"
            desc="Showcase completed jobs with photos so customers can see your workmanship."
          >
            <label
              className={`mb-5 sm:mb-6 grid h-24 sm:h-28 place-items-center rounded-2xl border-2 border-dashed border-border bg-surface text-xs sm:text-sm text-muted-foreground transition-colors ${
                isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted"
              }`}
            >
              {uploadingNewProject ? (
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="size-4 sm:size-5 animate-spin text-primary" /> Uploading project image...
                </span>
              ) : (
                <span className="flex items-center gap-2 px-2 text-center">
                  <Upload className="size-4 shrink-0" /> Click to upload project photo (JPG or PNG)
                </span>
              )}
              <input
                ref={projectGalleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQuickAddProjectWithPhoto}
                disabled={uploadingNewProject || isReadOnly}
              />
            </label>

            <div className="space-y-3.5 sm:space-y-4">
              {company.projects?.map((p, i) => (
                <div key={p._id || i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-border bg-surface p-3.5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <label
                      className={`relative grid size-16 sm:size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-card transition-opacity ${
                        isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:opacity-80"
                      }`}
                    >
                      {uploadingProjectIndex === i ? (
                        <Loader2 className="size-4 sm:size-5 animate-spin text-primary" />
                      ) : p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title || "Project"} className="size-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                          <ImageIcon className="size-4" />
                          <span>Add Photo</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleProjectPhotoUpload(e, i)}
                        disabled={uploadingProjectIndex === i || isReadOnly}
                      />
                    </label>
                  </div>

                  <div className="grid flex-1 gap-2.5 sm:gap-3 grid-cols-1 md:grid-cols-2">
                    <input
                      disabled={isReadOnly}
                      className={inputClass}
                      value={p.title}
                      placeholder="Project title"
                      onChange={(e) => {
                        const next = [...company.projects];
                        next[i] = { ...p, title: e.target.value };
                        updateList("projects", next);
                      }}
                    />
                    <input
                      disabled={isReadOnly}
                      className={inputClass}
                      value={p.detail}
                      placeholder="Location / scope"
                      onChange={(e) => {
                        const next = [...company.projects];
                        next[i] = { ...p, detail: e.target.value };
                        updateList("projects", next);
                      }}
                    />
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => updateList("projects", company.projects.filter((_, idx) => idx !== i))}
                      className="grid size-9 sm:size-10 shrink-0 place-items-center self-end sm:self-center rounded-xl border border-border text-muted-foreground hover:text-destructive cursor-pointer"
                      aria-label="Remove project"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() =>
                    updateList("projects", [
                      ...(company.projects || []),
                      { title: "", detail: "", imageUrl: "" },
                    ])
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary hover:bg-muted cursor-pointer"
                >
                  <Plus className="size-4" /> Add Project Without Photo
                </button>
              )}
            </div>
          </Section>

          {/* 7 Preview & Publish */}
          <Section
            id="section-preview"
            n={7}
            title="Preview &amp; Publish"
            desc="This is how your storefront summary appears to customers."
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {company.coverImageUrl && (
                <div className="h-28 sm:h-40 w-full overflow-hidden border-b border-border bg-muted">
                  <img src={company.coverImageUrl} alt="Cover Banner" className="size-full object-cover" />
                </div>
              )}

              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt="Logo"
                      className="size-10 sm:size-12 rounded-xl border border-border object-cover shrink-0"
                    />
                  ) : (
                    <div className="grid size-10 sm:size-12 place-items-center rounded-xl bg-foreground text-xs sm:text-sm font-bold text-background shrink-0">
                      {initials(company.name) || "AB"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold truncate">
                      <span className="truncate">{company.name || "Your company"}</span>
                      <BadgeCheck className="size-4 text-primary shrink-0" />
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{company.tagline}</p>
                  </div>
                </div>

                <p className="mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed text-foreground/90">{company.about}</p>

                {company.specialties?.length > 0 && (
                  <div className="mt-3.5 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {company.specialties.map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-accent-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-muted-foreground">
                  {company.services?.length || 0} services · {team?.length || 0} team members ·{" "}
                  {company.credentials?.length || 0} credentials · {company.projects?.length || 0} projects
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing || isReadOnly}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isReadOnly ? "Draft Locked" : isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing || isSaving || isReadOnly}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {isReadOnly ? "Publish Locked" : isPublishing ? "Publishing..." : "Publish Page"}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </WorkspaceShell>
  );
}