import { federation } from "@module-federation/vite";
import type { Plugin } from "vite";
import type { MFEConfig } from "@lyx/types";
import type { LyxPluginOptions } from "./options";
import { readMfeConfig } from "./utils";

/**
 * Vite plugin for MFE remotes.
 * Reads mfe.config.json and auto-generates Module Federation configuration
 * so the vibe coder only needs to write `export default` components.
 */
export function lyxPlugin(options: LyxPluginOptions = {}): Plugin[] {
  let mfeConfig: MFEConfig;
  let serverPort: number;

  const registryUrl = options.registryUrl ?? "http://localhost:3456";

  const lyxCore: Plugin = {
    name: "lyx:core",
    enforce: "pre",

    config(_config, { command }) {
      mfeConfig = readMfeConfig(options.configPath);
      serverPort = options.port ?? 3100;

      const entry = mfeConfig.entry ?? "./src/index.tsx";

      return {
        server: {
          port: serverPort,
          strictPort: false,
          cors: true,
        },
        build: {
          target: "esnext",
        },
        define: {
          __LYX_MFE_NAME__: JSON.stringify(mfeConfig.name),
          __LYX_MFE_SLOT__: JSON.stringify(mfeConfig.slot),
        },
      };
    },

    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        const port =
          typeof address === "object" && address ? address.port : serverPort;

        registerWithRegistry(registryUrl, {
          name: mfeConfig.name,
          slot: mfeConfig.slot,
          version: mfeConfig.version ?? "0.0.0-dev",
          remoteEntry: `http://localhost:${port}/remoteEntry.js`,
          timestamp: Date.now(),
        }).catch(() => {
          /* registry may not be running yet */
        });
      });
    },
  };

  const mfEntry = mfeConfig! ?? readMfeConfig(options.configPath);
  const entry = mfEntry.entry ?? "./src/index.tsx";

  const mfPlugin = federation({
    name: mfEntry.name,
    filename: "remoteEntry.js",
    exposes: {
      "./default": entry,
      ...(mfEntry.exposes ?? {}),
    },
    shared: {
      react: { singleton: true, import: false, requiredVersion: false as any },
      "react-dom": { singleton: true, import: false, requiredVersion: false as any },
      ...(mfEntry.shared as any ?? {}),
    },
  });

  return [lyxCore, ...(Array.isArray(mfPlugin) ? mfPlugin : [mfPlugin])];
}

async function registerWithRegistry(
  url: string,
  entry: {
    name: string;
    slot: string;
    version: string;
    remoteEntry: string;
    timestamp: number;
  }
): Promise<void> {
  const response = await fetch(`${url}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error(`Registry registration failed: ${response.statusText}`);
  }
}
