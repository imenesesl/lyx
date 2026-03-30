import mongoose from "mongoose";
import { config } from "../config.js";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("[lyx-admin] Connected to MongoDB");
  } catch (err) {
    console.error("[lyx-admin] MongoDB connection error:", err);
    process.exit(1);
  }
}
