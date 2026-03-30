import { Router } from "express";
import { Types } from "mongoose";
import { App } from "../db/models/app.js";
import { AppConfig } from "../db/models/app-config.js";
import { Account } from "../db/models/account.js";

const router = Router();

async function resolveAccountId(idOrAlias: string): Promise<string | null> {
  if (Types.ObjectId.isValid(idOrAlias) && /^[a-f0-9]{24}$/.test(idOrAlias)) {
    return idOrAlias;
  }
  const account = await Account.findOne({ alias: idOrAlias }).select("_id");
  return account?._id?.toString() ?? null;
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

    res.json(config.layoutSnapshot);
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

    const entries = config.assignments.map((a) => ({
      name: a.mfeName,
      slot: a.slotId,
      version: a.mfeVersion,
      remoteEntry: a.remoteEntryUrl ?? `/storage/${a.mfeName}/${a.mfeVersion}/remoteEntry.js`,
      timestamp: config.publishedAt?.getTime() ?? Date.now(),
    }));

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

    res.json({
      name: assignment.mfeName,
      slot: assignment.slotId,
      version: assignment.mfeVersion,
      remoteEntry: assignment.remoteEntryUrl ?? `/storage/${assignment.mfeName}/${assignment.mfeVersion}/remoteEntry.js`,
      timestamp: config.publishedAt?.getTime() ?? Date.now(),
    });
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

    res.json({
      name: assignment.mfeName,
      slot: assignment.slotId,
      version: assignment.mfeVersion,
      remoteEntry: assignment.remoteEntryUrl ?? `/storage/${assignment.mfeName}/${assignment.mfeVersion}/remoteEntry.js`,
      timestamp: config.publishedAt?.getTime() ?? Date.now(),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
