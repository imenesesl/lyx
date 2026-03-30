import type {
  MFERegistryEntry,
  RegistryProvider,
  RegistryQuery,
} from "@lyx/types";

export class InMemoryProvider implements RegistryProvider {
  private store = new Map<string, MFERegistryEntry>();

  async register(entry: MFERegistryEntry): Promise<void> {
    this.store.set(entry.name, entry);
  }

  async unregister(name: string): Promise<void> {
    this.store.delete(name);
  }

  async get(name: string): Promise<MFERegistryEntry | null> {
    return this.store.get(name) ?? null;
  }

  async getBySlot(slot: string): Promise<MFERegistryEntry | null> {
    for (const entry of this.store.values()) {
      if (entry.slot === slot) return entry;
    }
    return null;
  }

  async list(): Promise<MFERegistryEntry[]> {
    return Array.from(this.store.values());
  }

  async query(q: RegistryQuery): Promise<MFERegistryEntry[]> {
    let results = Array.from(this.store.values());
    if (q.name) results = results.filter((e) => e.name === q.name);
    if (q.slot) results = results.filter((e) => e.slot === q.slot);
    return results;
  }
}
