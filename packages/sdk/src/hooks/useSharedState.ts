import { useSyncExternalStore, useCallback, useRef } from "react";
import type { SharedStateSetter } from "@lyx/types";
import { getSharedValue, setSharedValue, subscribeShared } from "../store";

/**
 * React hook for shared state across MFEs.
 * Works like useState but the state is shared globally via zustand.
 * Visible in Redux DevTools under "Lyx Shared State".
 *
 * @example
 * const [user, setUser] = useSharedState("user", { name: "", loggedIn: false });
 */
export function useSharedState<T>(
  key: string,
  initialValue: T
): [T, SharedStateSetter<T>] {
  const initRef = useRef(false);
  if (!initRef.current) {
    if (getSharedValue(key) === undefined) {
      setSharedValue(key, initialValue);
    }
    initRef.current = true;
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeShared(key, onStoreChange),
    [key]
  );

  const getSnapshot = useCallback(
    () => (getSharedValue<T>(key) ?? initialValue) as T,
    [key, initialValue]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue: SharedStateSetter<T> = useCallback(
    (valOrFn) => setSharedValue<T>(key, valOrFn as T | ((prev: T) => T)),
    [key]
  );

  return [value, setValue];
}
