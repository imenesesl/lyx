import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lyxPlugin } from "@lyx/vite-plugin";

export default defineConfig({
  plugins: [react(), ...lyxPlugin()],
});
