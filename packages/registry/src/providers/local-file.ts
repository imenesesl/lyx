import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  MFERegistryEntry,
  RegistryProvider,
  RegistryQuery,
} from "@lyx/types";

export class LocalFileProvider implements RegistryProvider {
  private filePath: string;
  private store: Map<string, MFERegistryEntry>;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      `${process.env.HOME ?? process.env.USERPROFILE}/.lyx/registry.json`;
    this.store = new Map();
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      this.persist();
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const entries: MFERegistryEntry[] = JSON.parse(raw);
      this.store = new Map(entries.map((e) => [e.name, e]));
    } catch {
      this.store = new Map();
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      this.filePath,
      JSON.stringify(Array.from(this.store.values()), null, 2),
      "utf-8"
    );
  }

  async register(entry: MFERegistryEntry): Promise<void> {
    this.store.set(entry.name, entry);
    this.persist();
  }

  async unregister(name: string): Promise<void> {
    this.store.delete(name);
    this.persist();
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
