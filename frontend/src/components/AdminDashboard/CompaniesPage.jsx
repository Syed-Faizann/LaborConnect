// frontend/src/components/adminPages/CompaniesPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell, Card, useAdminRole } from "../AdminShell";
import { getAllCompanies, updateCompanyStatus } from "../../services/api";

export default function CompaniesPage() {
  const { getToken } = useAuth();
  const { canApproveCompanies, isTester } = useAdminRole();

  const [tab, setTab] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // Modal State
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    loadCompanies(tab);
  }, [tab]);

  async function loadCompanies(status) {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getAllCompanies(status, token);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(companyId, newStatus) {
    if (isTester || !canApproveCompanies) {
      toast.error("Inspector / Tester mode: Read-only inspection only. Action disabled.");
      return;
    }

    setActioningId(companyId);
    try {
      const token = await getToken();
      await updateCompanyStatus(companyId, newStatus, token);
      toast.success(`Company marked as ${newStatus}`);

      // Sync modal company if open
      if (selectedCompany?._id === companyId) {
        setSelectedCompany((prev) => ({ ...prev, status: newStatus }));
      }

      await loadCompanies(tab);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setActioningId(null);
    }
  }

  // Robust URL resolver across all possible document structures
  function getDocUrl(doc, fallbackUrl) {
    if (fallbackUrl && typeof fallbackUrl === "string" && fallbackUrl.startsWith("http")) {
      return fallbackUrl;
    }
    if (!doc) return null;
    if (typeof doc === "string" && doc.startsWith("http")) return doc;
    if (doc.url && typeof doc.url === "string" && doc.url.startsWith("http")) return doc.url;
    return null;
  }

  function getDocName(doc, fallbackName = "Document") {
    if (!doc) return fallbackName;
    if (typeof doc === "object" && doc.name) return doc.name;
    return fallbackName;
  }

  return (
    <AdminShell title="Company Registrations" status={`${companies.length} entries`}>
      {/* Filter Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 border-b border-border pb-3 mb-5 sm:mb-6 overflow-x-auto">
        {[
          { id: "all", label: "All Registrations" },
          { id: "pending", label: "Pending Review", icon: Clock3 },
          { id: "verified", label: "Verified & Approved", icon: CheckCircle2 },
          { id: "rejected", label: "Rejected", icon: XCircle },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.icon && <t.icon className="size-3.5" />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed px-6 py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No companies found</h2>
          <p className="text-sm text-muted-foreground">No companies match the selected tab filter.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => {
            const licenseUrl = getDocUrl(company.tradeLicense, company.tradeLicenseUrl);
            const licenseName = getDocName(company.tradeLicense, "Trade License PDF");

            const coiUrl = getDocUrl(company.coiFile || company.coiCertificate, company.coiUrl);
            const coiName = getDocName(company.coiFile || company.coiCertificate, "Insurance COI PDF");

            return (
              <Card key={company._id} className="p-4 sm:p-6 transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Company Logo Thumbnail */}
                    <div className="size-12 sm:size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.legalName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-xs sm:text-sm font-black text-muted-foreground">
                          {company.legalName?.slice(0, 2).toUpperCase() || "CO"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 min-w-0 flex-1 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{company.legalName}</h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold capitalize ${
                            company.status === "verified"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : company.status === "rejected"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {company.status}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        Owner: <strong className="text-foreground">{company.owner?.fullName || "N/A"}</strong> ({company.owner?.email || company.email}) · Phone: {company.phone}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Entity: <strong className="uppercase">{company.entityType}</strong></span>
                        <span>EIN: <strong>{company.ein}</strong></span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-none">{company.hqLocation}</span>
                        </span>
                        <span>Established: <strong>{company.yearEstablished}</strong></span>
                        <span>Team: <strong>{company.employeeRange} employees</strong></span>
                        <span>Coverage: <strong>{company.coverageRadius || 25} miles</strong></span>
                      </div>

                      {/* Trade Specialties Badges */}
                      {company.specialties?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-semibold text-muted-foreground">Specialties:</span>
                          {company.specialties.map((s) => (
                            <span key={s} className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick Document Links in Card */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 text-xs">
                        {licenseUrl ? (
                          <a
                            href={licenseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-semibold text-primary hover:underline truncate max-w-[200px] sm:max-w-none"
                          >
                            <FileText className="size-3.5 shrink-0" /> <span className="truncate">{licenseName}</span>
                          </a>
                        ) : company.tradeLicense?.name ? (
                          <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                            <FileText className="size-3.5 shrink-0" /> <span className="truncate">{company.tradeLicense.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No license file</span>
                        )}

                        {coiUrl ? (
                          <a
                            href={coiUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-semibold text-primary hover:underline truncate max-w-[200px] sm:max-w-none"
                          >
                            <FileCheck2 className="size-3.5 shrink-0" /> <span className="truncate">{coiName}</span>
                          </a>
                        ) : company.coiFile?.name ? (
                          <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                            <FileCheck2 className="size-3.5 shrink-0" /> <span className="truncate">{company.coiFile.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No COI file</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 shrink-0">
                    <button
                      onClick={() => setSelectedCompany(company)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Eye className="size-3.5" /> Review Application
                    </button>

                    {company.status !== "verified" && (
                      <button
                        onClick={() => handleDecision(company._id, "verified")}
                        disabled={actioningId === company._id || isTester}
                        title={isTester ? "Disabled in inspection mode" : "Approve company"}
                        className="flex-1 sm:flex-initial rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs disabled:cursor-not-allowed text-center"
                      >
                        {actioningId === company._id ? "Updating..." : "Approve"}
                      </button>
                    )}
                    {company.status !== "rejected" && (
                      <button
                        onClick={() => handleDecision(company._id, "rejected")}
                        disabled={actioningId === company._id || isTester}
                        title={isTester ? "Disabled in inspection mode" : "Reject company"}
                        className="flex-1 sm:flex-initial rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted text-destructive disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-center"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* REVIEW APPLICATION POPUP MODAL                            */}
      {/* ========================================================= */}
      {selectedCompany && (() => {
        const licenseUrl = getDocUrl(selectedCompany.tradeLicense, selectedCompany.tradeLicenseUrl);
        const licenseName = getDocName(selectedCompany.tradeLicense, "Trade License PDF");

        const coiUrl = getDocUrl(selectedCompany.coiFile || selectedCompany.coiCertificate, selectedCompany.coiUrl);
        const coiName = getDocName(selectedCompany.coiFile || selectedCompany.coiCertificate, "Insurance (COI) Document");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative flex max-h-[92vh] sm:max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              
              {/* Modal Topbar */}
              <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 bg-muted/10 shrink-0">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                    Review Company Registration
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-mono">
                    REG #{selectedCompany._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 text-sm">
                
                {/* Box 1: Company & Owner Summary */}
                <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Company &amp; Owner Summary
                    </h3>
                    <span
                      className={`rounded-full px-2.5 sm:px-3 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide ${
                        selectedCompany.status === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : selectedCompany.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {selectedCompany.status}
                    </span>
                  </div>

                  {/* Company Logo Header */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="size-12 sm:size-16 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card shadow-xs">
                      {selectedCompany.logoUrl ? (
                        <img
                          src={selectedCompany.logoUrl}
                          alt={selectedCompany.legalName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-base sm:text-lg font-black text-primary bg-primary/10">
                          {selectedCompany.legalName?.slice(0, 2).toUpperCase() || "CO"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base sm:text-lg font-bold text-foreground truncate">
                        {selectedCompany.legalName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {selectedCompany.hqLocation} · Established {selectedCompany.yearEstablished}
                      </p>
                      {selectedCompany.logoUrl && (
                        <a
                          href={selectedCompany.logoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" /> View Full Logo
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs sm:text-sm pt-2">
                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Owner Contact Email</p>
                      <p className="font-semibold text-foreground truncate">
                        {selectedCompany.owner?.email || selectedCompany.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Primary Phone</p>
                      <p className="font-semibold text-foreground">{selectedCompany.phone}</p>
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Entity Details</p>
                      <p className="font-semibold text-foreground uppercase">
                        {selectedCompany.entityType} (EIN: {selectedCompany.ein})
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Team Capacity</p>
                      <p className="font-semibold text-foreground">
                        {selectedCompany.employeeRange} employees
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Coverage Radius</p>
                      <p className="font-semibold text-foreground">
                        {selectedCompany.coverageRadius || 25} miles radius from HQ
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Headquarters</p>
                      <p className="font-semibold text-foreground truncate">
                        {selectedCompany.hqLocation}
                      </p>
                    </div>
                  </div>

                  {/* Trade Specialties */}
                  {selectedCompany.specialties?.length > 0 && (
                    <div className="border-t border-border/60 pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trade Specialties</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCompany.specialties.map((s) => (
                          <span key={s} className="rounded-md border border-border bg-card px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium text-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Box 2: Verification Documents & Legal Compliance */}
                <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Verification Documents &amp; Compliance
                  </h3>

                  {/* License Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs border-b border-border/60 pb-3">
                    <div>
                      <span className="text-muted-foreground block">License Number</span>
                      <strong className="text-foreground text-xs sm:text-sm">{selectedCompany.licenseNumber || "Not provided"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Expiration Date</span>
                      <strong className="text-foreground text-xs sm:text-sm">{selectedCompany.licenseExpiration || "Not provided"}</strong>
                    </div>
                  </div>

                  {/* Workers' Comp Status */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      Workers' Compensation:{" "}
                      <strong className="text-foreground">
                        {selectedCompany.workersCompExempt
                          ? "Exempt (Sole Proprietor / No Crew)"
                          : "Active Policy Certified"}
                      </strong>
                    </span>
                  </div>

                  {/* Download / View Document Links */}
                  <div className="space-y-2 pt-1 text-xs">
                    {/* Trade License */}
                    {licenseUrl ? (
                      <a
                        href={licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-semibold text-primary hover:underline break-all"
                      >
                        <ExternalLink className="size-4 shrink-0" />
                        <span>View Uploaded Trade License ({licenseName})</span>
                      </a>
                    ) : selectedCompany.tradeLicense?.name ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span>Attached file: <strong>{selectedCompany.tradeLicense.name}</strong></span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No Trade License file uploaded.</p>
                    )}

                    {/* COI Certificate */}
                    {coiUrl ? (
                      <a
                        href={coiUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-semibold text-primary hover:underline break-all"
                      >
                        <ExternalLink className="size-4 shrink-0" />
                        <span>View Uploaded Insurance (COI) Document ({coiName})</span>
                      </a>
                    ) : (selectedCompany.coiFile?.name || selectedCompany.coiCertificate?.name) ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileCheck2 className="size-4 shrink-0 text-primary" />
                        <span>
                          Attached file: <strong>{selectedCompany.coiFile?.name || selectedCompany.coiCertificate?.name}</strong>
                        </span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No Certificate of Insurance (COI) uploaded.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 border-t border-border bg-muted/10 p-4 sm:p-5 shrink-0">
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="w-full sm:w-auto rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors text-center"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {selectedCompany.status !== "rejected" && (
                    <button
                      onClick={() => handleDecision(selectedCompany._id, "rejected")}
                      disabled={actioningId === selectedCompany._id || isTester}
                      title={isTester ? "Disabled in inspection mode" : "Reject company"}
                      className="flex-1 sm:flex-initial rounded-xl border border-destructive/30 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40 cursor-pointer transition-colors disabled:cursor-not-allowed text-center"
                    >
                      {actioningId === selectedCompany._id ? "Updating..." : "Reject Company"}
                    </button>
                  )}

                  {selectedCompany.status !== "verified" && (
                    <button
                      onClick={() => handleDecision(selectedCompany._id, "verified")}
                      disabled={actioningId === selectedCompany._id || isTester}
                      title={isTester ? "Disabled in inspection mode" : "Approve company"}
                      className="flex-1 sm:flex-initial rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs transition-opacity disabled:cursor-not-allowed text-center"
                    >
                      {actioningId === selectedCompany._id ? "Updating..." : "Approve Company"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminShell>
  );
}