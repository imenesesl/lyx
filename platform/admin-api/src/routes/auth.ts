import { Router } from "express";
import bcrypt from "bcryptjs";
import { Account } from "../db/models/account.js";
import { authRequired, signToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }

    const existing = await Account.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const account = await Account.create({ email, passwordHash, name });

    const token = signToken({ accountId: account._id.toString(), email: account.email });
    res.status(201).json({
      token,
      account: { id: account._id, email: account.email, name: account.name, alias: account.alias ?? null },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ accountId: account._id.toString(), email: account.email });
    res.json({
      token,
      account: { id: account._id, email: account.email, name: account.name, alias: account.alias ?? null },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const account = await Account.findById(req.auth!.accountId).select("-passwordHash");
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ id: account._id, email: account.email, name: account.name, alias: account.alias ?? null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const RESERVED_SLUGS = new Set([
  "admin", "api", "storage", "health", "favicon", "_assets", "login", "register", "auth",
]);

const ALIAS_RE = /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/;

router.put("/alias", authRequired, async (req, res) => {
  try {
    const { alias } = req.body;
    if (!alias || typeof alias !== "string") {
      res.status(400).json({ error: "alias is required" });
      return;
    }

    const clean = alias.toLowerCase().trim();

    if (!ALIAS_RE.test(clean)) {
      res.status(400).json({
        error: "Alias must be 3-32 characters, lowercase letters, numbers, and hyphens only. Must start and end with a letter or number.",
      });
      return;
    }

    if (RESERVED_SLUGS.has(clean)) {
      res.status(400).json({ error: `"${clean}" is a reserved name and cannot be used as an alias` });
      return;
    }

    if (/^[a-f0-9]{24}$/.test(clean)) {
      res.status(400).json({ error: "Alias cannot look like a MongoDB ObjectId" });
      return;
    }

    const existing = await Account.findOne({ alias: clean, _id: { $ne: req.auth!.accountId } });
    if (existing) {
      res.status(409).json({ error: `"${clean}" is already taken. Choose a different alias.` });
      return;
    }

    const account = await Account.findByIdAndUpdate(
      req.auth!.accountId,
      { alias: clean },
      { new: true }
    ).select("-passwordHash");

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({ id: account._id, email: account.email, name: account.name, alias: account.alias ?? null });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: "That alias is already taken" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
