export type SharedStateSetter<T> = (value: T | ((prev: T) => T)) => void;

export interface SharedStateStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, listener: (value: T) => void): () => void;
}
