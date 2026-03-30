import express from "express";
import cors from "cors";
import type { RegistryProvider, MFERegistryEntry, Layout } from "@lyx/types";
import { InMemoryProvider } from "./providers/in-memory";

export interface RegistryServerOptions {
  port?: number;
  provider?: RegistryProvider;
  layout?: Layout;
}

const DEFAULT_LAYOUT: Layout = {
  name: "default",
  regions: [
    { id: "header", slot: "header", position: "top" },
    { id: "sidebar", slot: "sidebar", position: "left", size: "250px" },
    { id: "main", slot: "main", position: "center" },
    { id: "footer", slot: "footer", position: "bottom" },
  ],
};

export function createRegistryServer(options: RegistryServerOptions = {}) {
  const port = options.port ?? 3456;
  const provider = options.provider ?? new InMemoryProvider();
  let currentLayout: Layout = options.layout ?? DEFAULT_LAYOUT;

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/layout", (_req, res) => {
    res.json(currentLayout);
  });

  app.put("/layout", (req, res) => {
    currentLayout = req.body;
    res.json({ ok: true, layout: currentLayout });
  });

  app.post("/register", async (req, res) => {
    try {
      const entry: MFERegistryEntry = {
        name: req.body.name,
        slot: req.body.slot,
        version: req.body.version ?? "0.0.0",
        remoteEntry: req.body.remoteEntry,
        timestamp: Date.now(),
        metadata: req.body.metadata,
      };

      if (!entry.name || !entry.slot || !entry.remoteEntry) {
        res.status(400).json({ error: "name, slot, and remoteEntry are required" });
        return;
      }

      await provider.register(entry);
      console.log(`[lyx-registry] Registered: ${entry.name} → ${entry.slot} (${entry.remoteEntry})`);
      res.json({ ok: true, entry });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/mfes", async (_req, res) => {
    try {
      const entries = await provider.list();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/mfes/:name", async (req, res) => {
    try {
      const entry = await provider.get(req.params.name);
      if (!entry) {
        res.status(404).json({ error: `MFE "${req.params.name}" not found` });
        return;
      }
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/mfes/slot/:slot", async (req, res) => {
    try {
      const entry = await provider.getBySlot(req.params.slot);
      if (!entry) {
        res.status(404).json({ error: `No MFE for slot "${req.params.slot}"` });
        return;
      }
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete("/mfes/:name", async (req, res) => {
    try {
      await provider.unregister(req.params.name);
      console.log(`[lyx-registry] Unregistered: ${req.params.name}`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  function start() {
    return new Promise<void>((resolve) => {
      app.listen(port, () => {
        console.log(`[lyx-registry] Running on http://localhost:${port}`);
        resolve();
      });
    });
  }

  return { app, start, provider };
}

const isDirectRun =
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isDirectRun) {
  import("./providers/local-file").then(({ LocalFileProvider }) => {
    const server = createRegistryServer({
      provider: new LocalFileProvider(),
    });
    server.start();
  });
}
