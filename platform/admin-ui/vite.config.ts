import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/admin/",
  server: {
    port: 4001,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/storage": {
        target: "http://localhost:9000/lyx-bundles",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ""),
      },
    },
  },
});
