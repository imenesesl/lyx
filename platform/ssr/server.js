import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "4002", 10);
const API_URL = process.env.API_URL ?? "http://admin-api:4000";
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const AWS_REGION = process.env.AWS_REGION ?? "us-west-2";

const MIME_MAP = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".html": "text/html",
  ".map": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const NO_CACHE_FILES = new Set([
  "remoteEntry.js",
  "mf-manifest.json",
  "index.html",
  "localSharedImportMap",
]);

function isNoCacheAsset(key) {
  const basename = key.split("/").pop() ?? "";
  if (NO_CACHE_FILES.has(basename)) return true;
  for (const prefix of NO_CACHE_FILES) {
    if (basename.startsWith(prefix)) return true;
  }
  return false;
}

let s3Client;
function getS3() {
  if (!s3Client) s3Client = new S3Client({ region: AWS_REGION });
  return s3Client;
}

const CLIENT_DIR = join(__dirname, "client");
const SSR_DIR = join(__dirname, "ssr");

async function fetchWithRetry(url, retries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[lyx-ssr] Fetch attempt ${attempt} failed for ${url}, retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
}

function getClientAssets() {
  const manifestPath = join(CLIENT_DIR, ".vite", "manifest.json");
  const js = [];
  const css = [];

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    for (const [key, entry] of Object.entries(manifest)) {
      if (entry.isEntry && entry.file) {
        js.push(`/_assets/${entry.file}`);
        if (entry.css) {
          for (const c of entry.css) css.push(`/_assets/${c}`);
        }
      }
    }
  }

  if (js.length === 0) js.push("/_assets/src/entry-client.tsx");
  return { js, css };
}

async function startServer() {
  const clientAssets = getClientAssets();
  console.log("[lyx-ssr] Client assets:", clientAssets);

  const { render } = await import(join(SSR_DIR, "entry-server.js"));

  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "lyx-ssr" });
  });

  app.use("/storage", async (req, res) => {
    const objectKey = req.path.startsWith("/") ? req.path.slice(1) : req.path;
    const cacheHeader = isNoCacheAsset(objectKey)
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable";

    if (S3_BUCKET) {
      try {
        const s3 = getS3();
        const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: objectKey });
        const s3Res = await s3.send(cmd);

        const ext = extname(objectKey);
        const ct = MIME_MAP[ext] || s3Res.ContentType || "application/octet-stream";
        res.setHeader("Content-Type", ct);
        res.setHeader("Cache-Control", cacheHeader);
        res.setHeader("Access-Control-Allow-Origin", "*");
        s3Res.Body.transformToWebStream().pipeTo(
          new WritableStream({
            write(chunk) { res.write(chunk); },
            close() { res.end(); },
          })
        ).catch(() => res.end());
      } catch (err) {
        if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
          res.status(404).end();
        } else {
          console.error("[lyx-ssr] S3 fetch error:", err.message);
          res.status(502).end();
        }
      }
    } else {
      try {
        const targetUrl = `${API_URL}/storage${req.path}`;
        const proxyRes = await fetch(targetUrl);
        if (!proxyRes.ok) {
          res.status(proxyRes.status).end();
          return;
        }
        const ct = proxyRes.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", ct);
        res.setHeader("Cache-Control", cacheHeader);
        const body = await proxyRes.arrayBuffer();
        res.end(Buffer.from(body));
      } catch (err) {
        console.error("[lyx-ssr] Storage proxy error:", err.message);
        res.status(502).end();
      }
    }
  });

  app.use("/api", async (req, res) => {
    try {
      const targetUrl = `${API_URL}${req.originalUrl}`;
      const headers = { ...req.headers, host: new URL(API_URL).host };
      delete headers["connection"];

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
        duplex: "half",
      });

      res.status(proxyRes.status);
      const skipHeaders = new Set(["transfer-encoding", "connection", "cache-control", "expires", "pragma"]);
      for (const [key, value] of proxyRes.headers.entries()) {
        if (!skipHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      const body = await proxyRes.arrayBuffer();
      res.end(Buffer.from(body));
    } catch (err) {
      console.error("[lyx-ssr] API proxy error:", err.message);
      res.status(502).json({ error: "API unreachable" });
    }
  });

  app.use("/_assets", express.static(CLIENT_DIR, {
    index: false,
    maxAge: "1y",
    immutable: true,
  }));

  app.get("/:accountId/:slug", handleSSR);
  app.get("/:accountId/:slug/*", handleSSR);

  async function handleSSR(req, res) {
    const { accountId, slug } = req.params;

    if (/^(health|api|storage|_assets|admin|favicon|login|register|auth)$/.test(accountId)) {
      return res.status(404).end();
    }

    try {
      const layoutRes = await fetchWithRetry(`${API_URL}/api/runtime/${accountId}/${slug}/layout`);

      if (!layoutRes.ok) {
        res.status(404).send(errorPage(
          `App "${slug}" not found or has no published version.`
        ));
        return;
      }

      const layout = await layoutRes.json();
      const { renderStream } = render({ slug, accountId, layout, clientAssets });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      renderStream(res);
    } catch (err) {
      console.error("[lyx-ssr] Error:", err);
      res.status(500).send(errorPage("An internal error occurred"));
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`[lyx-ssr] Streaming SSR server ready on port ${PORT}`);
    console.log(`[lyx-ssr] API backend: ${API_URL}`);
    console.log(`[lyx-ssr] Client dir: ${CLIENT_DIR}`);
    console.log(`[lyx-ssr] S3 bucket: ${S3_BUCKET || "(none - using API proxy)"}`);
  });

  const shutdown = () => {
    console.log("[lyx-ssr] Shutting down gracefully...");
    server.close(() => {
      console.log("[lyx-ssr] Shutdown complete");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[lyx-ssr] Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;color:#666">
<div style="text-align:center">
  <h2 style="color:#333;margin-bottom:8px">Lyx Shell</h2>
  <p>${message}</p>
</div>
</body></html>`;
}

startServer().catch((err) => {
  console.error("[lyx-ssr] Failed to start:", err);
  process.exit(1);
});
