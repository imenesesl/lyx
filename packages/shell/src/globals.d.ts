import type { Layout } from "@lyx/types";

interface LyxInitialData {
  layout: Layout;
  slug: string;
  registryBase: string;
}

interface LyxGlobalStore {
  getState(): { slices: Record<string, unknown> };
  subscribe(listener: (state: { slices: Record<string, unknown> }, prev: { slices: Record<string, unknown> }) => void): () => void;
}

declare global {
  interface Window {
    __LYX_INITIAL__?: LyxInitialData;
    __lyx_zustand_store__?: LyxGlobalStore;
  }

  var __lyx_zustand_store__: LyxGlobalStore | undefined;

  const __LYX_REGISTRY_URL__: string;
}
