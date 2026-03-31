import { Router } from "express";
import type { Types } from "mongoose";
import { App } from "../db/models/app.js";
import { AppConfig, type ICanaryRule } from "../db/models/app-config.js";
import { MFEVersion } from "../db/models/mfe-version.js";
import { MFEMetric } from "../db/models/mfe-metric.js";
import { authRequired } from "../middleware/auth.js";

interface PopulatedMfeId {
  _id: Types.ObjectId;
  name: string;
}

const router = Router();
router.use(authRequired);

router.get("/:appId/canary", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) { res.status(404).json({ error: "App not found" }); return; }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) { res.status(404).json({ error: "No published config" }); return; }

    const rules = config.canaryRules ?? [];

    const enriched = await Promise.all(rules.map(async (rule) => {
      const stable = config.assignments.find((a) => a.slotId === rule.slotId);
      const since = rule.startedAt;

      const [stableMetrics, canaryMetrics] = await Promise.all([
        MFEMetric.countDocuments({ mfeName: stable?.mfeName, mfeVersion: stable?.mfeVersion, timestamp: { $gte: since } }),
        MFEMetric.countDocuments({ mfeName: rule.canaryMfeName, mfeVersion: rule.canaryMfeVersion, timestamp: { $gte: since } }),
      ]);

      const [stableErrors, canaryErrors] = await Promise.all([
        MFEMetric.countDocuments({ mfeName: stable?.mfeName, mfeVersion: stable?.mfeVersion, type: { $in: ["load_error", "render_error"] }, timestamp: { $gte: since } }),
        MFEMetric.countDocuments({ mfeName: rule.canaryMfeName, mfeVersion: rule.canaryMfeVersion, type: { $in: ["load_error", "render_error"] }, timestamp: { $gte: since } }),
      ]);

      return {
        slotId: rule.slotId,
        stableMfe: stable?.mfeName ?? "unknown",
        stableVersion: stable?.mfeVersion ?? "unknown",
        canaryMfe: rule.canaryMfeName,
        canaryVersion: rule.canaryMfeVersion,
        percentage: rule.percentage,
        errorThreshold: rule.errorThreshold,
        startedAt: rule.startedAt,
        metrics: {
          stable: { total: stableMetrics, errors: stableErrors, errorRate: stableMetrics > 0 ? Math.round((stableErrors / stableMetrics) * 10000) / 100 : 0 },
          canary: { total: canaryMetrics, errors: canaryErrors, errorRate: canaryMetrics > 0 ? Math.round((canaryErrors / canaryMetrics) * 10000) / 100 : 0 },
        },
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:appId/canary", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) { res.status(404).json({ error: "App not found" }); return; }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) { res.status(404).json({ error: "No published config" }); return; }

    const { slotId, mfeVersionId, percentage, errorThreshold } = req.body;

    if (!slotId || !mfeVersionId) {
      res.status(400).json({ error: "slotId and mfeVersionId are required" });
      return;
    }

    const pct = Math.max(1, Math.min(99, parseInt(percentage) || 10));
    const threshold = Math.max(1, Math.min(100, parseInt(errorThreshold) || 5));

    const assignment = config.assignments.find((a) => a.slotId === slotId);
    if (!assignment) {
      res.status(400).json({ error: `Slot "${slotId}" has no MFE assigned` });
      return;
    }

    const version = await MFEVersion.findById(mfeVersionId)
      .populate<{ mfeId: PopulatedMfeId }>("mfeId");
    if (!version) {
      res.status(404).json({ error: "MFE version not found" });
      return;
    }

    const populatedMfe = version.mfeId;
    const existing = (config.canaryRules ?? []).filter((r) => r.slotId !== slotId);
    const newRule: ICanaryRule = {
      slotId,
      canaryMfeId: populatedMfe._id,
      canaryMfeVersionId: version._id,
      canaryMfeName: populatedMfe.name ?? assignment.mfeName,
      canaryMfeVersion: version.version,
      canaryRemoteEntryUrl: version.remoteEntryUrl,
      percentage: pct,
      errorThreshold: threshold,
      startedAt: new Date(),
    };
    existing.push(newRule);

    config.canaryRules = existing;
    await config.save();

    res.json({ message: `Canary set: ${pct}% traffic to v${version.version} on slot "${slotId}"` });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:appId/canary/:slotId/promote", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) { res.status(404).json({ error: "App not found" }); return; }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) { res.status(404).json({ error: "No published config" }); return; }

    const rule = (config.canaryRules ?? []).find((r) => r.slotId === req.params.slotId);
    if (!rule) {
      res.status(404).json({ error: `No canary running on slot "${req.params.slotId}"` });
      return;
    }

    const assignment = config.assignments.find((a) => a.slotId === req.params.slotId);
    if (assignment) {
      assignment.mfeId = rule.canaryMfeId;
      assignment.mfeVersionId = rule.canaryMfeVersionId;
      assignment.mfeName = rule.canaryMfeName;
      assignment.mfeVersion = rule.canaryMfeVersion;
      assignment.remoteEntryUrl = rule.canaryRemoteEntryUrl;
    }

    config.canaryRules = (config.canaryRules ?? []).filter((r) => r.slotId !== req.params.slotId);
    await config.save();

    res.json({
      message: `Canary promoted: ${rule.canaryMfeName}@${rule.canaryMfeVersion} is now stable on slot "${req.params.slotId}"`,
      clearCookie: `lyx_canary_${app.slug}_${req.params.slotId}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:appId/canary/:slotId/rollback", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) { res.status(404).json({ error: "App not found" }); return; }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) { res.status(404).json({ error: "No published config" }); return; }

    const rule = (config.canaryRules ?? []).find((r) => r.slotId === req.params.slotId);
    if (!rule) {
      res.status(404).json({ error: `No canary running on slot "${req.params.slotId}"` });
      return;
    }

    config.canaryRules = (config.canaryRules ?? []).filter((r) => r.slotId !== req.params.slotId);
    await config.save();

    res.json({
      message: `Canary rolled back on slot "${req.params.slotId}". Stable version restored.`,
      clearCookie: `lyx_canary_${app.slug}_${req.params.slotId}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
