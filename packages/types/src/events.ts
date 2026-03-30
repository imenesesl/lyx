/**
 * Map of event names to their payload types.
 * Extend this interface to get type-safe events across MFEs.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventMap {
  [eventName: string]: unknown;
}

export type EventHandler<T = unknown> = (payload: T) => void;

export type EventUnsubscribe = () => void;
