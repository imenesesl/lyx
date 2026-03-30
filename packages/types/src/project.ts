import type { Layout } from "./layout";

export type LyxEnvironment = "local" | "development" | "staging" | "production";

/**
 * Global project config (lyx.config.json at the project root).
 */
export interface LyxProjectConfig {
  /** Display name for the project */
  name: string;
  /** Default layout to use */
  defaultLayout: string;
  /** Available layouts */
  layouts?: Layout[];
  /** Registry server URL (defaults to http://localhost:3456) */
  registryUrl?: string;
  /** Base port for MFE dev servers (auto-incremented per MFE) */
  basePort?: number;
  /** Environment */
  env?: LyxEnvironment;
}
