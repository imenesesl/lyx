import { Router } from "express";
import { App } from "../db/models/app.js";
import { AppConfig } from "../db/models/app-config.js";
import { LayoutTemplate } from "../db/models/layout-template.js";
import { MFE } from "../db/models/mfe.js";
import { MFEVersion } from "../db/models/mfe-version.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/:appId/config", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const draft = await AppConfig.findOne({ appId: app._id, status: "draft" }).sort({ createdAt: -1 });
    if (!draft) {
      res.status(404).json({ error: "No draft config found" });
      return;
    }
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:appId/config", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const draft = await AppConfig.findOne({ appId: app._id, status: "draft" }).sort({ createdAt: -1 });
    if (!draft) {
      res.status(404).json({ error: "No draft config found" });
      return;
    }

    const { layoutTemplateId, assignments } = req.body;

    if (layoutTemplateId && layoutTemplateId !== draft.layoutTemplateId.toString()) {
      const layout = await LayoutTemplate.findById(layoutTemplateId);
      if (!layout) {
        res.status(404).json({ error: "Layout template not found" });
        return;
      }
      draft.layoutTemplateId = layout._id;
      draft.layoutSnapshot = { name: layout.name, regions: layout.regions };
    }

    if (assignments) {
      const resolved = [];
      for (const a of assignments) {
        let remoteEntryUrl = a.remoteEntryUrl ?? "";
        if (a.mfeVersionId) {
          const ver = await MFEVersion.findById(a.mfeVersionId);
          if (ver) {
            const ownerMfe = await MFE.findOne({ _id: ver.mfeId, accountId: req.auth!.accountId });
            if (!ownerMfe) {
              res.status(403).json({ error: `MFE version ${a.mfeVersionId} does not belong to your account` });
              return;
            }
            remoteEntryUrl = ver.remoteEntryUrl;
          }
        }
        resolved.push({ ...a, remoteEntryUrl });
      }
      draft.assignments = resolved;
    }

    await draft.save();
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:appId/publish", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const draft = await AppConfig.findOne({ appId: app._id, status: "draft" }).sort({ createdAt: -1 });
    if (!draft) {
      res.status(404).json({ error: "No draft config found" });
      return;
    }

    const { assignments } = req.body ?? {};
    if (assignments && assignments.length > 0) {
      const resolved = [];
      for (const a of assignments) {
        let remoteEntryUrl = a.remoteEntryUrl ?? "";
        if (a.mfeVersionId) {
          const ver = await MFEVersion.findById(a.mfeVersionId);
          if (ver) {
            const ownerMfe = await MFE.findOne({ _id: ver.mfeId, accountId: req.auth!.accountId });
            if (!ownerMfe) {
              res.status(403).json({ error: `MFE version ${a.mfeVersionId} does not belong to your account` });
              return;
            }
            remoteEntryUrl = ver.remoteEntryUrl;
          }
        }
        resolved.push({ ...a, remoteEntryUrl });
      }
      draft.assignments = resolved;
      await draft.save();
    }

    if (draft.assignments.length === 0) {
      res.status(400).json({ error: "Assign at least one MFE to a slot before publishing" });
      return;
    }

    const lastPublished = await AppConfig.findOne({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });

    const nextVersion = bumpVersion(lastPublished?.version ?? "0.0.0");

    draft.version = nextVersion;
    draft.status = "published";
    draft.publishedAt = new Date();
    await draft.save();

    const newDraft = await AppConfig.create({
      appId: app._id,
      version: "0.0.0",
      layoutTemplateId: draft.layoutTemplateId,
      layoutSnapshot: draft.layoutSnapshot,
      assignments: draft.assignments,
      status: "draft",
    });

    app.updatedAt = new Date();
    await app.save();

    res.json({ published: draft, newDraft });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:appId/versions", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.appId, accountId: req.auth!.accountId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const versions = await AppConfig.find({ appId: app._id, status: "published" })
      .sort({ publishedAt: -1 });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

function bumpVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3) return "1.0.0";
  parts[2]++;
  return parts.join(".");
}

export default router;
