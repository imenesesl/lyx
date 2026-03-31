import { Router } from "express";
import { App } from "../db/models/app.js";
import { AppConfig } from "../db/models/app-config.js";
import { MFEVersion } from "../db/models/mfe-version.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/:appId", async (req, res) => {
  try {
    const app = await App.findOne({
      _id: req.params.appId,
      accountId: req.auth!.accountId,
    });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    if (!config || config.assignments.length === 0) {
      res.json({ contracts: [], mfes: [] });
      return;
    }

    const versionIds = config.assignments.map((a) => a.mfeVersionId);
    const versions = await MFEVersion.find({ _id: { $in: versionIds } });

    const result = versions.map((v) => ({
      mfeName: config.assignments.find(
        (a) => a.mfeVersionId.toString() === v._id.toString()
      )?.mfeName ?? "unknown",
      version: v.version,
      slot: v.slot,
      contracts: v.metadata?.contracts ?? null,
    }));

    res.json({
      appName: app.name,
      appSlug: app.slug,
      mfes: result,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const versions = await MFEVersion.find({
      "metadata.contracts": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(100);

    const contracts = versions.map((v) => ({
      mfeId: v.mfeId,
      version: v.version,
      slot: v.slot,
      contracts: v.metadata?.contracts ?? null,
    }));

    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
