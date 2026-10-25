// backend/src/lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Map of userId -> Set of active socket IDs
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  if (!userId) return null;
  return userSocketMap[String(userId)];
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    const userRoom = String(userId);
    socket.join(userRoom);

    if (!userSocketMap[userRoom]) {
      userSocketMap[userRoom] = new Set();
    }
    userSocketMap[userRoom].add(socket.id);

    console.log(`[Socket Connected] User ${userId} on socket ${socket.id}`);
  }

  // Broadcast online user IDs
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle explicit rejoin on reconnect
  socket.on("rejoin", (id) => {
    if (id) {
      socket.join(String(id));
      console.log(`[Socket Rejoined] User ${id}`);
    }
  });

  socket.on("disconnect", () => {
    if (userId && userId !== "undefined") {
      const userRoom = String(userId);
      if (userSocketMap[userRoom]) {
        userSocketMap[userRoom].delete(socket.id);
        if (userSocketMap[userRoom].size === 0) {
          delete userSocketMap[userRoom];
        }
      }
      console.log(`[Socket Disconnected] User ${userId}`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };