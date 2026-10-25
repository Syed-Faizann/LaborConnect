// frontend/src/pages/RequestForm.jsx
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Fan,
  Hammer,
  HardHat,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Paintbrush,
  Plus,
  Recycle,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  createServiceRequest,
  getPublicCompanyPage,
  checkServiceCoverage,
} from "../services/api";

const CATEGORY_ICONS = {
  plumbing: Wrench,
  electrical: Zap,
  "hvac systems": Fan,
  hvac: Fan,
  construction: HardHat,
  painting: Paintbrush,
  carpentry: Hammer,
  landscaping: Recycle,
  cleaning: Building2,
};

function getServiceIcon(name = "") {
  const lower = name.toLowerCase().trim();
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

const PRESET_CATEGORIES = [
  { name: "Plumbing", defaultDesc: "Pipe repair, installations, and emergency plumbing services." },
  { name: "Electrical", defaultDesc: "Wiring, panel upgrades, and electrical troubleshooting." },
  { name: "HVAC Systems", defaultDesc: "Heating, ventilation, and air conditioning specialists." },
  { name: "Construction", defaultDesc: "General contracting, renovations, and building projects." },
  { name: "Painting", defaultDesc: "Interior and exterior painting for homes and businesses." },
  { name: "Carpentry", defaultDesc: "Custom woodwork, framing, and finish carpentry." },
  { name: "Landscaping", defaultDesc: "Lawn care, garden design, and outdoor maintenance." },
];

const DURATION_CONFIG = {
  "1–2 hours": { hours: 2, label: "2 hours" },
  "Half day": { hours: 4, label: "4 working hours" },
  "Full day": { hours: 8, label: "8 working hours (1 day)" },
  "2–3 days": { hours: 24, label: "24 working hours (3 days @ 8h/day)" },
  "1 week or more": { hours: 40, label: "40 working hours (5 days @ 8h/day)" },
};

function parseHourlyRate(priceVal, fallback = 100) {
  if (priceVal === null || priceVal === undefined || priceVal === "") return fallback;
  if (typeof priceVal === "number" && !isNaN(priceVal) && priceVal > 0) return priceVal;
  const num = parseFloat(String(priceVal).replace(/[^0-9.]/g, ""));
  return isNaN(num) || num <= 0 ? fallback : num;
}

const urgencies = [
  { id: "emergency", title: "Emergency", description: "Response within 2–4 hours", icon: TriangleAlert, tone: "border-red-200 bg-red-50 text-red-700" },
  { id: "urgent", title: "Urgent", description: "Today or tomorrow", icon: Zap, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "normal", title: "Normal", description: "Preferred date/time", icon: CalendarDays, tone: "border-primary/20 bg-primary/5 text-primary" },
  { id: "flexible", title: "Flexible", description: "Next 1–2 weeks", icon: Clock3, tone: "border-border bg-muted text-muted-foreground" },
];

const steps = ["Service Type", "Details", "Schedule", "Review & Pay"];

const initialData = {
  services: [],
  serviceWorkers: {},
  title: "",
  description: "",
  duration: "Full day",
  address: "",
  city: "",
  date: "",
  time: "",
  urgency: "normal",
  file: null,
  fileName: "",
  cardNumber: "",
  cardExp: "",
  cardCvc: "",
  cardZip: "",
};

function Button({ children, variant = "primary", type = "button", onClick, disabled, className = "" }) {
  const base = "flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-card text-foreground hover:bg-muted";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export default function RequestForm() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("companyId");
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (!companyId) {
      setLoadingCompany(false);
      setSubmitError("No company ID provided. Please select a company from the marketplace.");
      return;
    }

    async function loadCompany() {
      try {
        setLoadingCompany(true);
        const res = await getPublicCompanyPage(companyId);
        setCompany(res);

        if (res.services && res.services.length > 0) {
          const firstService = res.services[0];
          const firstName = typeof firstService === "string" ? firstService : firstService?.name;
          if (firstName) {
            setData((prev) => ({
              ...prev,
              services: [firstName],
              serviceWorkers: { [firstName]: 1 },
              title: firstName,
            }));
          }
        }
      } catch (err) {
        setSubmitError(err.message || "Failed to load company services.");
      } finally {
        setLoadingCompany(false);
      }
    }

    loadCompany();
  }, [companyId]);

  const totalWorkers = useMemo(() => {
    if (!data.services.length) return 1;
    return data.services.reduce((sum, name) => sum + (Number(data.serviceWorkers[name]) || 1), 0);
  }, [data.services, data.serviceWorkers]);

  const pricingBreakdown = useMemo(() => {
    const config = DURATION_CONFIG[data.duration] || DURATION_CONFIG["Full day"];
    const hours = config.hours;
    const defaultRate = parseHourlyRate(company?.hourlyRate, 100);
    let total = 0;

    const items = data.services.map((serviceName) => {
      const match = company?.services?.find(
        (s) => (typeof s === "string" ? s : s?.name)?.toLowerCase() === serviceName.toLowerCase()
      );
      const rate = parseHourlyRate(match?.price, defaultRate);
      const workers = Number(data.serviceWorkers[serviceName]) || 1;
      const subtotal = rate * hours * workers;
      total += subtotal;

      return {
        name: serviceName,
        rate,
        workers,
        hours,
        subtotal,
      };
    });

    const adminFee = Math.round(total * 0.02 * 100) / 100;
    const companyPayout = Math.round((total - adminFee) * 100) / 100;

    return {
      hours,
      hoursLabel: config.label,
      items,
      total,
      adminFee,
      companyPayout,
    };
  }, [data.services, data.serviceWorkers, data.duration, company]);

  const selectedUrgency = useMemo(
    () => urgencies.find((u) => u.id === data.urgency) ?? urgencies[2],
    [data.urgency]
  );

  const update = (key, value) => {
    setData((cur) => ({ ...cur, [key]: value }));
    setErrors((cur) => ({ ...cur, [key]: "" }));
    if (key === "address" || key === "city") {
      setSubmitError("");
    }
  };

  const handleToggleService = (serviceName) => {
    const exists = data.services.some((s) => s.toLowerCase() === serviceName.toLowerCase());
    let nextServices;
    let nextWorkers = { ...data.serviceWorkers };

    if (exists) {
      nextServices = data.services.filter((s) => s.toLowerCase() !== serviceName.toLowerCase());
      delete nextWorkers[serviceName];
    } else {
      nextServices = [...data.services, serviceName];
      nextWorkers[serviceName] = nextWorkers[serviceName] || 1;
    }

    setData((cur) => ({
      ...cur,
      services: nextServices,
      serviceWorkers: nextWorkers,
      title: nextServices.join(" & "),
    }));

    if (nextServices.length > 0) {
      setErrors((cur) => ({ ...cur, services: "" }));
    }
  };

  const handleServiceWorkerChange = (serviceName, delta) => {
    setData((cur) => {
      const current = cur.serviceWorkers[serviceName] || 1;
      const nextVal = Math.max(1, Math.min(15, current + delta));
      return {
        ...cur,
        serviceWorkers: {
          ...cur.serviceWorkers,
          [serviceName]: nextVal,
        },
      };
    });
  };

  const next = async () => {
    const nextErrors = {};
    if (step === 1) {
      if (!data.services || data.services.length === 0) {
        nextErrors.services = "Please select at least one service category.";
      }
    }
    if (step === 2) {
      if (!data.title.trim()) nextErrors.title = "Job Title is required.";
      if (!data.description.trim()) nextErrors.description = "Add a short description.";
      if (!data.duration) nextErrors.duration = "Select a duration.";
    }
    if (step === 3) {
      if (!data.address.trim()) nextErrors.address = "Enter the service address.";
      if (!data.city.trim()) nextErrors.city = "Enter the city or area.";
      if (!data.date) nextErrors.date = "Choose a preferred date.";
      if (!data.time) nextErrors.time = "Select a time slot.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitError("");

    // 🛑 STRICT COVERAGE CHECK: Blocks advancing if out of service area
    if (step === 3) {
      try {
        setVerifyingLocation(true);
        const token = await getToken();
        const coverageRes = await checkServiceCoverage(
          {
            companyId,
            address: data.address,
            city: data.city,
          },
          token
        );

        if (coverageRes && coverageRes.inRange === false) {
          setSubmitError(
            coverageRes.message ||
              "Out of Service Area: The company does not service this address."
          );
          return;
        }
      } catch (err) {
        setSubmitError(
          err.message ||
            "Out of Service Area: The company does not service this address."
        );
        return;
      } finally {
        setVerifyingLocation(false);
      }
    }

    setStep((cur) => Math.min(4, cur + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setData(initialData);
    setStep(1);
    setSubmitted(false);
    setErrors({});
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (!companyId) {
      setSubmitError("Missing company reference. Please go back to the marketplace.");
      return;
    }

    const paymentErrors = {};
    const cleanCard = data.cardNumber.replace(/\s+/g, "");
    if (!cleanCard || cleanCard.length < 15) paymentErrors.cardNumber = "Valid 16-digit card required.";
    if (!data.cardExp.trim() || !data.cardExp.includes("/")) paymentErrors.cardExp = "MM/YY required.";
    if (!data.cardCvc.trim() || data.cardCvc.length < 3) paymentErrors.cardCvc = "3-digit CVC required.";

    if (Object.keys(paymentErrors).length > 0) {
      setErrors(paymentErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("companyId", companyId);

      const servicesPayload = pricingBreakdown.items.map((it) => ({
        name: it.name,
        workers: it.workers,
        rate: it.rate,
        subtotal: it.subtotal,
      }));
      fd.append("services", JSON.stringify(servicesPayload));

      fd.append("service", data.services.join(", "));
      fd.append("workers", totalWorkers);
      fd.append("duration", data.duration);
      fd.append("durationHours", pricingBreakdown.hours);
      fd.append("totalAmount", pricingBreakdown.total);
      fd.append("adminFee", pricingBreakdown.adminFee);
      fd.append("companyPayout", pricingBreakdown.companyPayout);

      fd.append("title", data.title);
      fd.append("description", data.description);
      fd.append("address", data.address);
      fd.append("city", data.city);
      fd.append("date", data.date);
      fd.append("time", data.time);
      fd.append("urgency", data.urgency);
      if (data.file) fd.append("attachment", data.file);

      await createServiceRequest(fd, token);
      setSubmitted(true);
    } catch (err) {
      const errMsg = err.message || "Failed to send request";
      setSubmitError(errMsg);
      if (errMsg.toLowerCase().includes("out of service area") || errMsg.toLowerCase().includes("radius")) {
        setStep(3);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading company services...
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Topbar onCancel={reset} cancelLabel="New Request" />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Payment Authorized &amp; Sent</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your request and payment of <strong>${pricingBreakdown.total.toFixed(2)}</strong> have been submitted to{" "}
              <strong>{company?.name || "the company"}</strong>.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
              2% Platform Protection Fee (${pricingBreakdown.adminFee.toFixed(2)}) is included.
            </div>
            <Button className="mt-6 w-full cursor-pointer" onClick={() => navigate("/marketplace")}>
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to extract full combined headquarters location
  const fullCompanyAddress =
    company?.hqLocation ||
    [company?.street, company?.city, company?.state, company?.country]
      .filter(Boolean)
      .join(", ") ||
    company?.city ||
    "headquarters";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar onCancel={reset} cancelLabel={step === 1 ? "Cancel Request" : "Save & Exit"} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
        
        {/* Company Header Notice with Operational Coverage Radius */}
        {company && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="size-10 rounded-lg object-cover" />
              ) : (
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">
                  {company.name?.charAt(0) || "C"}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Requesting service from</p>
                <p className="text-sm font-bold text-foreground">{company.name}</p>
              </div>
            </div>
            <div className="text-right max-w-[280px]">
              <span className="block text-xs font-semibold text-foreground truncate" title={fullCompanyAddress}>
                {fullCompanyAddress}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {company.coverageRadius ? `Coverage: ${company.coverageRadius} mi radius` : "Regional coverage"}
              </span>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Progress step={step} />
          <div className="px-6 py-8 sm:px-8">
            {step === 1 && (
              <ServiceStep
                companyServices={company?.services || []}
                selectedServices={data.services}
                onToggle={handleToggleService}
                error={errors.services}
              />
            )}
            {step === 2 && (
              <DetailsStep
                data={data}
                errors={errors}
                update={update}
                fileRef={fileRef}
                totalWorkers={totalWorkers}
                onWorkerChange={handleServiceWorkerChange}
              />
            )}
            {step === 3 && (
              <ScheduleStep
                data={data}
                errors={errors}
                update={update}
                company={company}
                fullCompanyAddress={fullCompanyAddress}
              />
            )}
            {step === 4 && (
              <ReviewAndPayStep
                data={data}
                update={update}
                errors={errors}
                pricingBreakdown={pricingBreakdown}
                totalWorkers={totalWorkers}
                urgency={selectedUrgency}
                companyName={company?.name}
              />
            )}
          </div>

          {/* Out of Coverage / Error Notification Banner */}
          {submitError && (
            <div className="mx-6 mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive sm:mx-8 animate-in fade-in duration-200">
              <TriangleAlert className="size-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Service Request Alert</strong>
                <p className="mt-0.5 text-xs text-destructive/90 leading-relaxed">{submitError}</p>
              </div>
            </div>
          )}

         <div className="flex items-center justify-between gap-2 sm:gap-3 border-t border-border px-4 py-3 sm:px-8 sm:py-4">
            {step > 1 ? (
              <Button
                variant="secondary"
                disabled={verifyingLocation || submitting}
                onClick={() => setStep((cur) => cur - 1)}
                className="shrink-0"
              >
                <ArrowLeft size={16} className="shrink-0" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button onClick={next} disabled={verifyingLocation} className="shrink-0">
                {verifyingLocation ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" /> Verifying Coverage...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} className="shrink-0" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="shrink-0">
                {submitting ? (
                  <Loader2 size={16} className="animate-spin shrink-0" />
                ) : (
                  <Lock size={16} className="shrink-0" />
                )}
                <span>{submitting ? "Processing..." : `Pay $${pricingBreakdown.total.toFixed(2)} & Submit`}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Topbar({ onCancel, cancelLabel }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4 md:px-10">
      <Link to="/" className="font-display text-xl font-bold text-primary">
        Labor<span className="text-foreground">Connect</span>
      </Link>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
      >
        <X size={16} /> {cancelLabel}
      </button>
    </header>
  );
}

function Progress({ step }) {
  return (
    <div className="px-6 pt-6 sm:px-8">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground sm:hidden">
        <span>Step {step} of 4</span>
        <span>{step * 25}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted sm:mt-0">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${step * 25}%` }} />
      </div>
      <div className="mt-3 hidden justify-between text-xs font-semibold sm:flex">
        {steps.map((label, i) => (
          <span key={label} className={step >= i + 1 ? "text-primary" : "text-muted-foreground"}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ServiceStep({ companyServices, selectedServices, onToggle, error }) {
  const companyServicesMap = useMemo(() => {
    const map = new Map();
    (companyServices || []).forEach((s) => {
      const name = typeof s === "string" ? s : s?.name;
      if (name) map.set(name.toLowerCase().trim(), typeof s === "string" ? { name: s } : s);
    });
    return map;
  }, [companyServices]);

  const allAvailable = useMemo(() => {
    const list = [...PRESET_CATEGORIES];
    (companyServices || []).forEach((cs) => {
      const sName = typeof cs === "string" ? cs : cs?.name;
      if (!sName) return;
      const exists = list.some((cat) => cat.name.toLowerCase() === sName.toLowerCase());
      if (!exists) {
        list.push({ name: sName, defaultDesc: cs.desc || "Professional service" });
      }
    });
    return list;
  }, [companyServices]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Select Service Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select one or more services you need. Rates are charged per labor-hour.
          </p>
        </div>
        {selectedServices.length > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {selectedServices.length} selected
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {allAvailable.map((category) => {
          const Icon = getServiceIcon(category.name);
          const isOffered = companyServicesMap.has(category.name.toLowerCase().trim());
          const companyServiceData = companyServicesMap.get(category.name.toLowerCase().trim());
          const isSelected = selectedServices.some(
            (s) => s.toLowerCase() === category.name.toLowerCase()
          );

          if (!isOffered) {
            return (
              <div
                key={category.name}
                aria-disabled="true"
                className="flex cursor-not-allowed flex-col justify-between rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-left opacity-45 select-none"
              >
                <div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground/60">
                    <Icon size={20} />
                  </div>
                  <strong className="mt-3 block text-sm font-semibold text-muted-foreground">
                    {category.name}
                  </strong>
                  <span className="mt-1 block text-xs text-muted-foreground/80">
                    Not offered by this company
                  </span>
                </div>
                <span className="mt-3 inline-block w-fit rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Disabled
                </span>
              </div>
            );
          }

          const priceTag = companyServiceData?.price
            ? String(companyServiceData.price).includes("$")
              ? `${companyServiceData.price}/hr`
              : `$${companyServiceData.price}/hr`
            : "$100/hr";

          return (
            <button
              key={category.name}
              type="button"
              onClick={() => onToggle(category.name)}
              aria-pressed={isSelected}
              className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
                      {priceTag}
                    </span>
                    <div
                      className={`grid size-5 place-items-center rounded-md border transition-colors ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>

                <strong className="mt-3 block text-sm font-semibold text-foreground">{category.name}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {companyServiceData?.desc || category.defaultDesc}
                </span>
              </div>

              <span
                className={`mt-3 text-[11px] font-semibold ${
                  isSelected ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isSelected ? "✓ Click to remove" : "+ Click to add"}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <small className="mt-1 block text-xs text-destructive">{error}</small>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20";

function DetailsStep({
  data,
  errors,
  update,
  fileRef,
  totalWorkers,
  onWorkerChange,
}) {
  const handleFile = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25MB limit.");
      return;
    }
    update("file", file);
    update("fileName", file?.name ?? "");
  };

  return (
    <>
      <SectionHeading
        title="Job Details"
        subtitle="Provide more information about the work you need completed."
      />
      <div className="space-y-5">
        <Field label="Job Title" error={errors.title}>
          <input
            className={inputClass}
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Plumbing & Electrical Repair"
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            rows={4}
            className={inputClass}
            value={data.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the issue, specific requirements, or materials provided..."
          />
        </Field>

        {/* Worker count per service */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <p className="text-sm font-bold text-foreground">Workers Required Per Service</p>
              <p className="text-xs text-muted-foreground">Each worker is billed according to labor hours</p>
            </div>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              Total: {totalWorkers} {totalWorkers === 1 ? "Worker" : "Workers"}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {data.services.map((serviceName) => {
              const Icon = getServiceIcon(serviceName);
              const count = data.serviceWorkers[serviceName] || 1;
              return (
                <div
                  key={serviceName}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{serviceName}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Workers:</span>
                    <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${serviceName} workers`}
                        onClick={() => onWorkerChange(serviceName, -1)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{count}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${serviceName} workers`}
                        onClick={() => onWorkerChange(serviceName, 1)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estimated duration */}
        <Field label="Estimated duration" error={errors.duration}>
          <select
            className={inputClass}
            value={data.duration}
            onChange={(e) => update("duration", e.target.value)}
          >
            <option value="1–2 hours">1–2 hours (2 working hours)</option>
            <option value="Half day">Half day (4 working hours)</option>
            <option value="Full day">Full day (8 working hours)</option>
            <option value="2–3 days">2–3 days (24 working hours @ 8h/day)</option>
            <option value="1 week or more">1 week or more (40 working hours @ 8h/day)</option>
          </select>
        </Field>

        <Field label="Upload Images (Optional)">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <UploadCloud size={28} className="text-muted-foreground" />
            <strong className="text-sm font-medium text-primary">
              {data.fileName || "Click to upload or drag and drop"}
            </strong>
            <span className="text-xs text-muted-foreground">
              {data.fileName ? "Click to replace file" : "PNG, JPG, GIF, or PDF (max. 25MB)"}
            </span>
          </button>
        </Field>
      </div>
    </>
  );
}

function ScheduleStep({ data, errors, update, company, fullCompanyAddress }) {
  const minDate = new Date().toISOString().split("T")[0];

  return (
    <>
      <SectionHeading title="Schedule & Location" subtitle="When and where should the company arrive?" />
      
      {/* 🏢 Service area notice showing the FULL combined headquarters location */}
      {company?.coverageRadius && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary leading-relaxed">
          <MapPin className="size-4 shrink-0 mt-0.5" />
          <span>
            <strong>Service Area:</strong> {company.name} operates within a{" "}
            <strong>{company.coverageRadius}-mile radius</strong> from{" "}
            <span className="font-bold underline decoration-primary/30 underline-offset-2">
              {fullCompanyAddress}
            </span>
            .
          </span>
        </div>
      )}

      <div className="space-y-5">
        <h2 className="text-sm font-bold text-foreground">Location Details</h2>
        <Field label="Service Address" error={errors.address}>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputClass} pl-9`}
              value={data.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St, Suite 100"
            />
          </div>
        </Field>
        <Field label="City / Area" error={errors.city}>
          <input
            className={inputClass}
            value={data.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="e.g., Downtown Seattle"
          />
        </Field>

        <div className="border-t border-border pt-5">
          <h2 className="text-sm font-bold text-foreground">Schedule</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Preferred Date" error={errors.date}>
              <input
                type="date"
                min={minDate}
                className={inputClass}
                value={data.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </Field>
            <Field label="Preferred Time" error={errors.time}>
              <select
                className={inputClass}
                value={data.time}
                onChange={(e) => update("time", e.target.value)}
              >
                <option value="">Select a time slot</option>
                <option>8:00 AM – 10:00 AM</option>
                <option>10:00 AM – 12:00 PM</option>
                <option>12:00 PM – 2:00 PM</option>
                <option>2:00 PM – 4:00 PM</option>
                <option>4:00 PM – 6:00 PM</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h2 className="text-sm font-bold text-foreground">Urgency Level</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {urgencies.map((item) => {
              const Icon = item.icon;
              const selected = data.urgency === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update("urgency", item.id)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    selected ? item.tone + " border-2" : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <Icon size={20} className="mt-0.5 shrink-0" />
                  <span>
                    <strong className="block text-sm font-semibold">{item.title}</strong>
                    <small className="text-xs opacity-80">{item.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewRow({ icon: Icon, label, children, wide }) {
  return (
    <div className={`flex items-start gap-3.5 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={16} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold leading-snug text-foreground">{children}</div>
      </div>
    </div>
  );
}

function ReviewAndPayStep({
  data,
  update,
  errors,
  pricingBreakdown,
  totalWorkers,
  urgency,
  companyName,
}) {
  const date = data.date
    ? new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Not selected";

  return (
    <>
      <SectionHeading
        title="Review & Payment"
        subtitle={`Review your hourly price estimate and enter your card details to book with ${companyName || "the contractor"}.`}
      />

      <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Hourly Price Calculation</span>
            <p className="text-xs text-muted-foreground">
              Based on {pricingBreakdown.hoursLabel} ({pricingBreakdown.hours} labor-hours)
            </p>
          </div>
          <span className="rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-bold text-foreground">
            {totalWorkers} {totalWorkers === 1 ? "Worker" : "Workers"}
          </span>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          {pricingBreakdown.items.map((item) => (
            <div key={item.name} className="flex items-center justify-between py-1">
              <div>
                <span className="font-bold text-foreground">{item.name}</span>
                <span className="text-muted-foreground ml-1.5">
                  (${item.rate}/hr × {item.hours}h × {item.workers}w)
                </span>
              </div>
              <span className="font-semibold text-foreground">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}

          <div className="border-t border-border pt-2 flex items-center justify-between text-muted-foreground">
            <span>Platform Service &amp; Protection Fee (2% to admin)</span>
            <span className="font-medium text-emerald-600">${pricingBreakdown.adminFee.toFixed(2)}</span>
          </div>

          <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold text-foreground">
            <span>Total Payable Amount</span>
            <span className="text-base text-primary">${pricingBreakdown.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CreditCard className="size-4 text-primary" /> Credit or Debit Card
          </h3>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" /> 256-Bit Encrypted
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Card Number" error={errors.cardNumber}>
            <div className="relative">
              <input
                className={`${inputClass} pl-10`}
                placeholder="4242 •••• •••• 4242"
                maxLength={19}
                value={data.cardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                  update("cardNumber", val);
                }}
              />
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Expiration" error={errors.cardExp}>
              <input
                className={inputClass}
                placeholder="MM/YY"
                maxLength={5}
                value={data.cardExp}
                onChange={(e) => {
                  let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (raw.length > 2) {
                    raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
                  }
                  update("cardExp", raw);
                }}
              />
            </Field>

            <Field label="CVC" error={errors.cardCvc}>
              <input
                className={inputClass}
                placeholder="123"
                maxLength={4}
                value={data.cardCvc}
                onChange={(e) => update("cardCvc", e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            <Field label="Postal / ZIP">
              <input
                className={inputClass}
                placeholder="98101"
                maxLength={6}
                value={data.cardZip}
                onChange={(e) => update("cardZip", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgency.tone}`}>
            <urgency.icon size={12} /> {urgency.title}
          </span>
          {data.fileName && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <UploadCloud size={12} /> {data.fileName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 divide-y divide-border px-5 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 text-xs">
          <div className="sm:col-span-2 sm:border-b sm:border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:divide-x sm:divide-border">
              <ReviewRow icon={Wrench} label="Services">
                {data.services.join(", ")}
              </ReviewRow>
              <div className="sm:pl-6">
                <ReviewRow icon={Briefcase} label="Job Title">{data.title || "—"}</ReviewRow>
              </div>
            </div>
          </div>

          <ReviewRow icon={CalendarDays} label="Schedule">{date} at {data.time || "—"}</ReviewRow>
          <div className="sm:pl-6">
            <ReviewRow icon={MapPin} label="Location">{[data.address, data.city].filter(Boolean).join(", ") || "—"}</ReviewRow>
          </div>
        </div>
      </div>
    </>
  );
}