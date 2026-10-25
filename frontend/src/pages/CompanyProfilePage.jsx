// frontend/src/pages/CompanyProfilePage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Fan,
  Hammer,
  HardHat,
  Loader2,
  MapPin,
  MessageSquare,
  Paintbrush,
  Recycle,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wrench,
  Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getPublicCompanyPage, recordCompanyPageView } from "../services/api";

const SERVICE_ICONS = {
  plumbing: Wrench,
  electrical: Zap,
  electric: Zap,
  hvac: Fan,
  "hvac systems": Fan,
  heating: Fan,
  construction: HardHat,
  building: HardHat,
  painting: Paintbrush,
  carpentry: Hammer,
  woodwork: Hammer,
  landscaping: Recycle,
  lawn: Recycle,
};

function getServiceIcon(serviceName = "") {
  const lower = serviceName.toLowerCase().trim();
  for (const [key, Icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Wrench;
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4 sm:size-5" />
      </div>
      <div>
        <p className="font-display text-lg sm:text-xl font-bold leading-tight text-on-surface">{value}</p>
        <p className="font-display text-[11px] sm:text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-10 w-px bg-outline-variant md:block" />;
}

export default function CompanyProfilePage({ dbUser }) {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasRecordedView = useRef(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const data = await getPublicCompanyPage(companyId);
        if (!ignore) setCompany(data);
      } catch (err) {
        if (!ignore) setError(err.message || "Company not found");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (companyId) load();

    return () => {
      ignore = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || hasRecordedView.current) return;
    hasRecordedView.current = true;

    recordCompanyPageView(companyId)
      .then((res) => {
        if (res?.views) {
          setCompany((prev) => (prev ? { ...prev, views: res.views } : prev));
        }
      })
      .catch((err) => {
        console.error("Failed to record view:", err);
      });
  }, [companyId]);

  // Handle Customer Message Click
  const handleMessageCompany = () => {
    if (!dbUser) {
      navigate("/auth");
      return;
    }

    // 1. Target Company Manager if assigned and registered
    let targetUserId = company?.manager?._id;
    let targetName = company?.manager?.name
      ? `${company.name} (${company.manager.name} - Manager)`
      : "";
    let targetLogo = company?.manager?.profilePic || company?.logoUrl || "";

    // 2. If no Manager exists, fall back to Company Owner
    if (!targetUserId) {
      const ownerObj = typeof company?.owner === "object" ? company.owner : null;
      targetUserId = ownerObj?._id || company?.owner;
      targetName = company?.name || ownerObj?.fullName || "Company Owner";
      targetLogo = company?.logoUrl || ownerObj?.profilePic || "";
    }

    if (!targetUserId) {
      alert("Unable to contact company at this time.");
      return;
    }

    const params = new URLSearchParams();
    params.set("userId", String(targetUserId));
    if (targetName) params.set("name", targetName);
    if (targetLogo) params.set("logo", targetLogo);

    navigate(`/messages?${params.toString()}`);
  };

  // Reusable Key Personnel Section
  const renderKeyPersonnel = () => (
    <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest p-5 sm:p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-on-surface">Key Personnel</h2>
      {company.team?.length > 0 ? (
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {company.team.map((person) => (
            <div key={person._id || person.name} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/50 p-2.5 sm:p-3">
              {person.photoUrl ? (
                <img
                  src={person.photoUrl}
                  alt={person.name}
                  className="size-10 sm:size-11 shrink-0 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {person.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-sm font-bold text-on-surface">{person.name}</h3>
                <p className="text-xs text-primary">{person.role}</p>
                {person.note && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{person.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No team members listed yet.</p>
      )}
    </section>
  );

  // Reusable Credentials & Badges Section
  const renderCredentials = () => (
    <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest p-5 sm:p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-on-surface">Credentials &amp; Badges</h2>
      {company.credentials?.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {company.credentials.map((c) => (
            <span
              key={c._id || c.name}
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-xl border border-border bg-surface px-2.5 sm:px-3 py-1.5 font-display text-xs font-semibold text-on-surface shadow-2xs"
            >
              <BadgeCheck className="size-4 shrink-0 text-primary" />
              <span className="truncate">{c.name}</span>
              {c.detail ? ` (${c.detail})` : ""}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No credentials listed yet.</p>
      )}
    </section>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
        <Navbar dbUser={dbUser} />
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading company profile...
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
        <Navbar dbUser={dbUser} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="text-xl font-semibold">Company not found</h1>
          <p className="text-sm text-muted-foreground">
            {error || "This company page doesn't exist or isn't published yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased overflow-x-hidden">
      <Navbar dbUser={dbUser} />

      <main className="mx-auto w-full max-w-[1280px] flex-grow px-4 py-6 sm:py-8 md:px-10">
        {/* Company Header Card */}
        <div className="relative mb-6 sm:mb-8 flex flex-col items-start gap-6 overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest p-4 sm:p-6 md:flex-row md:items-center md:gap-8 md:p-8 shadow-sm">
          {company.coverImageUrl && (
            <div className="absolute inset-0 -z-10 opacity-15">
              <img src={company.coverImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          
          {/* Logo & Verified Badge */}
          <div className="relative flex-shrink-0">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="size-20 sm:size-24 rounded-2xl border border-outline-variant object-cover shadow-sm md:h-32 md:w-32"
              />
            ) : (
              <div className="grid size-20 sm:size-24 place-items-center rounded-2xl border border-outline-variant bg-foreground text-xl sm:text-2xl font-black text-background shadow-sm md:h-32 md:w-32">
                {company.name?.slice(0, 2).toUpperCase() || "LC"}
              </div>
            )}
            <div
              title="Verified Business"
              className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 flex items-center justify-center rounded-full border-2 border-surface-lowest bg-emerald-500 p-1 sm:p-1.5 text-white shadow-md"
            >
              <CheckCircle2 className="size-3.5 sm:size-4" />
            </div>
          </div>

          {/* Details & Actions */}
          <div className="z-10 flex w-full min-w-0 flex-grow flex-col gap-2">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <h1 className="break-words font-display text-2xl font-bold tracking-tight text-on-surface md:text-3xl [overflow-wrap:anywhere]">
                  {company.name || "Unnamed Company"}
                </h1>
                {company.tagline && (
                  <p className="mt-1 break-words text-xs sm:text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {company.tagline}
                  </p>
                )}
                {(company.city || company.state) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <MapPin className="size-3.5 text-primary shrink-0" /> {[company.city, company.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(`/requestform?companyId=${companyId}`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 sm:px-6 py-2.5 font-display text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md cursor-pointer w-full sm:w-auto"
                >
                  Request Service
                </button>
                <button
                  type="button"
                  onClick={handleMessageCompany}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 sm:px-5 py-2.5 font-display text-xs sm:text-sm font-semibold text-on-surface transition-colors hover:bg-muted cursor-pointer w-full sm:w-auto"
                >
                  <MessageSquare className="size-4" /> Message
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-6 border-t border-border/80 pt-4 sm:pt-5">
              <Stat icon={Wrench} value={company.services?.length || 0} label="Services Catalog" />
              <Divider />
              <Stat icon={ShieldCheck} value={company.credentials?.length || 0} label="Credentials" />
              <Divider />
              <Stat icon={Star} value={company.yearsInBusiness ? `${company.yearsInBusiness} yrs` : "—"} label="In Business" />
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
          
          {/* Main Column */}
          <div className="flex min-w-0 flex-col gap-6 sm:gap-8 lg:col-span-8">
            
            {/* MOBILE ONLY: Key Personnel & Credentials on TOP */}
            <div className="flex flex-col gap-6 lg:hidden">
              {renderKeyPersonnel()}
              {renderCredentials()}
            </div>

            {/* About Section */}
            <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest p-5 sm:p-6 shadow-sm">
              <h2 className="mb-3 font-display text-xl font-bold text-on-surface">About Us</h2>
              <p className="break-words text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line [overflow-wrap:anywhere]">
                {company.about || "This company hasn't added a description yet."}
              </p>
              {company.specialties?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                  {company.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-accent/50 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-accent-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Services Offered */}
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-display text-xl sm:text-2xl font-bold text-on-surface">
                  Services Offered
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {company.services?.length || 0}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available trade services and transparent pricing.
                </p>
              </div>

              {company.services?.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                  {company.services.map((s, idx) => {
                    const ServiceIcon = getServiceIcon(s.name);
                    return (
                      <div
                        key={s._id || s.name || idx}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface-lowest p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <ServiceIcon className="size-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate font-display text-sm sm:text-base font-bold text-on-surface transition-colors group-hover:text-primary">
                                  {s.name}
                                </h3>
                                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                                  <Sparkles className="size-3 text-primary" /> Verified Service
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            {s.desc || "Custom trade service provided with guaranteed workmanship."}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                          {s.price ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">
                              <Tag className="size-3" /> {s.price}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Quote upon request
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={handleMessageCompany}
                            className="text-xs font-semibold text-primary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:underline cursor-pointer"
                          >
                            Request Quote &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8 text-center text-sm text-muted-foreground">
                  No services listed yet.
                </div>
              )}

              {/* Emergency Service Banner */}
              {company.emergencyService?.enabled && (
                <div className="mt-1 sm:mt-2 flex items-start gap-3 sm:gap-4 rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 sm:p-5 shadow-xs dark:border-amber-500/30 dark:bg-amber-950/30">
                  <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-amber-950 dark:text-amber-300">
                      {company.emergencyService.title || "24/7 Emergency Service"}
                    </h3>
                    <p className="mt-1 break-words text-xs leading-relaxed text-amber-900/85 dark:text-amber-400/90 [overflow-wrap:anywhere]">
                      {company.emergencyService.description ||
                        "Immediate response for burst pipes, severe blockages, and critical water damage mitigation scenarios across the metro area."}
                    </p>
                  </div>
                </div>
              )}

              {/* Weekend Service Banner */}
              {company.weekendService?.enabled && (
                <div className="mt-1 flex items-start gap-3 sm:gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 shadow-xs">
                  <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Clock className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {company.weekendService.title || "Weekend Appointments Available"}
                    </h3>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                      {company.weekendService.description ||
                        "On-call dispatch available Saturdays, Sundays, and holidays."}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar Column (DESKTOP ONLY) */}
          <div className="hidden lg:flex min-w-0 flex-col gap-6 lg:col-span-4">
            {renderKeyPersonnel()}
            {renderCredentials()}
          </div>
        </div>

        {/* Recent Projects Section */}
        {company.projects?.length > 0 && (
          <section className="mt-8 sm:mt-12 border-t border-border/80 pt-6 sm:pt-8">
            <h2 className="mb-4 sm:mb-5 font-display text-xl sm:text-2xl font-bold text-on-surface">Recent Projects &amp; Workmanship</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
              {company.projects.map((p) => (
                <div key={p._id || p.title} className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-sm transition-transform hover:-translate-y-1">
                  {p.imageUrl && (
                    <div className="h-44 sm:h-48 w-full overflow-hidden bg-muted">
                      <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                    </div>
                  )}
                  <div className="p-3.5 sm:p-4">
                    <h3 className="break-words font-display text-sm font-bold text-on-surface [overflow-wrap:anywhere]">{p.title}</h3>
                    <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-4 px-4 py-6 sm:py-8 sm:flex-row md:px-10">
          <div className="font-display text-base sm:text-lg font-bold text-on-surface">LaborConnect</div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {["Terms of Service", "Privacy Policy", "Contact Support", "Sitemap"].map((l) => (
              <a key={l} href="#" className="font-display text-xs font-semibold text-muted-foreground transition-colors hover:text-primary">
                {l}
              </a>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} LaborConnect Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}