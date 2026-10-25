// frontend/src/components/WorkspaceShell.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import {
  LayoutGrid,
  Inbox,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  LifeBuoy,
  LogOut,
  Eye,
  Store,
  ShieldCheck,
  Shield,
  Briefcase,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { useWorkspace } from "../lib/workspace-store";
import { setAuthTokenGetter } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router";

export function useCompanyRole() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { crew } = useWorkspace();
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function loadRole() {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch("/api/companies/me/status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.memberRole) {
            setRole(data.memberRole);
            return;
          }
        }

        const authRes = await fetch("/api/auth/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData?.companyRole) {
            setRole(authData.companyRole);
          } else if (authData?.role === "company") {
            setRole("owner");
          }
        }
      } catch (err) {
        console.error("Error loading company role:", err);
      }
    }
    loadRole();
  }, [getToken]);

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()?.trim();
  const memberAssignment = crew?.find(
    (m) => m.email?.toLowerCase()?.trim() === userEmail
  );

  const resolvedRole =
    memberAssignment?.roleType ||
    (role && role !== "company" ? role : null) ||
    "owner";

  const isFieldCrew = resolvedRole === "field_crew";
  const isManager = resolvedRole === "manager" || resolvedRole === "company_manager";
  const isAuditor = resolvedRole === "auditor" || resolvedRole === "company_auditor";
  const isTester = resolvedRole === "tester" || resolvedRole === "company_tester";
  const isOwner = !isFieldCrew && !isManager && !isAuditor && !isTester;

  const hasFullAccess = isOwner || isManager;

  return {
    role: resolvedRole,
    isOwner,
    isManager,
    isAuditor,
    isTester,
    isFieldCrew,
    hasFullAccess,

    canAccessDashboard: hasFullAccess || isTester,
    canAccessRequests: hasFullAccess || isAuditor || isTester,
    canAccessMessages: true,
    canAccessTeam: hasFullAccess || isTester,
    canAccessCompanyPage: hasFullAccess || isTester,
    canAccessAnalytics: hasFullAccess || isTester,
    canAccessSettings: hasFullAccess || isTester,

    canManageTeam: hasFullAccess,
    canDispatch: hasFullAccess || isAuditor,
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
            {item.tag && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">
                {item.tag}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceShell({ title, status, actions, children }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { pathname } = useLocation();
  const { pendingRequestsCount, company } = useWorkspace();
  const { getToken } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Unread Count & Background Socket Listener for Contractor Dashboard
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

  // Keep live message listener active globally in contractor workspace
  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
  }, [socket, subscribeToMessages]);

  const {
    isOwner,
    isManager,
    isAuditor,
    isTester,
    isFieldCrew,
    canAccessDashboard,
    canAccessRequests,
    canAccessMessages,
    canAccessTeam,
    canAccessCompanyPage,
    canAccessAnalytics,
    canAccessSettings,
  } = useCompanyRole();

  if (isFieldCrew && pathname !== "/company-dashboard/messages") {
    return <Navigate to="/company-dashboard/messages" replace />;
  }

  if (
    isAuditor &&
    pathname !== "/company-dashboard/requests" &&
    pathname !== "/company-dashboard/messages"
  ) {
    return <Navigate to="/company-dashboard/requests" replace />;
  }

  if (!canAccessDashboard && pathname === "/company-dashboard") {
    return (
      <Navigate
        to={isAuditor ? "/company-dashboard/requests" : "/company-dashboard/messages"}
        replace
      />
    );
  }

  const mainNav = [
    ...(canAccessDashboard
      ? [{ title: "Dashboard", to: "/company-dashboard", icon: LayoutGrid }]
      : []),
    ...(canAccessRequests
      ? [
          {
            title: isAuditor ? "Dispatch & Requests" : "Customer Requests",
            to: "/company-dashboard/requests",
            icon: Inbox,
            badge: pendingRequestsCount > 0 ? String(pendingRequestsCount) : null,
          },
        ]
      : []),
    ...(canAccessMessages
      ? [
          {
            title: "Messages",
            to: "/company-dashboard/messages",
            icon: MessageSquare,
            badge: unreadTotal > 0 ? String(unreadTotal) : null,
          },
        ]
      : []),
    ...(canAccessTeam
      ? [
          {
            title: isOwner || isManager ? "Crews & Dispatch" : "Team Roster",
            to: "/company-dashboard/team",
            icon: Users,
          },
        ]
      : []),
  ];

  const presenceNav = [
    ...(canAccessCompanyPage
      ? [
          {
            title: "Company Page",
            to: "/company-dashboard/company-page",
            icon: Store,
            tag: "Live",
          },
        ]
      : []),
    ...(canAccessAnalytics
      ? [
          {
            title: "Analytics & Leads",
            to: "/company-dashboard/analytics",
            icon: BarChart3,
          },
        ]
      : []),
    ...(canAccessSettings
      ? [{ title: "Settings", to: "/company-dashboard/settings", icon: Settings }]
      : []),
  ];

  const roleDisplay = isFieldCrew
    ? { label: "Field Crew", color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-600" }
    : isManager
    ? { label: "Manager", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-600" }
    : isAuditor
    ? { label: "Auditor", color: "text-sky-600 dark:text-sky-400", dot: "bg-sky-600" }
    : isTester
    ? { label: "Tester", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-600" }
    : { label: "Company Owner", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-600" };

  const userInitials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ||
    user?.firstName?.[0]?.toUpperCase() ||
    "U";

  // Reusable Sidebar Navigation Content
  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4 lg:px-6 lg:py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            {company?.name?.slice(0, 1) || "L"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-foreground">
              {company?.name || "LaborConnect"}
            </p>
            <p className="text-xs text-muted-foreground">Contractor Workspace</p>
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
              alt={user.fullName || "User Profile"}
              className="size-9 shrink-0 rounded-lg object-cover border border-sidebar-border"
            />
          ) : (
            <div className="grid size-9 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
              {userInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Team Member"}
            </p>

            <p className={`flex items-center gap-1.5 text-xs font-semibold ${roleDisplay.color}`}>
              <span className={`size-1.5 rounded-full ${roleDisplay.dot}`} /> {roleDisplay.label}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4">
        <NavLinks items={mainNav} onItemClick={() => setMobileMenuOpen(false)} />
        {presenceNav.length > 0 && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Public Presence
            </p>
            <NavLinks items={presenceNav} onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-sidebar-border p-4 shrink-0 mt-auto">
        {!isFieldCrew && !isAuditor && (
          <div className="rounded-xl bg-accent/60 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <Eye className="size-4" /> Profile Strength: 95%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Public page is published and receiving customer traffic.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer
          "
           onClick={() => navigate("/support")}
           >
            <LifeBuoy className="size-4 cursor-pointer"
             onClick={() => navigate("/support")} /> Help Center
          </span>
          <button
            type="button"
             onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs sm:text-sm transition-colors hover:text-destructive cursor-pointer"
          >
            <LogOut className="size-4" /> Exit
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Fixed Sidebar (lg+) - Never scrolls with main content */}
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
            <span>Inspector / Tester Mode: You have full read-only inspection access. All write/dispatch actions are disabled.</span>
          </div>
        )}

        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 sm:px-5 sm:py-4 backdrop-blur md:px-8 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
              aria-label="Open Workspace Menu"
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

          <div className="flex flex-wrap items-center gap-2">{actions}</div>
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