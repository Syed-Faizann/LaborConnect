// frontend/src/components/companyDashboardPages/requests.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  HardHat,
  Inbox,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { Card, WorkspaceShell } from "../WorkspaceShell";
import { initials, useWorkspace } from "../../lib/workspace-store";
import { getMyCompanyRequests, updateRequestStatus } from "../../services/api";

const filterTabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending Review" },
  { id: "scheduled", label: "Scheduled / Dispatched" },
  { id: "completed", label: "Completed" },
  { id: "declined", label: "Declined" },
];

const PRESET_WINDOWS = [
  { label: "8:00 AM – 10:00 AM", start: 480, end: 600 },
  { label: "10:00 AM – 12:00 PM", start: 600, end: 720 },
  { label: "12:00 PM – 2:00 PM", start: 720, end: 840 },
  { label: "2:00 PM – 4:00 PM", start: 840, end: 960 },
  { label: "4:00 PM – 6:00 PM", start: 960, end: 1080 },
];

// Helper: Normalize date strings to standard YYYY-MM-DD
function normalizeDate(dStr) {
  if (!dStr) return "";
  const s = String(dStr).trim();
  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;
  }
  const mdy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mdy) {
    return `${mdy[3]}-${String(mdy[1]).padStart(2, "0")}-${String(mdy[2]).padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return s;
}

// Format date into readable string e.g. "Sat, Sep 26, 2026"
function formatDateReadable(dStr) {
  if (!dStr) return "";
  const norm = normalizeDate(dStr);
  const parts = norm.split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
  }
  return dStr;
}

// Helper: Parse duration hours matching customer breakdown
function parseDurationHours(durationHours, durationStr) {
  if (Number(durationHours) > 0) return Number(durationHours);
  if (typeof durationStr === "string") {
    const s = durationStr.toLowerCase();
    if (s.includes("half day") || s.includes("half-day") || s.includes("4 work") || s.includes("4h")) return 4;
    if (s.includes("full day") || s.includes("full-day") || s.includes("8 work") || s.includes("8h")) return 8;
    if (s.includes("1-2") || s.includes("1–2") || s.includes("2 work") || s.includes("2h")) return 2;
    if (s.includes("day") || s.includes("week")) return 8;
    const match = s.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
    if (match) return parseFloat(match[1]);
  }
  return 2;
}

// Helper: Parse time string into minutes from midnight
function parseMinutes(t) {
  if (!t) return null;
  const match = t.trim().match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3]?.toUpperCase();

  if (meridian === "PM" && h < 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// Convert minutes from midnight (0–1440) to 12-hour AM/PM string
function formatMinutesTo12Hour(minutes) {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridian = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mStr = m > 0 ? `:${String(m).padStart(2, "0")}` : ":00";
  return `${h}${mStr} ${meridian}`;
}

// Calculates exact [start, end] window in minutes
function getTimeRange(timeStr, durationHours, durationStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const durH = parseDurationHours(durationHours, durationStr);
  const durMins = Math.round(durH * 60);

  const parts = timeStr.split(/–|-|to/i);
  const start = parseMinutes(parts[0]);
  if (start === null) return null;

  let end = parts[1] ? parseMinutes(parts[1]) : null;
  if (end === null || end <= start) {
    end = start + (durMins > 0 ? durMins : 120);
  } else {
    if (durMins > end - start) {
      end = start + durMins;
    }
  }

  return { start, end };
}

function doTimeRangesOverlap(r1, r2) {
  if (!r1 || !r2) return true;
  return r1.start < r2.end && r1.end > r2.start;
}

function getMergedBookedRanges(bookings) {
  if (!bookings || bookings.length === 0) return [];
  const sorted = [...bookings].sort((a, b) => a.range.start - b.range.start);
  const merged = [{ ...sorted[0], jobCount: 1 }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = merged[merged.length - 1];

    if (current.range.start <= prev.range.end) {
      prev.range.end = Math.max(prev.range.end, current.range.end);
      prev.jobCount += 1;
    } else {
      merged.push({ ...current, jobCount: 1 });
    }
  }
  return merged;
}

export default function RequestsPage() {
  const { getToken } = useAuth();
  const { crew } = useWorkspace();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeModalRequest, setActiveModalRequest] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      const data = await getMyCompanyRequests(token);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdate = async (requestId, payload) => {
    try {
      const token = await getToken();
      const updated = await updateRequestStatus(requestId, payload, token);
      setRequests((prev) => prev.map((r) => (r._id === requestId ? updated : r)));
      if (activeModalRequest?._id === requestId) {
        setActiveModalRequest(updated);
      }
    } catch (err) {
      alert(err.message || "Error updating request");
      throw err;
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "scheduled"
          ? ["accepted", "scheduled"].includes(r.status)
          : r.status === filter);

      const matchesSearch =
        !search.trim() ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.service?.toLowerCase().includes(search.toLowerCase()) ||
        r.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        r.city?.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, search]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <WorkspaceShell
      title="Customer Requests"
      status={`${pendingCount} pending review`}
      actions={
        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold hover:bg-muted cursor-pointer shrink-0"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Refresh"}
        </button>
      }
    >
      {/* Filters & Search */}
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {filterTabs.map((t) => {
            const count =
              t.id === "all"
                ? requests.length
                : t.id === "scheduled"
                ? requests.filter((r) => ["accepted", "scheduled"].includes(r.status)).length
                : requests.filter((r) => r.status === t.id).length;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  filter === t.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{t.label}</span>
                <span className={`rounded-full px-1.5 text-[10px] ${filter === t.id ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, service, client..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" /> Loading service requests...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
          <Inbox className="size-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-bold">No requests found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {filter === "all"
              ? "When clients submit requests through your profile, they appear here."
              : `No requests with status "${filter}".`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req._id}
              request={req}
              onReview={() => setActiveModalRequest(req)}
              onQuickApprove={() => handleUpdate(req._id, { status: "accepted" })}
              onQuickDecline={() => handleUpdate(req._id, { status: "declined" })}
              onMarkCompleted={() => handleUpdate(req._id, { status: "completed" })}
            />
          ))}
        </div>
      )}

      {/* Review & Multi-Crew Dispatch Modal */}
      {activeModalRequest && (
        <ReviewAndDispatchModal
          request={activeModalRequest}
          crew={crew || []}
          allRequests={requests}
          onClose={() => setActiveModalRequest(null)}
          onSave={async (payload) => {
            await handleUpdate(activeModalRequest._id, payload);
          }}
        />
      )}
    </WorkspaceShell>
  );
}

function RequestCard({ request, onReview, onQuickApprove, onQuickDecline, onMarkCompleted }) {
  const urgencyColor = {
    emergency: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40",
    urgent: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40",
    normal: "border-primary/20 bg-primary/10 text-primary",
    flexible: "border-border bg-muted text-muted-foreground",
  }[request.urgency] || "border-border bg-muted text-muted-foreground";

  const statusBadge = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    accepted: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
    scheduled: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    declined: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  }[request.status] || "bg-muted text-muted-foreground";

  const customerName = request.customer?.fullName || "Client";
  const customerPhoto = request.customer?.profilePic;

  const assignedCrewList = useMemo(() => {
    if (Array.isArray(request.assignedCrew)) return request.assignedCrew;
    if (request.assignedCrew && typeof request.assignedCrew === "object") return [request.assignedCrew];
    return [];
  }, [request.assignedCrew]);

  return (
    <Card className="p-4 sm:p-5 transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {customerPhoto ? (
            <img
              src={customerPhoto}
              alt={customerName}
              className="size-10 sm:size-12 shrink-0 rounded-2xl border border-border object-cover shadow-xs"
            />
          ) : (
            <div className="grid size-10 sm:size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xs sm:text-sm font-bold text-primary">
              {initials(customerName)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{request.title}</h3>
              <span className={`rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${statusBadge}`}>
                {request.status}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold capitalize ${urgencyColor}`}>
                {request.urgency}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground font-medium truncate">
              Requested by <strong className="text-foreground">{customerName}</strong>
              {request.customer?.email && ` · ${request.customer.email}`}
            </p>

            <p className="mt-1.5 sm:mt-2 line-clamp-2 text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {request.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="size-3.5 text-primary shrink-0" />
                <span>{request.scheduledDate || request.date} ({request.scheduledTime || request.time})</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{request.address}, {request.city}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="size-3.5 text-primary shrink-0" />
                <span>{request.workers} Worker{request.workers > 1 ? "s" : ""} · {request.duration}</span>
              </span>
            </div>

            {/* Dispatched Crew Members */}
            {assignedCrewList.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase text-muted-foreground">Crew Assigned:</span>
                {assignedCrewList.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/60 px-2 py-1 text-xs font-semibold text-accent-foreground"
                  >
                    <HardHat className="size-3 text-primary shrink-0" />
                    <span>{m.name}</span> {m.role && <span className="text-[10px] text-muted-foreground">({m.role})</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Customer Rating & Review Display (if rated) */}
            {request.status === "completed" && request.isRated && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-300">Customer Rating:</span>
                <div className="flex items-center text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-3.5 ${
                        star <= (request.rating || 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-foreground">{request.rating}.0</span>
                {request.review && (
                  <span className="text-muted-foreground italic">"{request.review}"</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 shrink-0">
          {request.status === "pending" && (
            <>
              <button
                type="button"
                onClick={onQuickDecline}
                className="flex-1 sm:flex-initial rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onQuickApprove}
                className="flex-1 sm:flex-initial rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Accept
              </button>
            </>
          )}

          {["accepted", "scheduled"].includes(request.status) && (
            <button
              type="button"
              onClick={onMarkCompleted}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" /> Mark Completed
            </button>
          )}

          <button
            type="button"
            onClick={onReview}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shrink-0"
          >
            Review &amp; Dispatch <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function ReviewAndDispatchModal({ request, crew = [], allRequests = [], onClose, onSave }) {
  const [status, setStatus] = useState(request.status);
  const [scheduledDate, setScheduledDate] = useState(request.scheduledDate || request.date || "");
  const [scheduledTime, setScheduledTime] = useState(request.scheduledTime || request.time || "");
  const [dispatchNotes, setDispatchNotes] = useState(request.dispatchNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredSlots = useMemo(() => {
    const slots = [];
    if (request.services && request.services.length > 0) {
      request.services.forEach((s) => {
        const count = Number(s.workers) || 1;
        for (let i = 0; i < count; i++) {
          slots.push({
            id: `${s.name.toLowerCase()}_${i}`,
            trade: s.name,
            label: `${s.name} (Tech ${i + 1} of ${count})`,
          });
        }
      });
    } else {
      const totalWorkers = Number(request.workers) || 1;
      for (let i = 0; i < totalWorkers; i++) {
        slots.push({
          id: `worker_${i}`,
          trade: request.service || "General",
          label: `Worker ${i + 1} of ${totalWorkers}`,
        });
      }
    }
    return slots;
  }, [request.services, request.workers, request.service]);

  const [slotAssignments, setSlotAssignments] = useState(() => {
    const initialMap = {};
    const existingList = Array.isArray(request.assignedCrew)
      ? request.assignedCrew
      : request.assignedCrew
      ? [request.assignedCrew]
      : [];

    requiredSlots.forEach((slot, index) => {
      const existing = existingList[index];
      initialMap[slot.id] = existing?._id || existing || "";
    });
    return initialMap;
  });

  const handleSlotChange = (slotId, crewId) => {
    setSlotAssignments((prev) => ({ ...prev, [slotId]: crewId }));
  };

  const getCrewMemberDayBookings = (memberId) => {
    if (!memberId) return [];
    const targetDateNorm = normalizeDate(scheduledDate);
    if (!targetDateNorm) return [];

    const rawBookings = allRequests
      .filter((r) => {
        if (r._id === request._id) return false;
        if (!["accepted", "scheduled"].includes(r.status)) return false;

        const rDateNorm = normalizeDate(r.scheduledDate || r.date);
        if (rDateNorm !== targetDateNorm) return false;

        const assignedList = Array.isArray(r.assignedCrew)
          ? r.assignedCrew.map((c) => (c?._id || c)?.toString())
          : r.assignedCrew
          ? [(r.assignedCrew?._id || r.assignedCrew)?.toString()]
          : [];

        const workersList = Array.isArray(r.assignedWorkers)
          ? r.assignedWorkers.map((w) => (w?.crewMember?._id || w?.crewMember)?.toString())
          : [];

        return assignedList.includes(memberId.toString()) || workersList.includes(memberId.toString());
      })
      .map((r) => {
        const range = getTimeRange(r.scheduledTime || r.time, r.durationHours, r.duration);
        return {
          reqId: r._id,
          title: r.title,
          timeStr: r.scheduledTime || r.time,
          range,
        };
      })
      .filter((b) => b.range !== null);

    return getMergedBookedRanges(rawBookings);
  };

  const getCrewAvailability = (memberId, currentSlotId) => {
    if (!memberId) return { available: true, reason: "" };

    const alreadyChosenInOtherSlot = Object.entries(slotAssignments).some(
      ([slotId, val]) => slotId !== currentSlotId && val === memberId
    );
    if (alreadyChosenInOtherSlot) {
      return { available: false, reason: "Already selected above" };
    }

    const targetRange = getTimeRange(scheduledTime, request.durationHours, request.duration);
    const mergedBookings = getCrewMemberDayBookings(memberId);
    const conflictingBooking = mergedBookings.find((b) => doTimeRangesOverlap(targetRange, b.range));

    if (conflictingBooking) {
      const busyEnd = formatMinutesTo12Hour(conflictingBooking.range.end);
      return {
        available: false,
        reason: `Busy until ${busyEnd}`,
        freeAtMinutes: conflictingBooking.range.end,
        freeAtString: busyEnd,
      };
    }

    return { available: true, reason: "Available" };
  };

  const assignedCount = Object.values(slotAssignments).filter(Boolean).length;
  const isFullyAssigned = assignedCount === requiredSlots.length;

  const conflictingSlots = Object.entries(slotAssignments)
    .map(([slotId, memberId]) => {
      if (!memberId) return null;
      const status = getCrewAvailability(memberId, slotId);
      if (!status.available) {
        const member = crew.find((m) => m._id === memberId);
        return { slotId, memberId, memberName: member?.name, ...status };
      }
      return null;
    })
    .filter(Boolean);

  const hasConflicts = conflictingSlots.length > 0;

  const applyTimeWindow = (startMin) => {
    const durH = parseDurationHours(request.durationHours, request.duration);
    const durMins = Math.round(durH * 60);
    const startStr = formatMinutesTo12Hour(startMin);
    const endStr = formatMinutesTo12Hour(startMin + durMins);
    setScheduledTime(`${startStr} – ${endStr}`);
  };

  const checkPresetHasConflict = (preset) => {
    const chosenCrewIds = Object.values(slotAssignments).filter(Boolean);
    if (chosenCrewIds.length === 0) return false;

    return chosenCrewIds.some((crewId) => {
      const bookings = getCrewMemberDayBookings(crewId);
      return bookings.some((b) => doTimeRangesOverlap(preset, b.range));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasConflicts) {
      alert("Please resolve technician scheduling conflicts before dispatching.");
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenCrewIds = Object.values(slotAssignments).filter(Boolean);

      const assignedWorkersPayload = requiredSlots.map((slot) => ({
        service: slot.trade,
        crewMember: slotAssignments[slot.id] || null,
      }));

      await onSave({
        status: chosenCrewIds.length > 0 && status === "pending" ? "scheduled" : status,
        assignedCrew: chosenCrewIds,
        assignedWorkers: assignedWorkersPayload,
        scheduledDate,
        scheduledTime,
        dispatchNotes,
      });
      onClose();
    } catch (_) {
      // Handled by alert in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = request.customer?.fullName || "Client";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-muted/50 via-card to-card px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground sm:text-lg">
                Manage &amp; Dispatch Crew
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground font-mono">
                <span>REQ #{request._id.slice(-6).toUpperCase()}</span>
                <span>•</span>
                <span className="capitalize text-primary font-sans font-semibold">
                  {request.urgency} Urgency
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 sm:space-y-5 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 text-sm">
          
          {/* Customer Summary Card */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-gradient-to-br from-surface to-surface/40 p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {request.customer?.profilePic ? (
                  <img
                    src={request.customer.profilePic}
                    alt={customerName}
                    className="size-9 sm:size-10 rounded-full border border-border object-cover ring-2 ring-primary/20 shrink-0"
                  />
                ) : (
                  <div className="grid size-9 sm:size-10 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-primary/20 shrink-0">
                    {initials(customerName)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground leading-snug truncate">{customerName}</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{request.customer?.email || "No email"}</p>
                </div>
              </div>

              <div className="self-end sm:self-auto text-right">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Duration
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-primary">
                  <Clock className="size-3" />
                  {request.duration || `${parseDurationHours(request.durationHours, request.duration)} hrs`}
                </span>
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium truncate max-w-[240px] sm:max-w-none">
                <MapPin className="size-3.5 text-primary shrink-0" /> {request.address}, {request.city}
              </span>
              <span className="font-semibold text-foreground">
                Total Workers: <strong className="text-primary">{requiredSlots.length}</strong>
              </span>
            </div>
          </div>

          {/* Appointment & Arrival Window */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" /> Appointment &amp; Arrival Window
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                {formatDateReadable(scheduledDate)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Service Date
                </span>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                  Arrival Window
                </span>
                <input
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="e.g. 2:00 PM – 4:00 PM"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Quick Arrival Slots
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_WINDOWS.map((preset) => {
                  const isSelected = scheduledTime === preset.label;
                  const isConflict = checkPresetHasConflict(preset);

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setScheduledTime(preset.label)}
                      className={`group flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isSelected
                            ? "bg-white"
                            : isConflict
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily Schedule Timeline */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-surface/50 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Daily Schedule Timeline
              </span>
              <span className="text-[10px] text-muted-foreground">8:00 AM — 6:00 PM</span>
            </div>

            <div className="hidden sm:grid grid-cols-5 text-[10px] text-muted-foreground/70 font-mono px-1">
              <span>8:00 AM</span>
              <span>10:30 AM</span>
              <span>1:00 PM</span>
              <span>3:30 PM</span>
              <span className="text-right">6:00 PM</span>
            </div>

            <div className="space-y-2.5">
              {crew.map((m) => {
                const bookings = getCrewMemberDayBookings(m._id);
                const isBusy = bookings.length > 0;
                const latestEnd = isBusy ? bookings[bookings.length - 1].range.end : null;

                return (
                  <div
                    key={m._id}
                    className="rounded-xl border border-border bg-card p-2.5 sm:p-3 shadow-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials(m.name)}
                        </div>
                        <span className="font-bold text-xs text-foreground truncate">{m.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                          {m.role}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                        {!isBusy ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Free All Day
                          </span>
                        ) : (
                          <>
                            {bookings.map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                              >
                                <span className="size-1.5 rounded-full bg-amber-500" />
                                Busy: {formatMinutesTo12Hour(b.range.start)} – {formatMinutesTo12Hour(b.range.end)}
                              </span>
                            ))}

                            {latestEnd && (
                              <button
                                type="button"
                                onClick={() => applyTimeWindow(latestEnd)}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 sm:py-1 text-[10px] font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground shadow-xs cursor-pointer"
                              >
                                <Sparkles className="size-3" /> Set to {formatMinutesTo12Hour(latestEnd)}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                      {isBusy ? (
                        bookings.map((b, idx) => {
                          const leftPct = Math.max(0, Math.min(100, ((b.range.start - 480) / 600) * 100));
                          const widthPct = Math.max(
                            4,
                            Math.min(100 - leftPct, ((b.range.end - b.range.start) / 600) * 100)
                          );

                          return (
                            <div
                              key={idx}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`Busy: ${formatMinutesTo12Hour(b.range.start)} – ${formatMinutesTo12Hour(b.range.end)}`}
                              className="absolute top-0 bottom-0 rounded-full bg-amber-500 shadow-xs"
                            />
                          );
                        })
                      ) : (
                        <div className="h-full w-full bg-emerald-500/30" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technician Assignment */}
          <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-3.5 sm:p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Users className="size-4 text-primary" /> Assign Technicians ({assignedCount}/{requiredSlots.length})
              </label>
              {isFullyAssigned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" /> Ready to Dispatch
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {requiredSlots.length - assignedCount} tech(s) required
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {requiredSlots.map((slot) => {
                const selectedMemberId = slotAssignments[slot.id] || "";
                const selectedMember = crew.find((m) => m._id === selectedMemberId);

                return (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-border/80 bg-surface/50 p-2.5 sm:p-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Wrench className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">{slot.label}</span>
                        {selectedMember && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate block">
                            ✓ {selectedMember.name} ready
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <select
                        value={selectedMemberId}
                        onChange={(e) => handleSlotChange(slot.id, e.target.value)}
                        className="w-full truncate rounded-xl border border-border bg-background pl-3 pr-8 py-2 text-xs font-semibold outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="">-- Choose Technician --</option>
                        {crew.map((m) => {
                          const { available, reason } = getCrewAvailability(m._id, slot.id);
                          const isCurrentlySelected = selectedMemberId === m._id;

                          return (
                            <option
                              key={m._id}
                              value={m._id}
                              disabled={!available && !isCurrentlySelected}
                            >
                              {m.name} ({m.role}) — {isCurrentlySelected ? "Assigned" : available ? "Available" : reason}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasConflicts && (
              <div className="mt-2 space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Scheduling Conflict Detected</span>
                </div>

                {conflictingSlots.map((conf, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-destructive/20">
                    <span>
                      <strong>{conf.memberName}</strong> is {conf.reason.toLowerCase()}.
                    </span>

                    {conf.freeAtMinutes && (
                      <button
                        type="button"
                        onClick={() => applyTimeWindow(conf.freeAtMinutes)}
                        className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                      >
                        ⚡ Shift Arrival to {conf.freeAtString}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status & Dispatch Notes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Request Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold outline-none focus:border-primary cursor-pointer"
              >
                <option value="pending">Pending Review</option>
                <option value="accepted">Accepted</option>
                <option value="scheduled">Scheduled / Dispatched</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Internal Dispatch Notes
              </label>
              <input
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Gate code, parking, tools needed..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasConflicts}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Confirm &amp; Dispatch Crew
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}