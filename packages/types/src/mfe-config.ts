import type { MFEContracts } from "./contracts";

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
}

export interface SharedDepConfig {
  singleton?: boolean;
  requiredVersion?: string;
  eager?: boolean;
}
