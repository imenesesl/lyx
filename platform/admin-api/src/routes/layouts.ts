import { Router } from "express";
import { LayoutTemplate } from "../db/models/layout-template.js";
import { AppConfig } from "../db/models/app-config.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const layouts = await LayoutTemplate.find().sort({ isBuiltIn: -1, createdAt: -1 });
    res.json(layouts);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const layout = await LayoutTemplate.findById(req.params.id);
    if (!layout) {
      res.status(404).json({ error: "Layout template not found" });
      return;
    }
    res.json(layout);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { name, description, regions } = req.body;
    if (!name || !regions?.length) {
      res.status(400).json({ error: "name and regions are required" });
      return;
    }

    const layout = await LayoutTemplate.create({
      name,
      description: description ?? "",
      regions,
      isBuiltIn: false,
    });
    res.status(201).json(layout);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      res.status(409).json({ error: "A layout with that name already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const layout = await LayoutTemplate.findById(req.params.id);
    if (!layout) {
      res.status(404).json({ error: "Layout template not found" });
      return;
    }
    if (layout.isBuiltIn) {
      res.status(403).json({ error: "Cannot modify built-in layouts" });
      return;
    }

    const { name, description, regions } = req.body;
    if (name !== undefined) layout.name = name;
    if (description !== undefined) layout.description = description;
    if (regions !== undefined) {
      if (!Array.isArray(regions) || regions.length === 0) {
        res.status(400).json({ error: "regions must be a non-empty array" });
        return;
      }
      layout.regions = regions;
    }

    await layout.save();
    res.json(layout);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      res.status(409).json({ error: "A layout with that name already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const layout = await LayoutTemplate.findById(req.params.id);
    if (!layout) {
      res.status(404).json({ error: "Layout template not found" });
      return;
    }
    if (layout.isBuiltIn) {
      res.status(403).json({ error: "Cannot delete built-in layouts" });
      return;
    }

    const usedIn = await AppConfig.find({ layoutTemplateId: layout._id });
    if (usedIn.length > 0) {
      res.status(409).json({ error: "Cannot delete: layout is used by existing app configurations" });
      return;
    }

    await LayoutTemplate.findByIdAndDelete(layout._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
