import { useEffect, useRef } from "react";
import type { EventHandler } from "@lyx/types";
import { on } from "../events/event-bus";

/**
 * React hook to subscribe to Lyx events with automatic cleanup on unmount.
 *
 * @example
 * useEvent("cart:item-added", (data) => {
 *   console.log("Item added:", data);
 * });
 */
export function useEvent<T = unknown>(
  eventName: string,
  handler: EventHandler<T>
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = on<T>(eventName, (payload) => {
      handlerRef.current(payload);
    });

    return unsubscribe;
  }, [eventName]);
}
