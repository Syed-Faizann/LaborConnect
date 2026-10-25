// frontend/src/components/ChatBox.jsx
import { useEffect, useRef, useState } from "react";
import { setAuthTokenGetter } from "../lib/axios";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search,
  Phone,
  Info,
  Paperclip,
  Image as ImageIcon,
  Send,
  BadgeCheck,
  Building2,
  CheckCheck,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function ChatBox({
  placeholder = "Type a message...",
  headerSubtitle = "Active Chat",
}) {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sendingMedia, setSendingMedia] = useState(false);

  // Dedicated state for mobile viewport toggle
  const [showChatOnMobile, setShowChatOnMobile] = useState(Boolean(selectedUser));

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // If a chat is loaded from an external link or profile, show it on mobile
  useEffect(() => {
    if (selectedUser?._id) {
      setShowChatOnMobile(true);
    }
  }, [selectedUser?._id]);

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
        console.error("Auth init error in ChatBox:", err);
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser?._id, getMessages]);

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Combine sidebar contacts and ensure currently selected contact is visible
  const rawList = Array.isArray(users) ? [...users] : [];
  if (selectedUser?._id && !rawList.some((u) => u && String(u._id) === String(selectedUser._id))) {
    rawList.unshift(selectedUser);
  }

  const filteredUsers = rawList.filter((u) => {
    if (!u) return false;
    const query = (search || "").toLowerCase();
    const name = (u.companyName || u.fullName || u.email || "").toLowerCase();
    return name.includes(query);
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser) return;
    const msg = text;
    setText("");
    await sendMessage({ text: msg });
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

  // Guaranteed back-arrow handler: switches to the chat list on mobile
  const handleBackToChatList = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowChatOnMobile(false);
    if (searchParams.get("userId")) {
      navigate("/messages", { replace: true });
    }
  };

  const activeTitle = selectedUser
    ? selectedUser.companyName || selectedUser.fullName || selectedUser.email
    : "";

  const activeAvatar =
    selectedUser?.profilePic ||
    selectedUser?.companyLogo ||
    selectedUser?.logoUrl ||
    "";

  return (
    <div className="flex h-[calc(100dvh-9rem)] sm:h-[calc(100vh-12rem)] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      
      {/* 1. CHAT LIST (SIDEBAR) */}
      {/* On desktop: ALWAYS visible (md:flex). On mobile: visible when showChatOnMobile is false */}
      <div
        className={`flex flex-col border-r border-border w-full md:w-80 shrink-0 ${
          showChatOnMobile && selectedUser ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isUsersLoading && rawList.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-primary" /> Loading chats...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isActive = selectedUser?._id && String(selectedUser._id) === String(u._id);
              const isOnline = Array.isArray(onlineUsers) && onlineUsers.includes(u._id);
              const displayName = u.companyName || u.fullName || u.email;
              const avatar = u.profilePic || u.companyLogo || u.logoUrl;

              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u);
                    setShowChatOnMobile(true);
                  }}
                  className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors cursor-pointer ${
                    isActive ? "border-l-primary bg-sidebar-accent" : "border-l-transparent hover:bg-muted"
                  }`}
                >
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="size-9 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        {initials(displayName)}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {u.companyRole ? `Role: ${u.companyRole}` : u.role}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. ACTIVE CONVERSATION PANE */}
      {/* On desktop: ALWAYS visible (md:flex). On mobile: visible when showChatOnMobile is true */}
      <div
        className={`min-w-0 flex-1 flex-col bg-surface/30 ${
          showChatOnMobile && selectedUser ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
              {/* Back Arrow Button (Mobile only) */}
              <button
                type="button"
                onClick={handleBackToChatList}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden cursor-pointer"
                aria-label="Back to chat list"
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
                  <span className="truncate">{selectedUser.companyName || selectedUser.fullName}</span>
                  {selectedUser.verified && <BadgeCheck className="size-4 text-primary shrink-0" />}
                </p>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Building2 className="size-3 shrink-0" /> {headerSubtitle}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-muted-foreground shrink-0">
                <Phone className="size-4 cursor-pointer hover:text-foreground" />
                <Info className="size-4 cursor-pointer hover:text-foreground" />
              </div>
            </div>

            {/* MESSAGE FEED */}
            <div className="flex-1 space-y-4 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5">
              <p className="text-center text-[11px] sm:text-xs text-muted-foreground">Support &amp; Direct Chat History</p>
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
                    <div key={m._id} className="flex max-w-[85%] sm:max-w-[75%] gap-2 items-end">
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
                          <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm shadow-xs break-words">
                            {m.text}
                          </div>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          {formattedTime}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={m._id} className="ml-auto flex max-w-[85%] sm:max-w-[75%] flex-col items-end">
                      {m.mediaUrl && (
                        <img
                          src={m.mediaUrl}
                          alt="Media attachment"
                          className="mb-1 max-h-60 rounded-xl object-cover shadow-sm"
                        />
                      )}
                      {m.text && (
                        <div className="rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-primary-foreground break-words">
                          {m.text}
                        </div>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {formattedTime} {m.read ? <CheckCheck className="size-3.5 text-primary" /> : "✓"}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* COMPOSER */}
            <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3 border-t border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={sendingMedia ? "Uploading attachment..." : placeholder}
                disabled={sendingMedia}
                className="flex-1 rounded-full border border-border bg-surface px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sendingMedia || !text.trim()}
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
    </div>
  );
}