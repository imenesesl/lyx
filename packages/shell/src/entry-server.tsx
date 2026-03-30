import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import type { Layout } from "@lyx/types";
import { ShellApp } from "./ShellApp";
import type { Writable } from "node:stream";
import { Transform } from "node:stream";

export interface SSRRenderOptions {
  slug: string;
  accountId?: string;
  layout: Layout;
  clientAssets: { js: string[]; css: string[] };
}

export function render(options: SSRRenderOptions) {
  const { slug, accountId, layout, clientAssets } = options;

  const registryBase = accountId
    ? `/api/runtime/${accountId}/${slug}`
    : `/api/runtime/${slug}`;
  const initialData = JSON.stringify({ layout, registryBase, slug });

  const htmlHead = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lyx &mdash; ${slug}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
    #root { min-height: 100vh; }
  </style>
  ${clientAssets.css.map((href) => `<link rel="stylesheet" href="${href}" />`).join("\n  ")}
</head>
<body>
  <div id="root">`;

  const htmlTail = `</div>
  <script>window.__LYX_INITIAL__=${initialData}</script>
  ${clientAssets.js.map((src) => `<script type="module" src="${src}"></script>`).join("\n  ")}
</body>
</html>`;

  return {
    renderStream(res: Writable) {
      const app = (
        <React.StrictMode>
          <ShellApp initialLayout={layout} initialSlug={slug} />
        </React.StrictMode>
      );

      const { pipe } = renderToPipeableStream(app, {
        onShellReady() {
          res.write(htmlHead);

          const transform = new Transform({
            transform(chunk, _encoding, callback) {
              callback(null, chunk);
            },
            flush(callback) {
              this.push(htmlTail);
              callback();
            },
          });

          transform.pipe(res);
          pipe(transform);
        },

        onShellError(err) {
          res.end(`<!DOCTYPE html><html><body><h1>SSR Error</h1><p>${String(err)}</p></body></html>`);
        },

        onError(err) {
          console.error("[lyx-ssr] render error:", err);
        },
      });
    },
  };
}
