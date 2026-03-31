import type { MFEContracts } from "./contracts";

/**
 * "shadow" — Shadow DOM wraps the MFE; styles are fully isolated (default).
 * "none"   — no isolation; MFE styles leak into / inherit from the page.
 */
export type CssIsolationMode = "shadow" | "none";

/**
 * Minimal configuration that a vibe coder writes in mfe.config.json.
 * Only `name` and `slot` are required -- the framework handles the rest.
 */
export interface MFEConfig {
  name: string;
  slot: string;
  version?: string;
  /** Override the default entry file (defaults to "./src/index.tsx") */
  entry?: string;
  /** Extra modules to expose beyond the default export */
  exposes?: Record<string, string>;
  /** Extra shared dependencies beyond React */
  shared?: Record<string, SharedDepConfig>;
  /** Inter-MFE communication contracts for validation */
  contracts?: MFEContracts;
  /** CSS isolation strategy — defaults to "shadow" for automatic scoping */
  cssIsolation?: CssIsolationMode;
}

export interface SharedDepConfig {
  singleton?: boolean;
  requiredVersion?: string;
  eager?: boolean;
}
