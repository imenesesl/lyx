import type { EventHandler, EventUnsubscribe } from "@lyx/types";

const LYX_EVENT_PREFIX = "lyx:";

/**
 * Emit a typed event that any MFE can listen to.
 */
export function emit<T = unknown>(eventName: string, payload: T): void {
  const event = new CustomEvent(LYX_EVENT_PREFIX + eventName, {
    detail: payload,
    bubbles: false,
    cancelable: false,
  });
  window.dispatchEvent(event);
}

/**
 * Subscribe to a typed event. Returns an unsubscribe function.
 */
export function on<T = unknown>(
  eventName: string,
  handler: EventHandler<T>
): EventUnsubscribe {
  const wrappedHandler = ((e: CustomEvent<T>) => {
    handler(e.detail);
  }) as EventListener;

  window.addEventListener(LYX_EVENT_PREFIX + eventName, wrappedHandler);

  return () => {
    window.removeEventListener(LYX_EVENT_PREFIX + eventName, wrappedHandler);
  };
}

/**
 * Unsubscribe a specific handler from an event.
 */
export function off(eventName: string, handler: EventListener): void {
  window.removeEventListener(LYX_EVENT_PREFIX + eventName, handler);
}
