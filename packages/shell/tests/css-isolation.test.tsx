import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import type { MFERegistryEntry } from "@lyx/types";

const mockInit = vi.fn();
const mockRegisterShared = vi.fn();
const mockRegisterRemotes = vi.fn();
const mockLoadRemote = vi.fn();

vi.mock("@module-federation/runtime", () => ({
  init: (...args: unknown[]) => mockInit(...args),
  registerShared: (...args: unknown[]) => mockRegisterShared(...args),
  registerRemotes: (...args: unknown[]) => mockRegisterRemotes(...args),
  loadRemote: (...args: unknown[]) => mockLoadRemote(...args),
}));

import { loadMFEComponent, __resetMFRuntime } from "../src/components/MFESlot";

const BASE_ENTRY: MFERegistryEntry = {
  name: "css-test-mfe",
  remoteEntry: "http://example.com/remoteEntry.js",
  version: "1.0.0",
  slot: "main",
  timestamp: Date.now(),
};

describe("CSS isolation — loadMFEComponent with metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetMFRuntime();
    mockLoadRemote.mockResolvedValue({
      default: () => React.createElement("div", null, "isolated"),
    });
  });

  it("loads component when metadata.cssIsolation is 'shadow'", async () => {
    const entry: MFERegistryEntry = {
      ...BASE_ENTRY,
      metadata: { cssIsolation: "shadow" },
    };

    const mf = await import("@module-federation/runtime");
    const comp = await loadMFEComponent(entry, mf);
    expect(comp).not.toBeNull();
  });

  it("loads component when metadata.cssIsolation is 'none'", async () => {
    const entry: MFERegistryEntry = {
      ...BASE_ENTRY,
      metadata: { cssIsolation: "none" },
    };

    const mf = await import("@module-federation/runtime");
    const comp = await loadMFEComponent(entry, mf);
    expect(comp).not.toBeNull();
  });

  it("loads component when metadata is undefined (defaults to shadow)", async () => {
    const entry: MFERegistryEntry = { ...BASE_ENTRY };

    const mf = await import("@module-federation/runtime");
    const comp = await loadMFEComponent(entry, mf);
    expect(comp).not.toBeNull();
  });

  it("loads component when metadata has unrelated fields", async () => {
    const entry: MFERegistryEntry = {
      ...BASE_ENTRY,
      metadata: { author: "test", tags: ["ui"] },
    };

    const mf = await import("@module-federation/runtime");
    const comp = await loadMFEComponent(entry, mf);
    expect(comp).not.toBeNull();
  });
});
