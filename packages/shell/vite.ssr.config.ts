import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/_assets/",
  build: {
    outDir: "dist-ssr",
  },
  ssr: {
    noExternal: ["@lyx/types", "@lyx/sdk"],
    external: ["@module-federation/runtime"],
  },
});
