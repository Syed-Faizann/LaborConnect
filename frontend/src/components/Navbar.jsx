// frontend/src/components/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/clerk-react";
import {
  Bell,
  CheckCheck,
  CircleUser,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldAlert,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api";
import { setAuthTokenGetter } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const navLinks = [
  { label: "Services", path: "/marketplace", matchPrefixes: ["/marketplace", "/companies"] },
  { label: "About", path: "/about", matchPrefixes: ["/about"] },
  { label: "Contact & Support", path: "/support", matchPrefixes: ["/support"] }
];

export default function Navbar({ dbUser: propDbUser }) {
  const { signOut, openUserProfile, openSignIn, openSignUp } = useClerk();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fallback to useAuthStore or user metadata if propDbUser wasn't passed
  const { socket, checkAuth, dbUser: storeDbUser } = useAuthStore();
  const dbUser = propDbUser || storeDbUser;

  const avatarUrl = dbUser?.profilePic || user?.imageUrl;

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Live Unread Message Count
  const { unreadTotal, fetchUnreadCount, subscribeToMessages } = useChatStore();

  useEffect(() => {
    let isMounted = true;
    setAuthTokenGetter(() => getToken());

    async function init() {
      try {
        const token = await getToken();
        if (token && isMounted) {
          if (checkAuth) await checkAuth(token);
          if (fetchUnreadCount) await fetchUnreadCount();
        }
      } catch (_) {}
    }
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
  }, [socket, subscribeToMessages]);

  const fetchNotifs = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getMyNotifications(token);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        const token = await getToken();
        await markNotificationAsRead(notif._id, token);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (_) {}
    }
    setNotifOpen(false);
    navigate(`/notifications?id=${notif._id}`);
  };

  function isActive(link) {
    if (link.path === "/about") return location.pathname === "/about";
    if (!link.matchPrefixes) return location.pathname === link.path;
    return link.matchPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  }

  const recentNotifications = notifications.slice(0, 3);
  const remainingCount = notifications.length - 3;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-3 sm:px-6 md:px-10">
        
        {/* Left Side: Brand Logo + Desktop Nav */}
        <div className="flex items-center gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center transition-opacity hover:opacity-90 cursor-pointer shrink-0"
          >
            <span className="font-display text-xl sm:!text-2xl md:text-[26px] font-bold tracking-tight text-primary leading-none">
              LaborConnect
            </span>
          </button>

          {/* Navigation Links (Desktop) */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`font-sans text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "font-bold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isSignedIn ? (
            <div className="flex items-center gap-1.5 sm:gap-3 text-muted-foreground">
              
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  className="relative rounded-lg p-1.5 sm:p-2 transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Notifications"
                  onClick={() => setNotifOpen((prev) => !prev)}
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifOpen && (
                  <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                        >
                          <CheckCheck className="size-3.5" /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                      {recentNotifications.length > 0 ? (
                        recentNotifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 transition-colors cursor-pointer hover:bg-muted ${
                              !n.isRead ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-xs text-foreground line-clamp-1">
                                {n.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(n.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No notifications yet.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border bg-surface p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/notifications");
                        }}
                        className="w-full text-xs font-semibold text-primary hover:underline py-1 cursor-pointer"
                      >
                        View All Notifications & News {remainingCount > 0 ? `(+${remainingCount} more)` : ""} →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Routing: Company Dashboard / Admin / Customer Messages */}
              {dbUser?.role === "company" ? (
                <button
                  type="button"
                  onClick={() => navigate("/company-dashboard")}
                  className="relative flex items-center justify-center rounded-lg p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:border sm:border-border sm:bg-card cursor-pointer"
                  title="Company Dashboard"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden flex items-center">
                    <LayoutDashboard className="size-5" />
                  </span>
                  {unreadTotal > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadTotal > 9 ? "9+" : unreadTotal}
                    </span>
                  )}
                </button>
              ) : dbUser?.role === "admin" ? (
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="relative flex items-center justify-center rounded-lg p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:border sm:border-border sm:bg-card cursor-pointer"
                  title="Admin Panel"
                >
                  <span className="hidden sm:inline">Admin Panel</span>
                  <span className="sm:hidden flex items-center">
                    <ShieldAlert className="size-5" />
                  </span>
                  {unreadTotal > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadTotal > 9 ? "9+" : unreadTotal}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/messages")}
                  className="relative p-1.5 sm:p-2 transition-colors hover:text-primary cursor-pointer"
                  aria-label="Messages"
                  title="Customer Messages"
                >
                  <MessageSquare className="size-5" />
                  {unreadTotal > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadTotal > 9 ? "9+" : unreadTotal}
                    </span>
                  )}
                </button>
              )}

              {/* Profile Avatar & Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="flex items-center justify-center overflow-hidden rounded-full transition-opacity hover:opacity-80 cursor-pointer"
                  aria-label="Account"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={dbUser?.fullName || user?.fullName || "Profile"}
                      className="size-7 sm:size-8 rounded-full object-cover"
                    />
                  ) : (
                    <CircleUser className="size-6" />
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 rounded-xl border border-border bg-card py-2 shadow-xl z-50">
                    {dbUser?.fullName && (
                      <div className="border-b border-border px-4 py-2">
                        <p className="truncate text-sm font-medium text-foreground">{dbUser.fullName}</p>
                        {dbUser?.email && (
                          <p className="truncate text-xs text-muted-foreground">{dbUser.email}</p>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setMenuOpen(false);
                        openUserProfile();
                      }}
                    >
                      Manage account
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => openSignIn()}
                className="px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:text-primary cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openSignUp()}
                className="px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:underline cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={() => navigate("/marketplace")}
            className="hidden sm:inline-flex rounded-lg bg-primary px-3 sm:px-4 py-1.5 sm:py-2 font-display text-xs sm:text-sm font-medium tracking-[0.05em] text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer shadow-sm shrink-0"
          >
            Find Pros
          </button>

          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate(item.path);
                }}
                className={`py-2 text-left font-sans text-sm font-medium ${
                  isActive(item) ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                navigate("/marketplace");
              }}
              className="mt-1 w-full rounded-lg bg-primary py-2.5 text-center font-display text-sm font-medium tracking-[0.05em] text-primary-foreground sm:hidden"
            >
              Find Pros
            </button>

            {!isSignedIn && (
              <div className="mt-2 flex gap-3 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    openSignIn();
                  }}
                  className="text-sm font-semibold text-foreground py-1"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    openSignUp();
                  }}
                  className="text-sm font-semibold text-primary py-1"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}