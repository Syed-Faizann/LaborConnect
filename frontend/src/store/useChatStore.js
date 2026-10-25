// frontend/src/store/useChatStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useChatStore = create(
  persist(
    (set, get) => ({
      users: [],
      conversations: [],
      messages: [],
      selectedUser: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      composerText: "",
      isSoundEnabled: true,
      isSendingMedia: false,
      unreadTotal: 0, // ✅ Direct unread count for badges

      // Fetch the global unread count directly from DB
      fetchUnreadCount: async () => {
        try {
          const res = await axiosInstance.get("/messages/unread-count");
          if (typeof res.data?.count === "number") {
            set({ unreadTotal: res.data.count });
          }
        } catch (_) {}
      },

      getUsers: async () => {
        if (!Array.isArray(get().users) || get().users.length === 0) {
          set({ isUsersLoading: true });
        }

        try {
          const res = await axiosInstance.get("/messages/users");
          const userList = Array.isArray(res.data) ? res.data : [];

          set((state) => {
            const currentSelected = state.selectedUser;
            const updatedSelected = currentSelected
              ? userList.find((u) => String(u._id) === String(currentSelected._id)) || currentSelected
              : userList[0] || null;

            return {
              users: userList,
              selectedUser: updatedSelected,
            };
          });

          // Also refresh the total count
          get().fetchUnreadCount();
        } catch (error) {
          console.error("Error in getUsers:", error.message);
          set({ users: [] });
        } finally {
          set({ isUsersLoading: false });
        }
      },

      setSelectedUser: (user) => {
        if (!user) return;

        set((state) => ({
          selectedUser: user,
          messages: [],
          users: (state.users || []).map((u) =>
            String(u._id) === String(user._id) ? { ...u, unreadCount: 0 } : u
          ),
        }));

        get().getMessages(user._id);
        // Recalculate after marking messages as read
        setTimeout(() => get().fetchUnreadCount(), 600);
      },

      getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: Array.isArray(res.data) ? res.data : [] });
          // Messages are now marked read on backend, update count
          get().fetchUnreadCount();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to load messages");
          set({ messages: [] });
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser?._id) return false;

        try {
          const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

          set((state) => {
            const currentMessages = Array.isArray(state.messages) ? state.messages : [];
            if (String(state.selectedUser?._id) === String(selectedUser._id)) {
              return { messages: [...currentMessages, res.data], composerText: "" };
            }
            return { composerText: "" };
          });

          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message");
          return false;
        }
      },

      subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");

        socket.on("newMessage", (newMessage) => {
          const { selectedUser, messages } = get();

          const isChatWithActiveContact =
            selectedUser &&
            (String(newMessage.senderId) === String(selectedUser._id) ||
             String(newMessage.receiverId) === String(selectedUser._id));

          // 1. If currently in this active chat, append message
          if (isChatWithActiveContact) {
            const currentMessages = Array.isArray(messages) ? messages : [];
            const alreadyExists = currentMessages.some((m) => String(m._id) === String(newMessage._id));
            if (!alreadyExists) {
              set({ messages: [...currentMessages, newMessage] });
            }
          } else {
            // 2. If on dashboard or another chat, increment the badge count immediately!
            set((state) => ({ unreadTotal: state.unreadTotal + 1 }));
          }

          // Sync contact sidebar list
          get().getUsers();
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket?.off("newMessage");
      },

      setComposerText: (composerText) => set({ composerText }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
    }
  )
);