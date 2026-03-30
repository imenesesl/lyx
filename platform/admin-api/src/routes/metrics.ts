import { Router } from "express";
import { MFEMetric } from "../db/models/mfe-metric.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

router.post("/", async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics) || metrics.length === 0) {
      res.status(400).json({ error: "metrics array required" });
      return;
    }

    const docs = metrics.slice(0, 100).map((m: any) => ({
      mfeName: String(m.mfeName ?? ""),
      mfeVersion: String(m.mfeVersion ?? ""),
      slot: String(m.slot ?? ""),
      type: m.type,
      loadTimeMs: m.loadTimeMs != null ? Number(m.loadTimeMs) : undefined,
      errorMessage: m.errorMessage ? String(m.errorMessage).slice(0, 500) : undefined,
      timestamp: new Date(m.timestamp ?? Date.now()),
    }));

    await MFEMetric.insertMany(docs, { ordered: false });
    res.status(201).json({ ingested: docs.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to ingest metrics" });
  }
});

router.get("/health", authRequired, async (req, res) => {
  try {
    const windowMs = parseInt(req.query.window as string) || 3600000;
    const since = new Date(Date.now() - windowMs);

    const metrics = await MFEMetric.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    const byMfe = new Map<string, typeof metrics>();
    for (const m of metrics) {
      const key = m.mfeName;
      if (!byMfe.has(key)) byMfe.set(key, []);
      byMfe.get(key)!.push(m);
    }

    const health = Array.from(byMfe.entries()).map(([mfeName, events]) => {
      const total = events.length;
      const errors = events.filter(
        (e) => e.type === "load_error" || e.type === "render_error"
      ).length;
      const successes = events.filter((e) => e.type === "load_success");
      const loadTimes = successes
        .map((e) => e.loadTimeMs)
        .filter((t): t is number => t != null)
        .sort((a, b) => a - b);

      const errorRate = total > 0 ? errors / total : 0;
      const availability = 1 - errorRate;

      let status: "green" | "yellow" | "red" = "green";
      if (availability < 0.95) status = "red";
      else if (availability < 0.995) status = "yellow";

      const latestVersion =
        events.find((e) => e.mfeVersion && e.mfeVersion !== "unknown")
          ?.mfeVersion ?? "unknown";

      const recentErrors = events
        .filter((e) => e.type === "load_error" || e.type === "render_error")
        .slice(0, 5)
        .map((e) => ({
          type: e.type,
          message: e.errorMessage,
          timestamp: e.timestamp,
        }));

      return {
        mfeName,
        version: latestVersion,
        status,
        total,
        errors,
        errorRate: Math.round(errorRate * 10000) / 100,
        availability: Math.round(availability * 10000) / 100,
        loadTime: {
          p50: percentile(loadTimes, 50),
          p95: percentile(loadTimes, 95),
          p99: percentile(loadTimes, 99),
        },
        recentErrors,
      };
    });

    health.sort((a, b) => {
      const order = { red: 0, yellow: 1, green: 2 };
      return order[a.status] - order[b.status];
    });

    res.json({
      window: `${Math.round(windowMs / 60000)}m`,
      since: since.toISOString(),
      mfes: health,
      summary: {
        total: health.length,
        healthy: health.filter((h) => h.status === "green").length,
        degraded: health.filter((h) => h.status === "yellow").length,
        unhealthy: health.filter((h) => h.status === "red").length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute health" });
  }
});

router.get("/health/:mfeName", authRequired, async (req, res) => {
  try {
    const { mfeName } = req.params;
    const windowMs = parseInt(req.query.window as string) || 86400000;
    const since = new Date(Date.now() - windowMs);
    const bucketCount = parseInt(req.query.buckets as string) || 24;
    const bucketMs = windowMs / bucketCount;

    const metrics = await MFEMetric.find({
      mfeName,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .limit(50000)
      .lean();

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = since.getTime() + i * bucketMs;
      const end = start + bucketMs;
      const inBucket = metrics.filter(
        (m) => m.timestamp.getTime() >= start && m.timestamp.getTime() < end
      );
      const errors = inBucket.filter(
        (m) => m.type === "load_error" || m.type === "render_error"
      ).length;
      const loadTimes = inBucket
        .filter((m) => m.type === "load_success" && m.loadTimeMs != null)
        .map((m) => m.loadTimeMs!)
        .sort((a, b) => a - b);

      return {
        start: new Date(start).toISOString(),
        total: inBucket.length,
        errors,
        errorRate: inBucket.length > 0 ? Math.round((errors / inBucket.length) * 10000) / 100 : 0,
        loadTimeP50: percentile(loadTimes, 50),
        loadTimeP95: percentile(loadTimes, 95),
      };
    });

    res.json({ mfeName, window: `${Math.round(windowMs / 60000)}m`, buckets });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute health detail" });
  }
});

router.get("/logs", authRequired, async (req, res) => {
  try {
    const windowMs = parseInt(req.query.window as string) || 86400000;
    const since = new Date(Date.now() - windowMs);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type as string | undefined;
    const mfeFilter = req.query.mfe as string | undefined;
    const search = req.query.search as string | undefined;

    const query: Record<string, unknown> = { timestamp: { $gte: since } };

    if (typeFilter && typeFilter !== "all") {
      query.type = typeFilter;
    }
    if (mfeFilter && mfeFilter !== "all") {
      query.mfeName = mfeFilter;
    }
    if (search) {
      query.errorMessage = { $regex: search, $options: "i" };
    }

    const [logs, total, mfeNames] = await Promise.all([
      MFEMetric.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MFEMetric.countDocuments(query),
      MFEMetric.distinct("mfeName", { timestamp: { $gte: since } }),
    ]);

    res.json({
      logs: logs.map((l) => ({
        id: l._id,
        mfeName: l.mfeName,
        mfeVersion: l.mfeVersion,
        slot: l.slot,
        type: l.type,
        loadTimeMs: l.loadTimeMs,
        errorMessage: l.errorMessage,
        timestamp: l.timestamp,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filters: { mfeNames },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
