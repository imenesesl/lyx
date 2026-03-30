export interface MFERegistryEntry {
  name: string;
  slot: string;
  version: string;
  remoteEntry: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RegistryQuery {
  name?: string;
  slot?: string;
}

/**
 * Abstract provider interface -- local JSON file now, DynamoDB later.
 */
export interface RegistryProvider {
  register(entry: MFERegistryEntry): Promise<void>;
  unregister(name: string): Promise<void>;
  get(name: string): Promise<MFERegistryEntry | null>;
  getBySlot(slot: string): Promise<MFERegistryEntry | null>;
  list(): Promise<MFERegistryEntry[]>;
  query(q: RegistryQuery): Promise<MFERegistryEntry[]>;
}
