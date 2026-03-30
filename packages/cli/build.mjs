import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  format: "esm",
  platform: "node",
  target: "node18",
  bundle: true,
  external: ["chalk", "ora", "execa", "tar", "commander"],
});
