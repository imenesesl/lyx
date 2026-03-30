import { createStore, type StoreApi } from "zustand/vanilla";
import { devtools } from "zustand/middleware";

type Listener = () => void;

interface LyxStoreState {
  slices: Record<string, unknown>;
}

interface InternalStore extends LyxStoreState {
  _listeners: Record<string, Set<Listener>>;
}

function getGlobalStore(): StoreApi<InternalStore> {
  const w = globalThis as any;
  if (!w.__lyx_zustand_store__) {
    w.__lyx_zustand_store__ = createStore<InternalStore>()(
      devtools(
        () => ({ slices: {} as Record<string, unknown>, _listeners: {} as Record<string, Set<Listener>> }),
        { name: "Lyx Shared State", enabled: true }
      )
    );
  }
  return w.__lyx_zustand_store__;
}

export function getSharedValue<T>(key: string): T | undefined {
  return getGlobalStore().getState().slices[key] as T | undefined;
}

export function setSharedValue<T>(key: string, value: T | ((prev: T) => T)): void {
  const store = getGlobalStore();
  const state = store.getState();
  const prev = state.slices[key] as T;
  const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;

  (store.setState as any)(
    { slices: { ...state.slices, [key]: next } },
    false,
    `shared/${key}`
  );

  state._listeners[key]?.forEach((l: Listener) => l());
}

export function subscribeShared(key: string, listener: Listener): () => void {
  const store = getGlobalStore();
  const state = store.getState();
  if (!state._listeners[key]) {
    state._listeners[key] = new Set();
  }
  state._listeners[key].add(listener);
  return () => {
    state._listeners[key]?.delete(listener);
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
    (store.setState as any)(
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
