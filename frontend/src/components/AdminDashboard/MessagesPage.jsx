// frontend/src/components/adminPages/AdminMessagesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { setAuthTokenGetter } from "../../lib/axios";
import { useAuth } from "@clerk/clerk-react";
import {
  Search,
  Phone,
  Info,
  Paperclip,
  Image as ImageIcon,
  Send,
  BadgeCheck,
  Briefcase,
  Loader2,
  CheckCheck,
  Building2,
  CheckCircle2,
  Clock3,
  XCircle,
  Shield,
  ShieldCheck,
  LifeBuoy,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { AdminShell, Card, useAdminRole } from "../AdminShell";
import { useChatStore } from "../../store/useChatStore";  
import { useAuthStore } from "../../store/useAuthStore";
import { getAllCompanies } from "../../services/api";

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function getAdminRoleConfig(rawRole) {
  const r = (rawRole || "").toLowerCase().trim();

  switch (r) {
    case "super_admin":
      return {
        sidebarLabel: "Super Admin",
        headerLabel: "Super Admin",
        badgeClass:
          "border-purple-200/90 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300",
        iconClass: "text-purple-600 dark:text-purple-400",
        Icon: ShieldCheck,
      };

    case "manager":
    case "platform_manager":
      return {
        sidebarLabel: "Platform Manager",
        headerLabel: "Platform Manager",
        badgeClass:
          "border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
        iconClass: "text-blue-600 dark:text-blue-400",
        Icon: Shield,
      };

    case "auditor":
    case "compliance_auditor":
      return {
        sidebarLabel: "Auditor",
        headerLabel: "Compliance Auditor",
        badgeClass:
          "border-sky-200/90 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
        iconClass: "text-sky-600 dark:text-sky-400",
        Icon: ShieldCheck,
      };

    case "support":
      return {
        sidebarLabel: "Support",
        headerLabel: "Support Specialist",
        badgeClass:
          "border-teal-200/90 bg-teal-50 text-teal-700 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300",
        iconClass: "text-teal-600 dark:text-teal-400",
        Icon: LifeBuoy,
      };

    case "tester":
      return {
        sidebarLabel: "Tester",
        headerLabel: "Inspector / Tester",
        badgeClass:
          "border-amber-200/90 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
        iconClass: "text-amber-600 dark:text-amber-400",
        Icon: Eye,
      };

    default:
      return {
        sidebarLabel: "Platform Manager",
        headerLabel: "Platform Manager",
        badgeClass:
          "border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
        iconClass: "text-blue-600 dark:text-blue-400",
        Icon: Shield,
      };
  }
}

export default function AdminMessagesPage() {
  const { getToken } = useAuth();
  const { canSendMessage, isTester } = useAdminRole();

  const {
    users,
    messages,
    selectedUser,
    isUsersLoading,
    isMessagesLoading,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser, onlineUsers, socket, checkAuth } = useAuthStore();

  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sendingMedia, setSendingMedia] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Dedicated controller for mobile navigation (switching between chat list & conversation)
  const [showChatOnMobile, setShowChatOnMobile] = useState(Boolean(selectedUser));

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 1. Authenticate ONCE on mount
  useEffect(() => {
    let isMounted = true;
    setAuthTokenGetter(() => getToken());

    async function init() {
      try {
        const token = await getToken();
        if (token && checkAuth && isMounted) {
          await checkAuth(token);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch conversations roster
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // 3. Fetch all companies for badge status
  useEffect(() => {
    async function loadCompanies() {
      try {
        const token = await getToken();
        if (!token) return;
        const list = await getAllCompanies("all", token);
        if (Array.isArray(list)) {
          setCompanies(list);
        }
      } catch (err) {
        console.error("Failed to load companies for messaging roster:", err);
      }
    }
    loadCompanies();
  }, []);

  const companyByOwner = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(companies)) return map;
    companies.forEach((c) => {
      const ownerId = c.owner?._id ? String(c.owner._id) : typeof c.owner === "string" ? String(c.owner) : "";
      if (ownerId) map.set(ownerId, c);
      if (c.owner?.email) map.set(c.owner.email.toLowerCase().trim(), c);
      if (c.email) map.set(c.email.toLowerCase().trim(), c);
    });
    return map;
  }, [companies]);

  const getCompanyForUser = (u) => {
    if (!u) return null;
    const uid = String(u._id || "");
    const email = (u.email || "").toLowerCase().trim();

    if (uid && companyByOwner.has(uid)) return companyByOwner.get(uid);
    if (email && companyByOwner.has(email)) return companyByOwner.get(email);
    if (u.company && typeof u.company === "object") return u.company;
    return null;
  };

  const isOwnerUser = (u) => {
    if (!u) return false;
    const c = getCompanyForUser(u);
    if (c) return true;
    if (u.companyRole === "owner" || u.roleType === "owner" || u.memberRole === "owner") return true;
    if (u.role === "company" && (!u.companyRole || u.companyRole === "owner")) return true;
    return false;
  };

  // 4. Auto-select first contact on desktop if none is selected
  useEffect(() => {
    if (!selectedUser && Array.isArray(users) && users.length > 0) {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        setSelectedUser(users[0]);
      }
    }
  }, [users, selectedUser, setSelectedUser]);

  // 5. Fetch messages whenever selectedUser changes
  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      setShowChatOnMobile(true);
    }
  }, [selectedUser?._id, getMessages]);

  // 6. Keep Socket.IO listener alive
  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);
  
  // 7. Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !selectedUser) return;
    const textToSend = draft;
    setDraft("");
    await sendMessage({ text: textToSend });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    setSendingMedia(true);
    const formData = new FormData();
    formData.append("media", file);

    await sendMessage(formData);
    setSendingMedia(false);
    e.target.value = "";
  };

  const userList = Array.isArray(users) ? users : [];
  const filteredUsers = userList.filter((u) => {
    if (!u) return false;
    const query = (search || "").toLowerCase();
    const company = getCompanyForUser(u);
    const companyName = (company?.legalName || u.companyName || "").toLowerCase();
    const name = (u.fullName || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return companyName.includes(query) || name.includes(query) || email.includes(query);
  });

  const renderSidebarBadge = (u) => {
    if (!u) return null;

    if (isOwnerUser(u)) {
      const company = getCompanyForUser(u);
      const status = company?.status || (u.verified ? "verified" : u.status || "pending");

      if (status === "verified") {
        return (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            Owner · Verified
          </span>
        );
      }

      if (status === "rejected") {
        return (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
            <XCircle className="size-3 text-red-600 dark:text-red-400" />
            Owner · Rejected
          </span>
        );
      }

      return (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock3 className="size-3 text-amber-600 dark:text-amber-400" />
          Owner · Unverified
        </span>
      );
    }

    if (u.role === "admin" || u.adminRole) {
      const config = getAdminRoleConfig(u.adminRole);
      const IconComponent = config.Icon;

      return (
        <span
          className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}
        >
          <IconComponent className={`size-3 ${config.iconClass}`} />
          {config.sidebarLabel}
        </span>
      );
    }

    const cRole = u.companyRole || u.roleType || u.memberRole;
    if (cRole) {
      return (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Briefcase className="size-3" />
          Team: {cRole.replace("_", " ").toUpperCase()}
        </span>
      );
    }

    return (
      <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Customer
      </span>
    );
  };

  const renderHeaderBadge = (u) => {
    if (!u) return null;

    if (isOwnerUser(u)) {
      const company = getCompanyForUser(u);
      const status = company?.status || (u.verified ? "verified" : u.status || "pending");

      return (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${
              status === "verified"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : status === "rejected"
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
                : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <Building2 className="size-3 shrink-0" />
            <span>Company Owner</span>
            <span className="opacity-40">•</span>
            {status === "verified" ? (
              <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                Verified
              </span>
            ) : status === "rejected" ? (
              <span className="flex items-center gap-1 font-bold text-red-700 dark:text-red-300">
                <XCircle className="size-3 text-red-600 dark:text-red-400" />
                Rejected
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                <Clock3 className="size-3 text-amber-600 dark:text-amber-400" />
                Unverified (Pending Review)
              </span>
            )}
          </span>

          {company?.legalName && (
            <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Company: <strong className="text-foreground">{company.legalName}</strong>
            </span>
          )}
        </div>
      );
    }

    if (u.role === "admin" || u.adminRole) {
      const config = getAdminRoleConfig(u.adminRole);
      const IconComponent = config.Icon;

      return (
        <span
          className={`mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold ${config.badgeClass}`}
        >
          <IconComponent className={`size-3.5 ${config.iconClass}`} />
          {config.headerLabel}
        </span>
      );
    }

    const cRole = u.companyRole || u.roleType || u.memberRole;
    if (cRole) {
      return (
        <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-foreground">
          <Briefcase className="size-3" />
          Team: {cRole.replace("_", " ").toUpperCase()}
        </span>
      );
    }

    return (
      <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
        <Briefcase className="size-3" />
        Customer Inquiry
      </span>
    );
  };

  const selectedCompany = getCompanyForUser(selectedUser);
  const activeTitle = selectedUser
    ? selectedCompany?.legalName || selectedUser.companyName || selectedUser.fullName || selectedUser.email
    : "";
  
  const activeAvatar =
    selectedUser?.profilePic ||
    selectedCompany?.logoUrl ||
    selectedUser?.companyLogo ||
    selectedUser?.logoUrl ||
    "";

  const isSelectedVerified =
    selectedCompany?.status === "verified" || selectedUser?.verified || selectedUser?.status === "verified";

  return (
    <AdminShell title="Messages" status="Platform Support">
     <Card className="flex flex-1 min-h-0 w-full overflow-hidden p-0 border border-border bg-card shadow-sm">
        
        {/* 1. LEFT THREAD LIST (SIDEBAR) */}
        {/* Visible on desktop always (md:flex); on mobile, visible when showChatOnMobile is false */}
        <div
          className={`flex-col border-r border-border w-full md:w-80 shrink-0 ${
            showChatOnMobile && selectedUser ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages or companies..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isUsersLoading ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading conversations...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active conversations yet.
              </div>
            ) : (
              filteredUsers.map((t) => {
                const isActive = selectedUser?._id === t._id;
                const isOnline = Array.isArray(onlineUsers) && onlineUsers.includes(t._id);
                const company = getCompanyForUser(t);
                const title = company?.legalName || t.companyName || t.fullName || t.email;
                const avatar = t.profilePic || company?.logoUrl || t.companyLogo || t.logoUrl;

                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(t);
                      setShowChatOnMobile(true);
                    }}
                    className={`flex w-full gap-3 border-l-2 px-3 py-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "border-l-primary bg-sidebar-accent"
                        : "border-l-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="size-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                          {initials(title)}
                        </div>
                      )}
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-sm font-semibold">{title}</p>
                        {renderSidebarBadge(t)}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.email || "Click to chat"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. RIGHT ACTIVE CONVERSATION PANE */}
        {/* On desktop: ALWAYS visible (md:flex). On mobile: visible when showChatOnMobile is true */}
        <div
          className={`min-w-0 flex-1 flex-col bg-surface/40 ${
            showChatOnMobile && selectedUser ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedUser ? (
            <>
              {/* Header with Mobile Back Arrow */}
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
                {/* Back Arrow button (Mobile only) */}
                <button
                  type="button"
                  onClick={() => setShowChatOnMobile(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden cursor-pointer"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="size-5" />
                </button>

                {activeAvatar ? (
                  <img
                    src={activeAvatar}
                    alt=""
                    className="size-9 sm:size-10 rounded-full object-cover border border-border shadow-xs shrink-0"
                  />
                ) : (
                  <div className="grid size-9 sm:size-10 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground shrink-0">
                    {initials(activeTitle)}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-bold text-sm sm:text-base truncate">
                    <span className="truncate">{activeTitle}</span>
                    {isSelectedVerified && (
                      <BadgeCheck className="size-4 text-emerald-600 shrink-0" title="Verified Contractor Company" />
                    )}
                  </p>
                  {renderHeaderBadge(selectedUser)}
                </div>

                <div className="ml-auto flex items-center gap-2.5 sm:gap-3 text-muted-foreground shrink-0">
                  <Phone className="size-4 sm:size-[18px] cursor-pointer hover:text-foreground" />
                  <Info className="size-4 sm:size-[18px] cursor-pointer hover:text-foreground" />
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 space-y-4 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5">
                <p className="text-center text-[11px] sm:text-xs text-muted-foreground">Conversation History</p>

                {isMessagesLoading ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading messages...
                  </div>
                ) : !Array.isArray(messages) || messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No messages yet. Send a message to get started.
                  </div>
                ) : (
                  messages.map((m) => {
                    if (!m) return null;
                    const senderIdStr =
                      typeof m.senderId === "object" && m.senderId !== null
                        ? String(m.senderId._id || m.senderId.id || "")
                        : String(m.senderId || "");

                    const authUserIdStr = authUser?._id ? String(authUser._id) : "";
                    const selectedUserIdStr = selectedUser?._id ? String(selectedUser._id) : "";

                    const isMe = authUserIdStr
                      ? senderIdStr === authUserIdStr
                      : selectedUserIdStr
                      ? senderIdStr !== selectedUserIdStr
                      : false;

                    const formattedTime = new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return !isMe ? (
                      /* Incoming Message (LEFT side - Client/Contractor) */
                      <div key={m._id} className="flex max-w-[85%] sm:max-w-[75%] items-end gap-2">
                        {activeAvatar ? (
                          <img
                            src={activeAvatar}
                            alt=""
                            className="size-6 shrink-0 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                            {initials(activeTitle)}
                          </div>
                        )}
                        <div>
                          {m.mediaUrl && (
                            <img
                              src={m.mediaUrl}
                              alt="Media attachment"
                              className="mb-1 max-h-60 rounded-xl object-cover shadow-sm"
                            />
                          )}
                          {m.text && (
                            <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm shadow-card break-words">
                              {m.text}
                            </div>
                          )}
                          <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">{formattedTime}</p>
                        </div>
                      </div>
                    ) : (
                      /* Outgoing Message (RIGHT side - Admin) */
                      <div key={m._id} className="ml-auto flex max-w-[85%] sm:max-w-[75%] flex-col items-end">
                        {m.mediaUrl && (
                          <img
                            src={m.mediaUrl}
                            alt="Media attachment"
                            className="mb-1 max-h-60 rounded-xl object-cover shadow-sm"
                          />
                        )}
                        {m.text && (
                          <div className="rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-primary-foreground break-words">
                            {m.text}
                          </div>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
                          {formattedTime} {m.read ? <CheckCheck className="size-3.5 text-primary" /> : "✓"}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Form Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 sm:gap-3 border-t border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingMedia}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer p-1"
                  title="Attach file"
                >
                  <Paperclip className="size-4.5 sm:size-5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingMedia}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer p-1"
                  title="Attach image"
                >
                  <ImageIcon className="size-4.5 sm:size-5" />
                </button>

                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={sendingMedia ? "Uploading attachment..." : "Type a message..."}
                  disabled={sendingMedia}
                  className="flex-1 rounded-full border border-border bg-surface px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={sendingMedia || !draft.trim()}
                  className="grid size-9 sm:size-10 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Send className="size-3.5 sm:size-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </Card>
    </AdminShell>
  );
}