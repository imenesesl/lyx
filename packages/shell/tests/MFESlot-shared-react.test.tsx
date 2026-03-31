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

const FAKE_ENTRY: MFERegistryEntry = {
  name: "test-mfe",
  remoteEntry: "http://example.com/remoteEntry.js",
  version: "1.0.0",
  slot: "main",
  timestamp: Date.now(),
};

describe("MFESlot shared React registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetMFRuntime();
    mockLoadRemote.mockResolvedValue({
      default: () => React.createElement("div", null, "MFE content"),
    });
  });

  it("init() registers react with singleton:true and lib callback returning host React", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    expect(mockInit).toHaveBeenCalledTimes(1);
    const config = mockInit.mock.calls[0][0];

    expect(config.name).toBe("lyx_shell");
    expect(config.shared.react).toBeDefined();
    expect(config.shared.react.version).toBe(React.version);
    expect(config.shared.react.shareConfig.singleton).toBe(true);
    expect(config.shared.react.lib()).toBe(React);
  });

  it("init() registers react-dom with singleton:true and lib callback", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    const config = mockInit.mock.calls[0][0];
    expect(config.shared["react-dom"]).toBeDefined();
    expect(config.shared["react-dom"].shareConfig.singleton).toBe(true);
    expect(typeof config.shared["react-dom"].lib).toBe("function");
    expect(config.shared["react-dom"].lib()).toBeDefined();
  });

  it("registerShared() is called with loaded:true to make host React available to remotes", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    expect(mockRegisterShared).toHaveBeenCalledTimes(1);
    const shared = mockRegisterShared.mock.calls[0][0];

    expect(shared.react.loaded).toBe(true);
    expect(shared.react.version).toBe(React.version);
    expect(shared.react.shareConfig.singleton).toBe(true);

    const getter = await shared.react.get();
    expect(typeof getter).toBe("function");
    expect(getter()).toBe(React);
  });

  it("registerShared() react-dom has loaded:true and get callback", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    const shared = mockRegisterShared.mock.calls[0][0];
    expect(shared["react-dom"].loaded).toBe(true);
    expect(shared["react-dom"].shareConfig.singleton).toBe(true);

    const getter = await shared["react-dom"].get();
    expect(typeof getter).toBe("function");
  });

  it("runtime initialization happens exactly once across multiple MFE loads", async () => {
    const mf = await import("@module-federation/runtime");

    await loadMFEComponent(FAKE_ENTRY, mf);
    await loadMFEComponent(
      { ...FAKE_ENTRY, name: "mfe-b", version: "2.0.0" },
      mf,
    );
    await loadMFEComponent(
      { ...FAKE_ENTRY, name: "mfe-c", version: "3.0.0" },
      mf,
    );

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockRegisterShared).toHaveBeenCalledTimes(1);
    expect(mockRegisterRemotes).toHaveBeenCalledTimes(3);
  });

  it("registers remote with type:module, force:true, and cache-bust query param", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    expect(mockRegisterRemotes).toHaveBeenCalledTimes(1);
    const [remotes, opts] = mockRegisterRemotes.mock.calls[0];
    expect(opts).toEqual({ force: true });
    expect(remotes).toHaveLength(1);
    expect(remotes[0].name).toBe("test-mfe_v1_0_0");
    expect(remotes[0].type).toBe("module");
    expect(remotes[0].entry).toMatch(/^http:\/\/example\.com\/remoteEntry\.js\?t=\d+$/);
  });

  it("loadRemote is called with {name}/default path", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    expect(mockLoadRemote).toHaveBeenCalledWith("test-mfe_v1_0_0/default");
  });

  it("returns the default export from the loaded module", async () => {
    const FakeComponent = () => React.createElement("span", null, "hello");
    mockLoadRemote.mockResolvedValue({ default: FakeComponent });

    const mf = await import("@module-federation/runtime");
    const result = await loadMFEComponent(FAKE_ENTRY, mf);

    expect(result).toBe(FakeComponent);
  });

  it("returns null when loadRemote returns null", async () => {
    mockLoadRemote.mockResolvedValue(null);

    const mf = await import("@module-federation/runtime");
    const result = await loadMFEComponent(FAKE_ENTRY, mf);

    expect(result).toBeNull();
  });

  it("shared react version matches the host React.version exactly", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY, mf);

    const initShared = mockInit.mock.calls[0][0].shared;
    const regShared = mockRegisterShared.mock.calls[0][0];

    expect(initShared.react.version).toBe(React.version);
    expect(regShared.react.version).toBe(React.version);
    expect(initShared.react.shareConfig.requiredVersion).toBe(`^${React.version}`);
  });
});
