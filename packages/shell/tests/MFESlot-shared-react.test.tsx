import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

const mockInit = vi.fn();
const mockRegisterShared = vi.fn();
const mockRegisterRemotes = vi.fn();
const mockLoadRemote = vi.fn();

vi.mock("@module-federation/runtime", () => ({
  init: (...args: any[]) => mockInit(...args),
  registerShared: (...args: any[]) => mockRegisterShared(...args),
  registerRemotes: (...args: any[]) => mockRegisterRemotes(...args),
  loadRemote: (...args: any[]) => mockLoadRemote(...args),
}));

import { loadMFEComponent, __resetMFRuntime } from "../src/components/MFESlot";

const FAKE_ENTRY = {
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
    await loadMFEComponent(FAKE_ENTRY as any, mf);

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
    await loadMFEComponent(FAKE_ENTRY as any, mf);

    const config = mockInit.mock.calls[0][0];
    expect(config.shared["react-dom"]).toBeDefined();
    expect(config.shared["react-dom"].shareConfig.singleton).toBe(true);
    expect(typeof config.shared["react-dom"].lib).toBe("function");
    expect(config.shared["react-dom"].lib()).toBeDefined();
  });

  it("registerShared() is called with loaded:true to make host React available to remotes", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY as any, mf);

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
    await loadMFEComponent(FAKE_ENTRY as any, mf);

    const shared = mockRegisterShared.mock.calls[0][0];
    expect(shared["react-dom"].loaded).toBe(true);
    expect(shared["react-dom"].shareConfig.singleton).toBe(true);

    const getter = await shared["react-dom"].get();
    expect(typeof getter).toBe("function");
  });

  it("runtime initialization happens exactly once across multiple MFE loads", async () => {
    const mf = await import("@module-federation/runtime");

    await loadMFEComponent(FAKE_ENTRY as any, mf);
    await loadMFEComponent(
      { ...FAKE_ENTRY, name: "mfe-b", version: "2.0.0" } as any,
      mf,
    );
    await loadMFEComponent(
      { ...FAKE_ENTRY, name: "mfe-c", version: "3.0.0" } as any,
      mf,
    );

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockRegisterShared).toHaveBeenCalledTimes(1);
    expect(mockRegisterRemotes).toHaveBeenCalledTimes(3);
  });

  it("registers remote with type:module and force:true", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY as any, mf);

    expect(mockRegisterRemotes).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: "test-mfe_v1_0_0",
          entry: "http://example.com/remoteEntry.js",
          type: "module",
        }),
      ],
      { force: true },
    );
  });

  it("loadRemote is called with {name}/default path", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY as any, mf);

    expect(mockLoadRemote).toHaveBeenCalledWith("test-mfe_v1_0_0/default");
  });

  it("returns the default export from the loaded module", async () => {
    const FakeComponent = () => React.createElement("span", null, "hello");
    mockLoadRemote.mockResolvedValue({ default: FakeComponent });

    const mf = await import("@module-federation/runtime");
    const result = await loadMFEComponent(FAKE_ENTRY as any, mf);

    expect(result).toBe(FakeComponent);
  });

  it("returns null when loadRemote returns null", async () => {
    mockLoadRemote.mockResolvedValue(null);

    const mf = await import("@module-federation/runtime");
    const result = await loadMFEComponent(FAKE_ENTRY as any, mf);

    expect(result).toBeNull();
  });

  it("shared react version matches the host React.version exactly", async () => {
    const mf = await import("@module-federation/runtime");
    await loadMFEComponent(FAKE_ENTRY as any, mf);

    const initShared = mockInit.mock.calls[0][0].shared;
    const regShared = mockRegisterShared.mock.calls[0][0];

    expect(initShared.react.version).toBe(React.version);
    expect(regShared.react.version).toBe(React.version);
    expect(initShared.react.shareConfig.requiredVersion).toBe(`^${React.version}`);
  });
});
