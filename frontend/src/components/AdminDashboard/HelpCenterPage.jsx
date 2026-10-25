// frontend/src/components/AdminDashboard/HelpCenterPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  LifeBuoy,
  Search,
  Clock3,
  CheckCircle2,
  Building2,
  User,
  ExternalLink,
  Loader2,
  Eye,
  X,
  ShieldAlert,
  Calendar,
  Image as ImageIcon,
  RefreshCw,
  Save,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell, Card, useAdminRole } from "../AdminShell";
import { getAdminSupportTickets, updateAdminSupportTicket } from "../../services/api";

const CATEGORY_LABELS = {
  rejection_appeal: "Company Rejection Appeal",
  no_show: "Contractor No-Show",
  damage: "Property Damage Claim",
  quality: "Poor Workmanship",
  billing: "Overcharging / Billing",
  payment_refusal: "Client Refused Payment",
  safety: "Unsafe Work Site",
  payout: "2% Fee / Payout Issue",
  verification: "License Verification Help",
  other: "General Support",
};

export default function HelpCenterPage() {
  const { getToken } = useAuth();
  const { isTester } = useAdminRole();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Ticket modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await getAdminSupportTickets({}, token);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load support tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  // Handle resolution status and notes update
  async function handleUpdateTicket(ticketId, newStatus) {
    if (isTester) {
      toast.error("Inspector / Tester mode: Read-only access.");
      return;
    }

    try {
      setUpdating(true);
      const token = await getToken();

      const payload = {
        adminNotes: adminNoteDraft,
      };
      if (newStatus) {
        payload.status = newStatus;
      }

      const updated = await updateAdminSupportTicket(ticketId, payload, token);
      const statusText = newStatus ? `marked as ${newStatus}` : "notes updated";
      toast.success(`Ticket ${statusText} & notification sent!`);

      setTickets((prev) =>
        prev.map((t) =>
          t._id === ticketId
            ? updated || {
                ...t,
                status: newStatus || t.status,
                adminNotes: adminNoteDraft,
              }
            : t
        )
      );

      if (selectedTicket?._id === ticketId) {
        setSelectedTicket(
          updated || {
            ...selectedTicket,
            status: newStatus || selectedTicket.status,
            adminNotes: adminNoteDraft,
          }
        );
      }
    } catch (err) {
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const openCount = tickets.filter((t) => t.status === "open").length;
    const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
    const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;
    const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
    const customerCount = tickets.filter((t) => t.reporterRole === "customer").length;
    const companyCount = tickets.filter((t) => t.reporterRole === "company").length;

    return {
      openCount,
      inProgressCount,
      urgentCount,
      resolvedCount,
      customerCount,
      companyCount,
    };
  }, [tickets]);

  // Filtered List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Tab filter
      if (tab === "open" && !["open", "in_progress"].includes(t.status)) return false;
      if (tab === "customer" && t.reporterRole !== "customer") return false;
      if (tab === "company" && t.reporterRole !== "company") return false;
      if (tab === "resolved" && t.status !== "resolved") return false;

      // Priority filter
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

      // Search filter
      const query = search.toLowerCase().trim();
      if (!query) return true;
      const idMatch = (t.ticketId || "").toLowerCase().includes(query);
      const subjectMatch = (t.subject || "").toLowerCase().includes(query);
      const nameMatch = (t.reporter?.fullName || "").toLowerCase().includes(query);
      const companyMatch = (t.reportedCompany?.legalName || t.reportedCompanyName || "").toLowerCase().includes(query);

      return idMatch || subjectMatch || nameMatch || companyMatch;
    });
  }, [tickets, tab, priorityFilter, search]);

  const getPriorityBadge = (p) => {
    switch (p) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300";
      case "high":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
      case "medium":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "resolved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
      case "dismissed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
    }
  };

  return (
    <AdminShell
      title="Help Center & Support Desk"
      status={isTester ? "Read-Only Inspection" : `${tickets.length} Total Reports`}
    >
      <div className="space-y-5 sm:space-y-6">
        
        {/* TOP METRIC CARDS */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Needs Action</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground">
                {stats.openCount + stats.inProgressCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats.openCount} open, {stats.inProgressCount} in progress
              </p>
            </div>
            <div className="rounded-xl bg-amber-100 p-2.5 sm:p-3 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0">
              <Clock3 className="size-5" />
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Urgent Escalations</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-destructive">{stats.urgentCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">High priority reports</p>
            </div>
            <div className="rounded-xl bg-red-100 p-2.5 sm:p-3 text-red-700 dark:bg-red-950 dark:text-red-300 shrink-0">
              <ShieldAlert className="size-5" />
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Resolved Cases</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-600">{stats.resolvedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Completed resolutions</p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-2.5 sm:p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
          </Card>

          <Card className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Resolution Target</p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground">&lt; 4 Hours</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Platform SLA response target</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5 sm:p-3 text-primary shrink-0">
              <LifeBuoy className="size-5" />
            </div>
          </Card>
        </div>

        {/* CONTROLS, REFRESH & SEARCH */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          
          {/* Filter Tabs with Counters */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "All Tickets", count: tickets.length },
              { id: "open", label: "Needs Action", count: stats.openCount + stats.inProgressCount },
              { id: "customer", label: "Customer Reports", count: stats.customerCount },
              { id: "company", label: "Contractor Disputes", count: stats.companyCount },
              { id: "resolved", label: "Resolved", count: stats.resolvedCount },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab === t.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Priority Selector & Live Refresh */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ticket, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-48 lg:w-56 rounded-xl border border-input bg-card pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-input bg-card pl-2.5 pr-7 py-1.5 text-xs outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadTickets}
              disabled={loading}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors shrink-0"
              title="Refresh tickets"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* REAL TICKETS ROSTER */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading live support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 border-dashed px-6 py-12 sm:py-16 text-center">
            <LifeBuoy className="size-8 text-muted-foreground" />
            <h2 className="text-base font-semibold">No support reports found</h2>
            <p className="text-xs text-muted-foreground">
              {tab === "all"
                ? "No support tickets have been submitted by customers or contractors yet."
                : "No tickets match your active filter criteria."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => {
              const formattedDate = new Date(t.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });

              const targetCompany =
                t.reportedCompany?.legalName || t.reportedCompanyName || "General Inquiry";

              return (
                <Card
                  key={t._id}
                  className="p-4 sm:p-5 transition hover:shadow-md hover:border-primary/40"
                >
                  <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Badge row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {t.ticketId}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            t.reporterRole === "company"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-muted text-foreground border-border"
                          }`}
                        >
                          {t.reporterRole === "company" ? (
                            <>
                              <Building2 className="size-3" /> Contractor
                            </>
                          ) : (
                            <>
                              <User className="size-3" /> Customer
                            </>
                          )}
                        </span>

                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>

                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status?.replace("_", " ")}
                        </span>

                        {t.attachments?.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <ImageIcon className="size-3" /> {t.attachments.length} attachment{t.attachments.length > 1 ? "s" : ""}
                          </span>
                        )}

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" /> {formattedDate}
                        </span>
                      </div>

                      {/* Subject & Description */}
                      <div>
                        <h3 className="text-sm font-bold text-foreground truncate">{t.subject}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                          {t.description}
                        </p>
                      </div>

                      {/* Reporter and Target Details */}
                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs pt-1">
                        <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                          From: <strong className="text-foreground">{t.reporter?.fullName || "User"}</strong> ({t.reporter?.email || "Email provided"})
                        </span>
                        <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                          Company: <strong className="text-foreground">{targetCompany}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Category: <strong className="text-foreground">{CATEGORY_LABELS[t.category] || t.category}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setAdminNoteDraft(t.adminNotes || "");
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors shadow-2xs text-center"
                      >
                        <Eye className="size-3.5" /> Investigate &amp; Resolve
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TICKET INVESTIGATION & RESOLUTION MODAL                   */}
      {/* ========================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative flex max-h-[92vh] sm:max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 bg-muted/10 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                    Support Ticket Investigation
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground font-bold">
                    {selectedTicket.ticketId}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px] sm:max-w-none">
                  Category: <strong>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</strong> · Priority:{" "}
                  <strong className="uppercase">{selectedTicket.priority}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-sm">
              
              {/* Reporter and Target Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4 text-xs">
                <div>
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                    Submitted By ({selectedTicket.reporterRole})
                  </p>
                  <p className="font-bold text-foreground text-sm mt-1 truncate">
                    {selectedTicket.reporter?.fullName || "User"}
                  </p>
                  <p className="text-muted-foreground truncate">{selectedTicket.reporter?.email}</p>
                </div>

                <div>
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                    {selectedTicket.reporterRole === "company" ? "Contractor Company" : "Reported Company"}
                  </p>
                  <p className="font-bold text-foreground text-sm mt-1 truncate">
                    {selectedTicket.reportedCompany?.legalName || selectedTicket.reportedCompanyName || "General Dispute"}
                  </p>
                  {selectedTicket.reportedCompany?.phone && (
                    <p className="text-muted-foreground">{selectedTicket.reportedCompany.phone}</p>
                  )}
                </div>
              </div>

              {/* Full Statement */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Statement Subject
                </label>
                <p className="font-semibold text-foreground text-sm sm:text-base mt-1 break-words">
                  {selectedTicket.subject}
                </p>
                <div className="mt-2 rounded-xl border border-border bg-surface p-3.5 sm:p-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground break-words">
                  {selectedTicket.description}
                </div>
              </div>

              {/* ATTACHED PHOTO EVIDENCE PREVIEW */}
              {selectedTicket.attachments?.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">
                    Attached Evidence / Documentation ({selectedTicket.attachments.length})
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedTicket.attachments.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted hover:border-primary/50 transition-colors block"
                        title="Click to open full photo"
                      >
                        <img
                          src={imgUrl}
                          alt={`Evidence ${i + 1}`}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="size-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Internal Notes & Notification Notice */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase block">
                    Admin Resolution Notes &amp; Actions Taken
                  </label>
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <MessageSquare className="size-3" /> Sends notification to user upon update
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  disabled={isTester}
                  placeholder="Record resolution findings, license re-evaluation, refund decisions, or customer contact notes..."
                  className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between border-t border-border bg-muted/10 p-3.5 sm:p-5 gap-2.5 sm:gap-3 shrink-0">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full sm:w-auto rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer text-center"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
                {/* Save Note without changing status */}
                <button
                  type="button"
                  onClick={() => handleUpdateTicket(selectedTicket._id, null)}
                  disabled={updating || isTester}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 sm:px-3.5 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50 cursor-pointer"
                  title="Save note and notify user"
                >
                  <Save className="size-3.5" />
                  <span>{updating ? "Saving..." : "Save Note & Notify"}</span>
                </button>

                {selectedTicket.status !== "dismissed" && (
                  <button
                    onClick={() => handleUpdateTicket(selectedTicket._id, "dismissed")}
                    disabled={updating || isTester}
                    className="flex-1 sm:flex-initial rounded-xl border border-border px-3 sm:px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50 cursor-pointer text-center"
                  >
                    Dismiss
                  </button>
                )}

                {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && (
                  <button
                    onClick={() => handleUpdateTicket(selectedTicket._id, "in_progress")}
                    disabled={updating || isTester}
                    className="flex-1 sm:flex-initial rounded-xl border border-blue-300 bg-blue-50 px-3 sm:px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer dark:bg-blue-950 dark:text-blue-300 text-center"
                  >
                    Mark In Progress
                  </button>
                )}

                {selectedTicket.status !== "resolved" && (
                  <button
                    onClick={() => handleUpdateTicket(selectedTicket._id, "resolved")}
                    disabled={updating || isTester}
                    className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs text-center"
                  >
                    Resolve Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}