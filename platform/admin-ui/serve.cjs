const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = parseInt(process.env.PORT || "4001", 10);
const API_URL = process.env.API_URL || "";
const ROOT = path.join(__dirname, "dist");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function proxyToApi(req, res) {
  if (!API_URL) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API_URL not configured" }));
    return;
  }

  const target = new URL(req.url, API_URL);
  const mod = target.protocol === "https:" ? https : http;

  const headers = { ...req.headers, host: target.host };
  delete headers["connection"];

  const proxyReq = mod.request(
    target,
    { method: req.method, headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (e) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API unreachable", detail: e.message }));
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url === "/api") {
    return proxyToApi(req, res);
  }

  let url = req.url.split("?")[0];
  let filePath = path.join(ROOT, url);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, "index.html");
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  try {
    const content = fs.readFileSync(filePath);
    if (ext && ext !== ".html") {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`[admin-ui] Serving on port ${PORT}`);
  if (API_URL) console.log(`[admin-ui] Proxying /api -> ${API_URL}`);
});
