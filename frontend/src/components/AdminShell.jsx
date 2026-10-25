// frontend/src/components/AdminShell.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import {
  LayoutGrid,
  Building2,
  TrendingUp,
  MessageSquare,
  Users,
  Settings,
  LifeBuoy,
  LogOut,
  Bell,
  ShieldCheck,
  Eye,
  Menu,
  X,
} from "lucide-react";
import { syncUserAuth } from "../services/api";
import { setAuthTokenGetter } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

let cachedRole = null;
const roleListeners = new Set();

function setGlobalAdminRole(role) {
  cachedRole = role;
  roleListeners.forEach((listener) => listener(role));
}

export function useAdminRole() {
  const { getToken } = useAuth();
  const [role, setRole] = useState(cachedRole || "super_admin");

  useEffect(() => {
    roleListeners.add(setRole);
    return () => roleListeners.delete(setRole);
  }, []);

  useEffect(() => {
    async function resolveRole() {
      try {
        const token = await getToken();
        if (!token) return;

        const synced = await syncUserAuth(token).catch(() => null);
        if (synced?.adminRole) {
          setGlobalAdminRole(synced.adminRole);
          return;
        }

        const res = await fetch("/api/auth/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGlobalAdminRole(data.adminRole || "super_admin");
        }
      } catch (_) {
        setGlobalAdminRole("super_admin");
      }
    }
    resolveRole();
  }, [getToken]);

  const isSuperAdmin = !role || role === "super_admin";
  const isPlatformManager = role === "manager";
  const isAuditor = role === "auditor" || role === "compliance_auditor";
  const isSupport = role === "support";
  const isTester = role === "tester";

  const hasFullAccess = isSuperAdmin || isPlatformManager;

  return {
    adminRole: role || "super_admin",
    isSuperAdmin,
    isPlatformManager,
    isAuditor,
    isSupport,
    isTester,

    canAccessDashboard: hasFullAccess || isTester,
    canAccessCompanies: hasFullAccess || isAuditor || isTester,
    canAccessRevenue: hasFullAccess || isTester,
    canAccessMessages: true,
    canAccessTeam: hasFullAccess || isTester,
    canAccessNotifications: hasFullAccess || isTester,
    canAccessSettings: hasFullAccess || isTester,
    canAccessHelp: hasFullAccess || isSupport || isTester,

    canManageTeam: hasFullAccess,
    canManageSettings: hasFullAccess,
    canBroadcast: hasFullAccess,
    canDeleteBroadcast: hasFullAccess,

    canApproveCompanies: (hasFullAccess || isAuditor) && !isTester,
    canSendMessage: true,
    isReadOnly: isTester,
  };
}

function NavLinks({ items, onItemClick }) {
  const { pathname } = useLocation();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ title, status, actions, children }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { pathname } = useLocation();
  const { getToken } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real-time unread messages & socket setup for Admin Dashboard
  const { unreadTotal, fetchUnreadCount, subscribeToMessages } = useChatStore();
  const { socket, checkAuth } = useAuthStore();

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

  // Keep live message listener active globally in Admin workspace
  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
  }, [socket, subscribeToMessages]);

  const {
    isSuperAdmin,
    isPlatformManager,
    isAuditor,
    isSupport,
    isTester,
    canAccessDashboard,
    canAccessCompanies,
    canAccessRevenue,
    canAccessMessages,
    canAccessTeam,
    canAccessNotifications,
    canAccessSettings,
    canAccessHelp,
  } = useAdminRole();

  if (isAuditor && pathname !== "/admin/companies" && pathname !== "/admin/messages") {
    return <Navigate to="/admin/companies" replace />;
  }

  if (isSupport && pathname !== "/admin/messages" && pathname !== "/admin/help") {
    return <Navigate to="/admin/messages" replace />;
  }

  const mainNav = [
    ...(canAccessDashboard ? [{ title: "Dashboard", to: "/admin", icon: LayoutGrid }] : []),
    ...(canAccessCompanies ? [{ title: "Companies", to: "/admin/companies", icon: Building2 }] : []),
    ...(canAccessRevenue ? [{ title: "Revenue & Fees", to: "/admin/revenue", icon: TrendingUp }] : []),
    ...(canAccessMessages
      ? [
          {
            title: "Messages",
            to: "/admin/messages",
            icon: MessageSquare,
            badge: unreadTotal > 0 ? String(unreadTotal) : null,
          },
        ]
      : []),
    ...(canAccessTeam ? [{ title: "Admin Team", to: "/admin/team", icon: Users }] : []),
  ];

  const presenceNav = [
    ...(canAccessNotifications ? [{ title: "Notifications", to: "/admin/notifications", icon: Bell }] : []),
    ...(canAccessSettings ? [{ title: "Settings", to: "/admin/settings", icon: Settings }] : []),
    ...(canAccessHelp ? [{ title: "Help Center", to: "/admin/help", icon: LifeBuoy }] : []),
  ];

  const roleDisplay = isSuperAdmin
    ? { label: "Super Admin", color: "text-purple-600 dark:text-purple-400", dot: "bg-purple-600" }
    : isPlatformManager
    ? { label: "Platform Manager", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-600" }
    : isAuditor
    ? { label: "Compliance Auditor", color: "text-sky-600 dark:text-sky-400", dot: "bg-sky-600" }
    : isSupport
    ? { label: "Support Specialist", color: "text-teal-600 dark:text-teal-400", dot: "bg-teal-600" }
    : { label: "Inspector / Tester", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-600" };

  const userInitials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ||
    user?.firstName?.[0]?.toUpperCase() ||
    "A";

  // Reusable Sidebar Content
  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4 lg:px-6 lg:py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight truncate lg:text-lg">LaborConnect</p>
            <p className="text-xs text-muted-foreground">Admin Workspace</p>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-3 lg:py-4 shrink-0">
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-surface px-3 py-3 shadow-xs">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "Admin"}
              className="size-9 shrink-0 rounded-lg border border-sidebar-border object-cover"
            />
          ) : (
            <div className="grid size-9 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground shrink-0">
              {userInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Administrator"}
            </p>
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${roleDisplay.color}`}>
              <span className={`size-1.5 rounded-full ${roleDisplay.dot}`} /> {roleDisplay.label}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4">
        {mainNav.length > 0 && (
          <NavLinks items={mainNav} onItemClick={() => setMobileMenuOpen(false)} />
        )}
        {presenceNav.length > 0 && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </p>
            <NavLinks items={presenceNav} onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-sidebar-border p-4 shrink-0 mt-auto">
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          {canAccessHelp ? (
            <Link
              to="/admin/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <LifeBuoy className="size-4" /> Help Center
            </Link>
          ) : (
            <span />
          )}  
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Fixed Sidebar (lg+) - Never scrolls with content */}
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative flex h-full w-full max-w-xs flex-col bg-sidebar border-r border-sidebar-border shadow-2xl">
            {renderSidebarContent(true)}
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Workspace Pane (Independently scrollable) */}
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-y-auto">
        {isTester && (
          <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 text-center shrink-0">
            <Eye className="size-4 shrink-0" />
            <span>Inspector / Tester Mode: Read-only inspection for system settings. Live messaging and chat dispatch are enabled.</span>
          </div>
        )}

        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 sm:px-5 sm:py-4 backdrop-blur md:px-8 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
              aria-label="Open Admin Menu"
            >
              <Menu className="size-5" />
            </button>

            <h1 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl truncate">{title}</h1>

            {status && (
              <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-300 shrink-0">
                {status}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>
        </header>

      <main className="flex-1 flex flex-col min-h-0 px-2.5 py-2.5 sm:px-6 sm:py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-card ${className}`}>
      {children}
    </div>
  );
}