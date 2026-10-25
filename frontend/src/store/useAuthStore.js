// frontend/src/store/useAuthStore.js
import { create } from "zustand";
import { io } from "socket.io-client";
import { axiosInstance } from "../lib/axios";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async (clerkToken) => {
    set({ isCheckingAuth: true });
    try {
      const headers = clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {};
      const res = await axiosInstance.get("/auth/check", { headers });
      const user = res.data;

      set({ authUser: user });

      if (user?._id) {
        get().connectSocket(user);
      }
    } catch (error) {
      console.error("Error in checkAuth:", error?.response?.data || error.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    if (!user?._id) return;
    if (get().socket?.connected) return;

    if (get().socket) {
      get().socket.disconnect();
    }

    const socket = io(BASE_URL, {
      query: { userId: String(user._id) },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket Connected] Socket ID:", socket.id);
      socket.emit("rejoin", String(user._id));
    });

    socket.on("reconnect", () => {
      console.log("[Socket Reconnected]");
      socket.emit("rejoin", String(user._id));
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: Array.isArray(userIds) ? userIds : [] });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  },
}));