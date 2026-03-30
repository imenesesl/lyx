import { federation } from "@module-federation/vite";
import type { Plugin } from "vite";
import type { LyxHostPluginOptions } from "./options";

/**
 * Vite plugin for the Shell (host) app.
 * Configures Module Federation as a host that loads remotes dynamically at runtime.
 */
export function lyxHostPlugin(options: LyxHostPluginOptions = {}): Plugin[] {
  const registryUrl = options.registryUrl ?? "http://localhost:3456";

  const lyxHost: Plugin = {
    name: "lyx:host",
    enforce: "pre",
    config() {
      return {
        server: {
          port: 3000,
          strictPort: false,
          cors: true,
        },
        build: {
          target: "esnext",
        },
        define: {
          __LYX_REGISTRY_URL__: JSON.stringify(registryUrl),
        },
      };
    },
  };

  const mfPlugin = federation({
    name: "lyx_shell",
    filename: "remoteEntry.js",
    remotes: {},
    shared: {},
  });

  return [lyxHost, ...(Array.isArray(mfPlugin) ? mfPlugin : [mfPlugin])];
}
