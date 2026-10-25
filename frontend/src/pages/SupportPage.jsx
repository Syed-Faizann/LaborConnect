// frontend/src/pages/SupportPage.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router";
import {
  LifeBuoy,
  User,
  Building2,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Mail,
  ArrowLeft,
  Loader2,
  CloudUpload,
  X,
  ShieldAlert,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "../components/Navbar.jsx";
import { submitSupportTicket, getPublicPlatformSettings } from "../services/api";

const CUSTOMER_CATEGORIES = [
  { id: "no_show", label: "Contractor No-Show / Late Arrival" },
  { id: "damage", label: "Property Damage or Accidental Loss" },
  { id: "quality", label: "Poor Workmanship or Incomplete Job" },
  { id: "billing", label: "Overcharging / Unexpected Extra Charges" },
  { id: "safety", label: "Unsafe Behavior or Code Violation" },
  { id: "other", label: "General Customer Support Request" },
];

const COMPANY_CATEGORIES = [
  { id: "rejection_appeal", label: "Registration Rejection & Appeal / Review" },
  { id: "payment_refusal", label: "Customer Refusing Milestone Payment" },
  { id: "safety", label: "Unsafe Job Site or Hazardous Environment" },
  { id: "payout", label: "2% Platform Fee or Disbursement Issue" },
  { id: "verification", label: "License / COI Verification Assistance" },
  { id: "no_show", label: "Customer Not Home / Restricted Access" },
  { id: "other", label: "General Contractor Support Request" },
];

export default function SupportPage({ dbUser }) {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [role, setRole] = useState(
    dbUser?.role === "company" ? "company" : "customer"
  );

  const [category, setCategory] = useState("no_show");
  const [priority, setPriority] = useState("medium");
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [platformSettings, setPlatformSettings] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getPublicPlatformSettings();
        setPlatformSettings(settings);
      } catch (err) {
        console.warn("Could not load platform settings:", err);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const supportEmail = platformSettings?.supportEmail || "support@laborconnect.com";
  const reviewTime = platformSettings?.reviewTime || "2–3 business days";
  const activeCategories = role === "company" ? COMPANY_CATEGORIES : CUSTOMER_CATEGORIES;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }
    setImageFile(file);
  }

  function removeSelectedImage() {
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isSignedIn) {
      toast.error("Please sign in to submit a support ticket.");
      return;
    }

    if (!companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in both the summary subject and detailed description.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();

      // Bundle everything directly into FormData
      const fd = new FormData();
      fd.append("subject", subject.trim());
      fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("priority", priority);
      fd.append("reporterRole", role);
      fd.append("reportedCompanyName", companyName.trim());
      if (imageFile) {
        fd.append("image", imageFile);
      }

      const res = await submitSupportTicket(fd, token);
      setSubmittedTicket(
        res || { ticketId: `TK-${Math.floor(100000 + Math.random() * 900000)}` }
      );
      toast.success("Support report submitted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================
  // CONFIRMATION VIEW AFTER SUBMISSION
  // ==========================================
  if (submittedTicket) {
    return (
      <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
        <Navbar dbUser={dbUser} />
        <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20 text-center">
          <div className="rounded-2xl sm:rounded-3xl border border-outline-variant bg-surface p-6 sm:p-8 md:p-12 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="mx-auto grid size-14 sm:size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-7 sm:size-8" />
            </div>

            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ticket Ref #{submittedTicket.ticketId}
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-on-surface mt-1">
                Report Submitted for Investigation
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Your report regarding <strong>{companyName}</strong> has been logged with our resolution desk.
                Our team will review your statement and uploaded evidence.
              </p>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="size-4 mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Average resolution response: <strong>within 4 hours</strong> (standard review: {reviewTime}).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="size-4 mt-0.5 text-primary shrink-0" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Direct support contact:{" "}
                  <a href={`mailto:${supportEmail}`} className="font-medium text-primary hover:underline break-all">
                    {supportEmail}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setSubmittedTicket(null);
                  setSubject("");
                  setDescription("");
                  setCompanyName("");
                  removeSelectedImage();
                }}
                className="w-full sm:flex-1 rounded-xl border border-outline px-4 py-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Submit Another Report
              </button>
              <Link
                to="/"
                className="w-full sm:flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="size-4" /> Return to Homepage
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <Navbar dbUser={dbUser} />

      <main className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-12 md:py-16">
        <div className="mb-8 sm:mb-10 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <LifeBuoy className="size-3.5" /> LaborConnect Incident &amp; Support Desk
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
            Submit a Report or Inquiry
          </h1>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            File an official report regarding job disputes, company rejections, damages, or billing. Our platform compliance officers mediate all claims.
          </p>
        </div>

        {/* Quick Info Bar */}
        <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-outline-variant bg-surface p-3.5 sm:p-4 text-center">
            <Clock className="mx-auto size-5 text-primary mb-1" />
            <p className="text-xs font-bold">Fast Turnaround</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Average reply &lt; 4 hours</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface p-3.5 sm:p-4 text-center">
            <ShieldAlert className="mx-auto size-5 text-destructive mb-1" />
            <p className="text-xs font-bold">Dispute Protection</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Funds frozen during active claims</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface p-3.5 sm:p-4 text-center">
            <Mail className="mx-auto size-5 text-secondary mb-1" />
            <p className="text-xs font-bold">Direct Assistance</p>
            <a href={`mailto:${supportEmail}`} className="text-[11px] text-primary hover:underline block truncate mt-0.5">
              {supportEmail}
            </a>
          </div>
        </div>

        {/* Sign in reminder if not authenticated */}
        {isLoaded && !isSignedIn && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 sm:p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span>You must be signed in to submit a verified support ticket.</span>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shrink-0"
            >
              <LogIn className="size-3.5" /> Sign In
            </Link>
          </div>
        )}

        {/* Form Container */}
        <div className="rounded-2xl sm:rounded-3xl border border-outline-variant bg-surface p-4 sm:p-6 md:p-10 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            
            {/* Identity Switcher */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                1. Select Who You Are <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole("customer");
                    setCategory(CUSTOMER_CATEGORIES[0].id);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    role === "customer"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-outline-variant bg-surface-lowest text-on-surface hover:bg-muted"
                  }`}
                >
                  <User className="size-4 shrink-0" />
                  <span>I am a Customer / Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole("company");
                    setCategory(COMPANY_CATEGORIES[0].id);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    role === "company"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-outline-variant bg-surface-lowest text-on-surface hover:bg-muted"
                  }`}
                >
                  <Building2 className="size-4 shrink-0" />
                  <span>I am a Contractor / Company</span>
                </button>
              </div>
            </div>

            {/* Category & Priority */}
            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  2. Report Category <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full truncate rounded-xl border border-outline-variant bg-surface-lowest pl-3.5 pr-8 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  3. Urgency Level <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full truncate rounded-xl border border-outline-variant bg-surface-lowest pl-3.5 pr-8 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="low">Low — General inquiry</option>
                    <option value="medium">Medium — Standard dispute</option>
                    <option value="high">High — Escalated dispute</option>
                    <option value="urgent">Urgent — Critical damage / hazard</option>
                  </select>
                </div>

                {/* Helpful dynamic description below the dropdown */}
                <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                  {priority === "low" && "General question, verification inquiries"}
                  {priority === "medium" && "Standard dispute, scheduling conflict"}
                  {priority === "high" && "Late contractor, rejection appeal, payment refusal"}
                  {priority === "urgent" && "Active property damage, safety hazard"}
                </p>
              </div>
            </div>

            {/* MANDATORY Company Name Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                {role === "customer" ? "Contractor / Company Name" : "Your Registered Company Name"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  role === "customer"
                    ? "e.g. Acme Construction LLC"
                    : "e.g. ABC Plumbing & Electric LLC"
                }
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Summary Subject of Issue <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  category === "rejection_appeal"
                    ? "e.g. Appeal for company rejection - updated Trade License attached"
                    : "e.g. Contractor arrived late and damaged waterline pipe"
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Detailed Statement &amp; Facts <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={5}
                placeholder={
                  category === "rejection_appeal"
                    ? "Provide details regarding your company registration, reason for rejection, and re-uploaded credentials..."
                    : "Describe what occurred, dates, damages, communication attempts, and your requested resolution..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-xl border border-outline-variant bg-surface-lowest p-3.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            {/* Image Upload Box */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Attach Supporting Photo / Screenshot Evidence (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest p-3">
                  <div className="relative h-40 sm:h-48 w-full overflow-hidden rounded-xl bg-black/5">
                    <img
                      src={imagePreview}
                      alt="Evidence Preview"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
                    <span className="truncate font-medium">{imageFile?.name}</span>
                    <span className="shrink-0">{(imageFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-lowest p-6 sm:p-8 text-center transition hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="rounded-full bg-muted p-2.5 sm:p-3 transition group-hover:bg-primary/10">
                    <CloudUpload className="size-5 sm:size-6 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface">
                      Click to upload photo evidence
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload damage photos, conversation screenshots, or license documents (PNG, JPG, Max 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-outline-variant bg-surface-lowest p-3.5 sm:p-4 text-xs text-on-surface-variant flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                By submitting this report, you certify that all statements and attached files are authentic. LaborConnect administrators arbitrate all claims.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || (isLoaded && !isSignedIn)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs sm:text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting Report...
                </>
              ) : (
                <>
                  <Send className="size-4" /> Submit Report to Resolution Desk
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}