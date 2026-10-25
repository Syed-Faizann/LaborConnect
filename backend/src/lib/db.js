import mongoose from "mongoose";
import dns from "node:dns";

// Fix querySrv ECONNREFUSED on Node.js / Windows with MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if custom DNS servers cannot be set
}

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URL;

    if (!mongoUri) {
      throw new Error("MONGO_URL is required");
    }

    const conn = await mongoose.connect(mongoUri, {
      dbName: "labor-connect",
    });

    console.log("MongoDB connected:", conn.connection.host);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}