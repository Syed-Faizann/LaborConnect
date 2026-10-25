// frontend/src/pages/NotificationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  CheckCheck,
  CheckCircle2,
  HardHat,
  Info,
  LifeBuoy,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../services/api";

export default function NotificationsPage({ dbUser }) {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedId = searchParams.get("id");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await getMyNotifications(token);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const selectedNotification = useMemo(() => {
    if (!selectedId) return null;
    return notifications.find((n) => n._id === selectedId) || null;
  }, [selectedId, notifications]);

  const handleSelectNotification = async (notif) => {
    setSearchParams({ id: notif._id });
    if (!notif.isRead) {
      try {
        const token = await getToken();
        await markNotificationAsRead(notif._id, token);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (_) {}
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [notifications, search]);

  const requestUpdates = filtered.filter((n) => n.category === "request_update");
  const announcements = filtered.filter((n) => n.category !== "request_update" || n.isBroadcast);

  function formatDateBlock(dateString) {
    const d = new Date(dateString);
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.toLocaleDateString("en-US", { day: "2-digit" });
    const year = d.getFullYear();
    const full = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return { month, day, year, full };
  }

  // Helper to check if a notification is from a support ticket resolution
  const isTicketNotification = (n) => {
    return (
      n?.link === "/support" ||
      n?.title?.toLowerCase().includes("ticket #") ||
      n?.title?.toLowerCase().includes("support ticket")
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <Navbar dbUser={dbUser} />

      <main className="flex-1 mx-auto w-full max-w-6xl p-3 sm:p-6 md:p-8">
        {selectedNotification ? (
          /* ================= DETAIL VIEW ================= */
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* Header Banner */}
            <div className="flex items-center justify-between bg-primary px-4 py-3 sm:px-6 sm:py-4 text-primary-foreground">
              <h1 className="font-bold text-base sm:text-lg">Notification Detail</h1>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground hover:opacity-80 cursor-pointer"
              >
                ◀ Back
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 sm:pb-4">
                <span className="text-xs text-muted-foreground">
                  Published On:{" "}
                  <strong>{formatDateBlock(selectedNotification.createdAt).full}</strong>
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-primary uppercase">
                  {selectedNotification.category.replace("_", " ")}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                {selectedNotification.title}
              </h2>

              {selectedNotification.imageUrl && (
                <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-muted/20">
                  <img
                    src={selectedNotification.imageUrl}
                    alt={selectedNotification.title}
                    className="max-h-[300px] sm:max-h-[450px] w-full object-cover"
                  />
                </div>
              )}

              {/* Support Ticket Resolution Display */}
              {isTicketNotification(selectedNotification) ? (
                <div className="rounded-xl sm:rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LifeBuoy className="size-4.5 sm:size-5 text-primary shrink-0" />
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary truncate">
                        Support Desk Official Response
                      </h3>
                    </div>
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-primary uppercase shrink-0">
                      Admin Resolution
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap shadow-2xs">
                    {selectedNotification.message}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link
                      to="/support"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Visit Support Desk <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              )}

              {/* Connected Request Card if available */}
              {selectedNotification.relatedRequest && (
                <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Attached Service Request
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Job Title</p>
                      <p className="font-semibold text-sm">{selectedNotification.relatedRequest.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-semibold text-sm">
                        {selectedNotification.relatedRequest.address}, {selectedNotification.relatedRequest.city}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled Date / Time</p>
                      <p className="font-semibold text-sm">
                        {selectedNotification.relatedRequest.date} ({selectedNotification.relatedRequest.time})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span className="inline-block rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
                        {selectedNotification.relatedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= LIST VIEW ================= */
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            
            {/* Left Column: Request Updates */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between bg-primary px-4 py-3 sm:px-6 sm:py-4 text-primary-foreground">
                <h2 className="font-bold text-sm sm:text-base">Request Updates &amp; Activity</h2>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-foreground hover:opacity-80 cursor-pointer"
                >
                  ◀ Back
                </button>
              </div>

              <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <div className="relative flex-1">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search updates..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchNotifs}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin text-primary mb-2" />
                    Loading updates...
                  </div>
                ) : requestUpdates.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No request updates received yet.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {requestUpdates.map((item) => {
                      const date = formatDateBlock(item.createdAt);
                      return (
                        <div
                          key={item._id}
                          onClick={() => handleSelectNotification(item)}
                          className={`flex items-start gap-3 sm:gap-4 py-3 sm:py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${
                            !item.isRead ? "font-bold" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 text-primary shrink-0 w-16 sm:w-20">
                            <div className="text-right">
                              <span className="block text-[11px] sm:text-xs font-bold leading-tight">{date.month} {date.day}</span>
                              <span className="block text-[9px] sm:text-[10px] text-muted-foreground font-medium">{date.year}</span>
                            </div>
                            <div className="h-8 sm:h-9 w-0.5 bg-primary rounded-full" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs leading-snug hover:text-primary transition-colors text-foreground line-clamp-1">
                              {item.title}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 font-normal">
                              {date.full} · {item.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Important Links, Support & Announcements */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between bg-primary px-4 py-3 sm:px-6 sm:py-4 text-primary-foreground">
                <h2 className="font-bold text-sm sm:text-base">Important Links &amp; Notifications</h2>
                {announcements.some((n) => !n.isRead) && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-primary-foreground hover:underline cursor-pointer"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
                {announcements.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No system notices or announcements at this time.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {announcements.map((item) => {
                      const date = formatDateBlock(item.createdAt);
                      const isTicket = isTicketNotification(item);

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleSelectNotification(item)}
                          className={`flex items-start gap-3 sm:gap-4 py-3 sm:py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${
                            !item.isRead ? "bg-primary/5" : ""
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2 shrink-0 w-16 sm:w-20 ${
                              isTicket
                                ? "text-primary"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <div className="text-right">
                              <span className="block text-[11px] sm:text-xs font-bold leading-tight">{date.month} {date.day}</span>
                              <span className="block text-[9px] sm:text-[10px] text-muted-foreground font-medium">{date.year}</span>
                            </div>
                            <div
                              className={`h-8 sm:h-9 w-0.5 rounded-full ${
                                isTicket ? "bg-primary" : "bg-emerald-500"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isTicket && <LifeBuoy className="size-3 text-primary shrink-0" />}
                              <h3 className="text-xs font-semibold leading-snug hover:text-primary transition-colors text-foreground line-clamp-1">
                                {item.title}
                              </h3>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 font-normal">
                              {item.message}
                            </p>
                          </div>

                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="size-9 sm:size-10 shrink-0 rounded-lg border border-border object-cover"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}