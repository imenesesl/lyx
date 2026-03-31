import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { connectDB } from "./db/connection.js";
import { ensureBucket, healthCheck as storageHealthCheck } from "./services/storage.js";
import { seedLayouts } from "./seed.js";
import { logger } from "./logger.js";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import appsRoutes from "./routes/apps.js";
import mfesRoutes from "./routes/mfes.js";
import layoutsRoutes from "./routes/layouts.js";
import appConfigRoutes from "./routes/app-config.js";
import runtimeRoutes from "./routes/runtime.js";
import contractsRoutes from "./routes/contracts.js";
import metricsRoutes from "./routes/metrics.js";
import canaryRoutes from "./routes/canary.js";

async function main() {
  await connectDB();
  await ensureBucket();
  await seedLayouts();

  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  const corsOrigin = config.cors.origin === "*" ? true : config.cors.origin.split(",").map((o) => o.trim());
  app.use(cors({ origin: corsOrigin, credentials: true }));

  app.use(pinoHttp({
    logger,
    autoLogging: { ignore: (req) => (req.url ?? "") === "/api/health" },
  }));

  app.use(express.json({ limit: "10mb" }));

  const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? req.headers["x-forwarded-for"]?.toString() ?? "unknown",
    message: { error: "Too many requests, please try again later" },
  });

  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, string> = { process: "ok" };

    try {
      checks.mongodb = mongoose.connection.readyState === 1 ? "ok" : "disconnected";
    } catch {
      checks.mongodb = "error";
    }

    try {
      checks.storage = (await storageHealthCheck()) ? "ok" : "error";
    } catch {
      checks.storage = "error";
    }

    const allOk = Object.values(checks).every((v) => v === "ok");
    res.status(allOk ? 200 : 503).json({
      status: allOk ? "ok" : "degraded",
      service: "lyx-admin-api",
      timestamp: Date.now(),
      checks,
    });
  });

  app.use("/api/auth/login", credentialLimiter);
  app.use("/api/auth/register", credentialLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/apps", appsRoutes);
  app.use("/api/mfes", mfesRoutes);
  app.use("/api/layouts", layoutsRoutes);
  app.use("/api/apps", appConfigRoutes);
  app.use("/api/runtime", runtimeRoutes);
  app.use("/api/contracts", contractsRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/apps", canaryRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err: err.message }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(config.port, () => {
    logger.info(`API running on http://localhost:${config.port}`);
  });

  const shutdown = () => {
    logger.info("Shutting down gracefully...");
    server.close(async () => {
      try { await mongoose.disconnect(); } catch {}
      logger.info("Shutdown complete");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
