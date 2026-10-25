import cors from "cors";
import express from "express";
import "dotenv/config";

import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";

// 1. Import 'app' and 'server' from your socket.js file
import { app, server } from "./lib/socket.js";

// --- routes ---
import authRoutes from "./routes/auth.route.js";
import companyRoutes from "./routes/company.route.js";
import adminRoutes from "./routes/admin.route.js";
import companyPageRoutes from "./routes/companyPage.route.js";
import teamRoutes from "./routes/team.route.js";
import serviceRequestRoutes from "./routes/serviceRequest.route.js";
import notificationRoutes from "./routes/notification.route.js";
import paymentRoutes from "./routes/payment.route.js";
import messageRoutes from "./routes/message.route.js"; // <-- chat routes
import supportRoutes from "./routes/support.route.js";


const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());
app.use(express.json());

// Mount all routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/company-page", companyPageRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);

async function startServer() {
  await connectDB();

  // 2. Start the HTTP + WebSocket server for localhost
  server.listen(PORT, () => {
    console.log(`Server and Socket.IO running on http://localhost:${PORT}`);
  });
}

startServer();