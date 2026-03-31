import { Router } from "express";
import { App } from "../db/models/app.js";
import { AppConfig } from "../db/models/app-config.js";
import { LayoutTemplate } from "../db/models/layout-template.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const apps = await App.find({ accountId: req.auth!.accountId }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, layoutTemplateId, path: appPath } = req.body;
    if (!name || !layoutTemplateId) {
      res.status(400).json({ error: "name and layoutTemplateId are required" });
      return;
    }

    const layout = await LayoutTemplate.findById(layoutTemplateId);
    if (!layout) {
      res.status(404).json({ error: "Layout template not found" });
      return;
    }

    const slug = appPath ? slugify(appPath) : slugify(name);
    if (!slug) {
      res.status(400).json({ error: "path must contain at least one alphanumeric character" });
      return;
    }

    const app = await App.create({
      accountId: req.auth!.accountId,
      name,
      slug,
      description: description ?? "",
    });

    await AppConfig.create({
      appId: app._id,
      version: "0.0.0",
      layoutTemplateId: layout._id,
      layoutSnapshot: { name: layout.name, regions: layout.regions },
      assignments: [],
      status: "draft",
    });

    res.status(201).json(app);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      res.status(409).json({ error: "An app with that name already exists in your account" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const app = await App.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, description, path: appPath } = req.body;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (appPath !== undefined) {
      const newSlug = slugify(appPath);
      if (!newSlug) {
        res.status(400).json({ error: "path must contain at least one alphanumeric character" });
        return;
      }
      update.slug = newSlug;
    }
    if (description !== undefined) update.description = description;

    const app = await App.findOneAndUpdate(
      { _id: req.params.id, accountId: req.auth!.accountId },
      update,
      { new: true }
    );
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }
    res.json(app);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      res.status(409).json({ error: "An app with that path already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const app = await App.findOneAndDelete({
      _id: req.params.id,
      accountId: req.auth!.accountId,
    });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }
    await AppConfig.deleteMany({ appId: app._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
