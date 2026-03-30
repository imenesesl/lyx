import type { ComponentType } from "react";

export interface MFELoaderOptions {
  /** Name of the MFE in the registry */
  name: string;
  /** Target container element selector (for imperative loading) */
  container?: string;
  /** Props to pass to the loaded component */
  props?: Record<string, unknown>;
}

export interface MFELoaderResult {
  Component: ComponentType<Record<string, unknown>>;
  loading: boolean;
  error: Error | null;
}
