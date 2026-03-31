import type { Layout } from "@lyx/types";
import type { StoreApi } from "zustand";

interface LyxInitialData {
  layout: Layout;
  slug: string;
  registryBase: string;
}

interface LyxZustandStore extends StoreApi<{ slices: Record<string, unknown> }> {}

declare global {
  interface Window {
    __LYX_INITIAL__?: LyxInitialData;
    __lyx_zustand_store__?: LyxZustandStore;
  }

  var __lyx_zustand_store__: LyxZustandStore | undefined;

  const __LYX_REGISTRY_URL__: string;
}
