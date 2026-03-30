import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lyxPlugin } from "../../../packages/vite-plugin/src/index";

export default defineConfig({
  plugins: [react(), ...lyxPlugin()],
});
