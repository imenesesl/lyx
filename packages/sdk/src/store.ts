import { createStore } from "zustand/vanilla";
import { devtools, type NamedSet } from "zustand/middleware";

type Listener = () => void;

interface LyxStoreState {
  slices: Record<string, unknown>;
}

type DevtoolsSetState = NamedSet<LyxStoreState>;

const sliceListeners = new Map<string, Set<Listener>>();

interface LyxGlobal {
  __lyx_zustand_store__?: ReturnType<typeof createLyxStore>;
}

function createLyxStore() {
  return createStore<LyxStoreState>()(
    devtools(
      () => ({
        slices: {} as Record<string, unknown>,
      }),
      { name: "Lyx Shared State", enabled: true }
    )
  );
}

function getGlobalStore() {
  const g = globalThis as typeof globalThis & LyxGlobal;
  if (!g.__lyx_zustand_store__) {
    g.__lyx_zustand_store__ = createLyxStore();
  }
  return g.__lyx_zustand_store__;
}

export function getSharedValue<T>(key: string): T | undefined {
  return getGlobalStore().getState().slices[key] as T | undefined;
}

export function setSharedValue<T>(key: string, value: T | ((prev: T) => T)): void {
  const store = getGlobalStore();
  const state = store.getState();
  const prev = state.slices[key] as T;
  const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;

  const setState = store.setState as DevtoolsSetState;
  setState(
    { slices: { ...state.slices, [key]: next } },
    false,
    `shared/${key}`
  );

  sliceListeners.get(key)?.forEach((l) => l());
}

export function subscribeShared(key: string, listener: Listener): () => void {
  if (!sliceListeners.has(key)) {
    sliceListeners.set(key, new Set());
  }
  sliceListeners.get(key)!.add(listener);
  return () => {
    sliceListeners.get(key)?.delete(listener);
  };
}

export function getSharedSnapshot(): Record<string, unknown> {
  return getGlobalStore().getState().slices;
}

export function subscribeSnapshot(listener: Listener): () => void {
  return getGlobalStore().subscribe(listener);
}

/**
 * Create a typed shared store for structured cross-MFE state.
 *
 * @example
 * const authStore = createSharedStore("auth", { user: null, token: "" });
 * authStore.get().user;
 * authStore.set({ user: { name: "Luis" }, token: "abc" });
 * authStore.subscribe((state) => console.log(state));
 */
export function createSharedStore<T extends Record<string, unknown>>(
  name: string,
  initialState: T
) {
  const store = getGlobalStore();
  if (!(name in store.getState().slices)) {
    const setState = store.setState as DevtoolsSetState;
    setState(
      { slices: { ...store.getState().slices, [name]: initialState } },
      false,
      `shared/${name}/init`
    );
  }

  return {
    get(): T {
      return (getGlobalStore().getState().slices[name] ?? initialState) as T;
    },

    set(partial: Partial<T> | ((prev: T) => Partial<T>)): void {
      const current = this.get();
      const next = typeof partial === "function" ? partial(current) : partial;
      setSharedValue(name, { ...current, ...next });
    },

    subscribe(listener: (state: T) => void): () => void {
      return subscribeShared(name, () => listener(this.get()));
    },

    reset(): void {
      setSharedValue(name, initialState);
    },
  };
}
