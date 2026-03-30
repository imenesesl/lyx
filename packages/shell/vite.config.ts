import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lyxHostPlugin } from "@lyx/vite-plugin";

export default defineConfig({
  plugins: [react(), ...lyxHostPlugin()],
  base: "/_assets/",
  build: {
    outDir: "dist",
    manifest: true,
  },
  ssr: {
    noExternal: ["@lyx/types", "@lyx/sdk"],
  },
});
