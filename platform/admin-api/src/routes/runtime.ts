import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { App } from "../db/models/app.js";
import { AppConfig, type ICanaryRule } from "../db/models/app-config.js";
import { Account } from "../db/models/account.js";
import cookie from "cookie";
import { MFEMetric } from "../db/models/mfe-metric.js";

const router = Router();

async function resolveAccountId(idOrAlias: string): Promise<string | null> {
  if (Types.ObjectId.isValid(idOrAlias) && /^[a-f0-9]{24}$/.test(idOrAlias)) {
    return idOrAlias;
  }
  const account = await Account.findOne({ alias: idOrAlias }).select("_id");
  return account?._id?.toString() ?? null;
}

function parseCookies(req: Request): Record<string, string | undefined> {
  return cookie.parse(req.headers.cookie ?? "");
}

function resolveCanary(
  req: Request,
  res: Response,
  slug: string,
  slotId: string,
  canary: ICanaryRule
): "canary" | "stable" {
  const cookieName = `lyx_canary_${slug}_${slotId}`;
  const cookies = parseCookies(req);
  const existing = cookies[cookieName];

  if (existing === "canary" || existing === "stable") return existing;

  const roll = Math.random() * 100;
  const assignment = roll < canary.percentage ? "canary" : "stable";

  res.setHeader("Set-Cookie", cookie.serialize(cookieName, assignment, {
    path: "/",
    maxAge: 86400,
    httpOnly: false,
    sameSite: "lax",
  }));

  return assignment;
}

function makeEntry(name: string, slot: string, version: string, remoteEntry: string, ts: number, isCanary = false) {
  return {
    name,
    slot,
    version,
    remoteEntry: remoteEntry || `/storage/${name}/${version}/remoteEntry.js`,
    timestamp: ts,
    canary: isCanary,
  };
}

async function checkAutoRollback(config: any, rule: ICanaryRule): Promise<boolean> {
  const since = rule.startedAt;
  const minSamples = 10;

  const [total, errors] = await Promise.all([
    MFEMetric.countDocuments({
      mfeName: rule.canaryMfeName,
      mfeVersion: rule.canaryMfeVersion,
      timestamp: { $gte: since },
    }),
    MFEMetric.countDocuments({
      mfeName: rule.canaryMfeName,
      mfeVersion: rule.canaryMfeVersion,
      type: { $in: ["load_error", "render_error"] },
      timestamp: { $gte: since },
    }),
  ]);

  if (total < minSamples) return false;

  const errorRate = (errors / total) * 100;
  if (errorRate > rule.errorThreshold) {
    config.canaryRules = (config.canaryRules ?? []).filter(
      (r: ICanaryRule) => r.slotId !== rule.slotId
    );
    await config.save();
    console.log(
      `[lyx] Auto-rollback: ${rule.canaryMfeName}@${rule.canaryMfeVersion} on slot "${rule.slotId}" ` +
      `(error rate ${errorRate.toFixed(1)}% > threshold ${rule.errorThreshold}%)`
    );
    return true;
  }

  return false;
}

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
  next();
});

router.get("/:accountId/:slug/layout", async (req, res) => {
  try {
    const realId = await resolveAccountId(req.params.accountId);
    if (!realId) { res.status(404).json({ error: "Account not found" }); return; }
    const app = await App.findOne({ slug: req.params.slug, accountId: realId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) {
      res.status(404).json({ error: "No published configuration found" });
      return;
    }

    const assignedSlots = config.assignments.map((a) => a.slotId);
    const canarySlots = (config.canaryRules ?? []).map((r) => r.slotId);
    const snapshot = JSON.parse(JSON.stringify(config.layoutSnapshot));
    res.json({ ...snapshot, assignedSlots, canarySlots });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:accountId/:slug/mfes", async (req, res) => {
  try {
    const realId = await resolveAccountId(req.params.accountId);
    if (!realId) { res.status(404).json({ error: "Account not found" }); return; }
    const app = await App.findOne({ slug: req.params.slug, accountId: realId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) {
      res.status(404).json({ error: "No published configuration found" });
      return;
    }

    const ts = config.publishedAt?.getTime() ?? Date.now();
    const entries = [];
    for (const a of config.assignments) {
      const canary = (config.canaryRules ?? []).find((r) => r.slotId === a.slotId);
      if (canary) {
        const rolledBack = await checkAutoRollback(config, canary);
        if (!rolledBack) {
          const bucket = resolveCanary(req, res, req.params.slug, a.slotId, canary);
          if (bucket === "canary") {
            entries.push(makeEntry(canary.canaryMfeName, a.slotId, canary.canaryMfeVersion, canary.canaryRemoteEntryUrl, ts, true));
            continue;
          }
        }
      }
      entries.push(makeEntry(a.mfeName, a.slotId, a.mfeVersion, a.remoteEntryUrl, ts));
    }

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:accountId/:slug/mfes/slot/:slot", async (req, res) => {
  try {
    const realId = await resolveAccountId(req.params.accountId);
    if (!realId) { res.status(404).json({ error: "Account not found" }); return; }
    const app = await App.findOne({ slug: req.params.slug, accountId: realId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) {
      res.status(404).json({ error: "No published configuration found" });
      return;
    }

    const assignment = config.assignments.find((a) => a.slotId === req.params.slot);
    if (!assignment) {
      res.status(404).json({ error: `No MFE assigned to slot "${req.params.slot}"` });
      return;
    }

    const ts = config.publishedAt?.getTime() ?? Date.now();
    const canary = (config.canaryRules ?? []).find((r) => r.slotId === req.params.slot);
    if (canary) {
      const rolledBack = await checkAutoRollback(config, canary);
      if (!rolledBack) {
        const bucket = resolveCanary(req, res, req.params.slug, req.params.slot, canary);
        if (bucket === "canary") {
          res.json(makeEntry(canary.canaryMfeName, assignment.slotId, canary.canaryMfeVersion, canary.canaryRemoteEntryUrl, ts, true));
          return;
        }
      }
    }

    res.json(makeEntry(assignment.mfeName, assignment.slotId, assignment.mfeVersion, assignment.remoteEntryUrl, ts));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:accountId/:slug/mfes/by-name/:name", async (req, res) => {
  try {
    const realId = await resolveAccountId(req.params.accountId);
    if (!realId) { res.status(404).json({ error: "Account not found" }); return; }
    const app = await App.findOne({ slug: req.params.slug, accountId: realId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config) {
      res.status(404).json({ error: "No published configuration found" });
      return;
    }

    const assignment = config.assignments.find((a) => a.mfeName === req.params.name);
    if (!assignment) {
      res.status(404).json({ error: `MFE "${req.params.name}" not found in this app` });
      return;
    }

    const ts = config.publishedAt?.getTime() ?? Date.now();
    res.json(makeEntry(assignment.mfeName, assignment.slotId, assignment.mfeVersion, assignment.remoteEntryUrl, ts));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
