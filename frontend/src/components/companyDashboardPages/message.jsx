// frontend/src/components/companyDashboardPages/message.jsx
import { useEffect, useRef, useState } from "react";
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
  Shield,
  ShieldCheck,
  Eye,
  User,
  HardHat,
  ArrowLeft,
} from "lucide-react";

import { Card, WorkspaceShell } from "../WorkspaceShell";
import { initials } from "../../lib/workspace-store";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";

function getParticipantBadge(u) {
  if (!u) return null;

  if (u.role === "admin" || u.adminRole) {
    const aRole = (u.adminRole || "").toLowerCase();
    if (aRole === "super_admin") {
      return {
        label: "Super Admin",
        badgeClass:
          "border-purple-200/90 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300",
        Icon: ShieldCheck,
      };
    }
    return {
      label: "Platform Support",
      badgeClass:
        "border-blue-200/90 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
      Icon: Shield,
    };
  }

  if (u.companyRole === "owner" || (u.role === "company" && !u.companyRole)) {
    return {
      label: "Company Owner",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      Icon: Building2,
    };
  }

  const cRole = (u.companyRole || u.roleType || u.memberRole || "").toLowerCase();
  if (cRole === "manager") {
    return {
      label: "Manager",
      badgeClass:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
      Icon: Shield,
    };
  }
  if (cRole === "auditor") {
    return {
      label: "Auditor",
      badgeClass:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
      Icon: ShieldCheck,
    };
  }
  if (cRole === "tester") {
    return {
      label: "Tester",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
      Icon: Eye,
    };
  }
  if (cRole === "field_crew") {
    return {
      label: "Field Crew",
      badgeClass:
        "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300",
      Icon: HardHat,
    };
  }

  return {
    label: "Customer",
    badgeClass: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: User,
  };
}

export default function MessagesPage() {
  const { getToken } = useAuth();

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

  // 2. Fetch sidebar users/conversations on mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // 3. Auto-select first contact on desktop if none selected
  useEffect(() => {
    if (!selectedUser && Array.isArray(users) && users.length > 0) {
      // Auto-select on desktop; on mobile, keep list visible by default
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        setSelectedUser(users[0]);
      }
    }
  }, [users, selectedUser, setSelectedUser]);

  // 4. Fetch messages from DB whenever selectedUser changes
  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      setShowChatOnMobile(true);
    }
  }, [selectedUser?._id, getMessages]);

  // 5. Keep Socket.IO listener continuously active
  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  // 6. Auto-scroll on new messages
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
    const name = (u.companyName || u.fullName || u.email || "").toLowerCase();
    return name.includes(query);
  });

  const activeTitle = selectedUser
    ? selectedUser.companyName || selectedUser.fullName || selectedUser.email
    : "";

  const activeAvatar =
    selectedUser?.profilePic ||
    selectedUser?.companyLogo ||
    selectedUser?.logoUrl ||
    "";

  const activeBadge = getParticipantBadge(selectedUser);

  return (
    <WorkspaceShell title="Messages" status="Live Dispatch">
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
                placeholder="Search messages..."
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
                const title = t.companyName || t.fullName || t.email;
                const avatar = t.profilePic || t.companyLogo || t.logoUrl;
                const badge = getParticipantBadge(t);
                const BadgeIcon = badge?.Icon || Briefcase;

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
                        {badge && (
                          <span
                            className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.badgeClass}`}
                          >
                            <BadgeIcon className="size-2.5" />
                            {badge.label}
                          </span>
                        )}
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
                    alt={activeTitle}
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
                    {selectedUser.verified && <BadgeCheck className="size-4 text-emerald-600 shrink-0" />}
                  </p>

                  {/* Header Badge */}
                  {activeBadge && (
                    <span
                      className={`mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${activeBadge.badgeClass}`}
                    >
                      <activeBadge.Icon className="size-3 shrink-0" />
                      <span className="truncate">{activeBadge.label}</span>
                    </span>
                  )}
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
                      /* Incoming Message (LEFT side - Client/Crew) */
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
                      /* Outgoing Message (RIGHT side - You) */
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
    </WorkspaceShell>
  );
}