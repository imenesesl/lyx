import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { MFEConfig } from "@lyx/types";

/**
 * Locate and parse mfe.config.json, walking up from cwd if needed.
 */
export function readMfeConfig(explicitPath?: string): MFEConfig {
  const configPath = explicitPath
    ? resolve(explicitPath)
    : findConfigFile(process.cwd());

  if (!configPath || !existsSync(configPath)) {
    throw new Error(
      `[lyx] Could not find mfe.config.json. ` +
        `Create one with at least { "name": "my-mfe", "slot": "main" }`
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const config: MFEConfig = JSON.parse(raw);

  if (!config.name || !config.slot) {
    throw new Error(
      `[lyx] mfe.config.json must have "name" and "slot" fields.`
    );
  }

  return config;
}

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, "mfe.config.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
