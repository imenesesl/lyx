import { Router } from "express";
import multer from "multer";
import { createReadStream, type Stats } from "node:fs";
import { readdir, stat, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as tar from "tar";
import type { ReadEntry } from "tar";
import type { Types } from "mongoose";
import { MFE } from "../db/models/mfe.js";
import { MFEVersion } from "../db/models/mfe-version.js";
import { AppConfig } from "../db/models/app-config.js";
import { authRequired } from "../middleware/auth.js";
import { uploadFile } from "../services/storage.js";

interface PopulatedAppId {
  _id: Types.ObjectId;
  name: string;
}

const router = Router();
const upload = multer({ dest: tmpdir(), limits: { fileSize: 50 * 1024 * 1024 } });

const CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const mfes = await MFE.find({ accountId: req.auth!.accountId }).sort({ createdAt: -1 });
    res.json(mfes);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const mfe = await MFE.create({
      accountId: req.auth!.accountId,
      name,
      description: description ?? "",
    });
    res.status(201).json(mfe);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === 11000
    ) {
      res.status(409).json({ error: "An MFE with that name already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const mfe = await MFE.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }
    res.json(mfe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/versions", async (req, res) => {
  try {
    const mfe = await MFE.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }
    const versions = await MFEVersion.find({ mfeId: mfe._id }).sort({ createdAt: -1 });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/versions", upload.single("bundle"), async (req, res) => {
  let tmpDir: string | null = null;
  try {
    const mfe = await MFE.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }

    const { version, slot } = req.body;
    if (!version || !slot) {
      res.status(400).json({ error: "version and slot are required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "bundle file (tar.gz) is required" });
      return;
    }

    const existing = await MFEVersion.findOne({ mfeId: mfe._id, version });
    if (existing) {
      res.status(409).json({ error: `Version ${version} already exists for this MFE` });
      return;
    }

    tmpDir = await mkdtemp(join(tmpdir(), "lyx-upload-"));

    await tar.extract({
      file: req.file.path,
      cwd: tmpDir,
      filter: (path: string, entry: Stats | ReadEntry) => {
        if (path.includes("..")) return false;
        if ("type" in entry && (entry.type === "SymbolicLink" || entry.type === "Link")) return false;
        return true;
      },
    });

    const bundlePath = `${mfe.name}/${version}`;
    let remoteEntryUrl = "";

    async function uploadDir(dir: string, prefix: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith("..") || entry.name.includes("\0")) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          await uploadDir(fullPath, `${prefix}/${entry.name}`);
        } else {
          const ext = extname(entry.name);
          const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
          const buffer = await readFile(fullPath);
          const objectName = `${prefix}/${entry.name}`;
          const url = await uploadFile(objectName, buffer, contentType);

          if (entry.name === "remoteEntry.js" || entry.name === "mf-manifest.json") {
            remoteEntryUrl = url;
          }
        }
      }
    }

    await uploadDir(tmpDir, bundlePath);

    if (!remoteEntryUrl) {
      remoteEntryUrl = `/storage/${bundlePath}/remoteEntry.js`;
    }

    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch {
        res.status(400).json({ error: "Invalid JSON in metadata field" });
        return;
      }
    }

    const mfeVersion = await MFEVersion.create({
      mfeId: mfe._id,
      version,
      slot,
      remoteEntryUrl,
      bundlePath,
      metadata,
    });

    res.status(201).json(mfeVersion);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    if (req.file) await rm(req.file.path, { force: true }).catch(() => {});
  }
});

router.put("/:id/versions/:version", upload.single("bundle"), async (req, res) => {
  let tmpDir: string | null = null;
  try {
    const mfe = await MFE.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }

    const { version } = req.params;
    const existing = await MFEVersion.findOne({ mfeId: mfe._id, version });
    if (!existing) {
      res.status(404).json({ error: `Version ${version} not found. Use POST to create it.` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "bundle file (tar.gz) is required" });
      return;
    }

    tmpDir = await mkdtemp(join(tmpdir(), "lyx-redeploy-"));

    await tar.extract({
      file: req.file.path,
      cwd: tmpDir,
      filter: (path: string, entry: Stats | ReadEntry) => {
        if (path.includes("..")) return false;
        if ("type" in entry && (entry.type === "SymbolicLink" || entry.type === "Link")) return false;
        return true;
      },
    });

    const bundlePath = `${mfe.name}/${version}`;
    let remoteEntryUrl = "";

    async function uploadDir(dir: string, prefix: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith("..") || entry.name.includes("\0")) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          await uploadDir(fullPath, `${prefix}/${entry.name}`);
        } else {
          const ext = extname(entry.name);
          const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
          const buffer = await readFile(fullPath);
          const objectName = `${prefix}/${entry.name}`;
          const url = await uploadFile(objectName, buffer, contentType);

          if (entry.name === "remoteEntry.js" || entry.name === "mf-manifest.json") {
            remoteEntryUrl = url;
          }
        }
      }
    }

    await uploadDir(tmpDir, bundlePath);

    if (remoteEntryUrl) {
      existing.remoteEntryUrl = remoteEntryUrl;
      await existing.save();
    }

    res.json({ ...existing.toJSON(), redeployed: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    if (req.file) await rm(req.file.path, { force: true }).catch(() => {});
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { description, archived } = req.body;
    const update: Record<string, unknown> = {};
    if (description !== undefined) update.description = description;
    if (archived !== undefined) update.archived = archived;

    const mfe = await MFE.findOneAndUpdate(
      { _id: req.params.id, accountId: req.auth!.accountId },
      update,
      { new: true }
    );
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }
    res.json(mfe);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const mfe = await MFE.findOne({ _id: req.params.id, accountId: req.auth!.accountId });
    if (!mfe) {
      res.status(404).json({ error: "MFE not found" });
      return;
    }

    const usedIn = await AppConfig.find({
      "assignments.mfeId": mfe._id,
      status: "published",
    }).populate<{ appId: PopulatedAppId }>("appId", "name slug");

    if (usedIn.length > 0) {
      const appNames = [...new Set(usedIn.map((c) => c.appId?.name ?? "unknown"))];
      res.status(409).json({
        error: `Cannot delete: MFE is used in published apps: ${appNames.join(", ")}. Archive it instead.`,
      });
      return;
    }

    await MFEVersion.deleteMany({ mfeId: mfe._id });
    await MFE.findByIdAndDelete(mfe._id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/all/shared", async (req, res) => {
  try {
    const mfes = await MFE.find({ accountId: req.auth!.accountId }).sort({ createdAt: -1 });
    res.json(mfes);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
