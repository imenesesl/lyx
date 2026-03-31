import React, { Suspense, useEffect, useState, useRef, type ComponentType } from "react";
import * as ReactDOM from "react-dom";
import type { MFERegistryEntry } from "@lyx/types";
import { startLoadTimer, reportRenderError } from "@lyx/sdk";
import { ErrorBoundary } from "./ErrorBoundary";
import { SlotSkeleton } from "./SlotSkeleton";

const isServer = typeof window === "undefined";

interface MFESlotProps {
  slot: string;
  registryUrl: string;
  position?: string;
  fallback?: React.ReactNode;
  props?: Record<string, unknown>;
  overrideMfe?: string;
  overrideParams?: Record<string, string>;
}

export function MFESlot({
  slot,
  registryUrl,
  position = "center",
  fallback,
  props = {},
  overrideMfe,
  overrideParams,
}: MFESlotProps) {
  if (isServer) {
    return <SlotSkeleton position={position} slot={slot} />;
  }

  return (
    <ClientMFESlot
      slot={slot}
      registryUrl={registryUrl}
      position={position}
      fallback={fallback}
      props={props}
      overrideMfe={overrideMfe}
      overrideParams={overrideParams}
    />
  );
}

function ClientMFESlot({
  slot,
  registryUrl,
  position,
  fallback,
  props = {},
  overrideMfe,
  overrideParams,
}: MFESlotProps) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<string>("");
  const mfeInfoRef = useRef<{ name: string; version: string }>({ name: "", version: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const mf = await import("@module-federation/runtime");

      const target = overrideMfe ?? slot;
      if (loadedRef.current === target && Component) return;

      setLoading(true);
      setError(null);

      const timer = startLoadTimer(target, "unknown", slot);

      try {
        const baseUrl = overrideMfe
          ? `${registryUrl}/mfes/by-name/${overrideMfe}`
          : `${registryUrl}/mfes/slot/${slot}`;
        const url = `${baseUrl}?_=${Date.now()}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          timer.error(`HTTP ${res.status}`);
          if (!cancelled) {
            setLoading(false);
            setComponent(null);
          }
          return;
        }

        const entry: MFERegistryEntry = await res.json();
        mfeInfoRef.current = { name: entry.name, version: entry.version ?? "unknown" };

        const loadTimerWithVersion = startLoadTimer(entry.name, entry.version ?? "unknown", slot);
        const comp = await loadMFEComponent(entry, mf);

        if (!cancelled && comp) {
          loadedRef.current = target;
          setComponent(() => comp);
          loadTimerWithVersion.success();
        }
      } catch (err) {
        timer.error(String(err));
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slot, registryUrl, overrideMfe]);

  const skeletonFallback = fallback ?? <SlotSkeleton position={position ?? "center"} slot={slot} />;

  if (loading) {
    return <>{skeletonFallback}</>;
  }

  if (error) {
    return <SlotPlaceholder slot={slot} state="error" message={error} />;
  }

  if (!Component) {
    return <SlotPlaceholder slot={slot} state="empty" />;
  }

  const mergedProps = { ...props, ...(overrideParams ?? {}) };

  const onCrash = (err: Error) => {
    const info = mfeInfoRef.current;
    reportRenderError(info.name || slot, info.version || "unknown", slot, err.message);
  };

  return (
    <ErrorBoundary
      fallback={<SlotPlaceholder slot={slot} state="crashed" />}
      onError={onCrash}
    >
      <Suspense fallback={skeletonFallback}>
        <Component {...mergedProps} />
      </Suspense>
    </ErrorBoundary>
  );
}

function SlotPlaceholder({
  slot,
  state,
  message,
}: {
  slot: string;
  state: "empty" | "error" | "crashed";
  message?: string;
}) {
  const colors = {
    empty: "#fafafa",
    error: "#fff0f0",
    crashed: "#fff0f0",
  };

  return (
    <div
      style={{
        padding: 16,
        background: colors[state],
        border: "1px dashed #ccc",
        borderRadius: 4,
        textAlign: "center",
        color: "#999",
        fontSize: 14,
      }}
    >
      {state === "empty" && `[${slot}] — no MFE assigned`}
      {state === "error" && `Error loading ${slot}: ${message}`}
      {state === "crashed" && `${slot} crashed`}
    </div>
  );
}

let runtimeInitialized = false;
const registeredRemotes = new Map<string, string>();

/** @internal test-only: reset shared state between test runs */
export function __resetMFRuntime() {
  runtimeInitialized = false;
  registeredRemotes.clear();
}

function remoteKey(name: string, version: string): string {
  return `${name}_v${version.replace(/\./g, "_")}`;
}

export async function loadMFEComponent(
  entry: MFERegistryEntry,
  mf: typeof import("@module-federation/runtime")
): Promise<ComponentType<any> | null> {
  const { name, remoteEntry, version } = entry;

  if (!runtimeInitialized) {
    try {
      mf.init({
        name: "lyx_shell",
        remotes: [],
        shared: {
          react: {
            version: React.version,
            scope: "default",
            lib: () => React,
            shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
          },
          "react-dom": {
            version: (ReactDOM as any).version ?? React.version,
            scope: "default",
            lib: () => ReactDOM,
            shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
          },
        },
      });
    } catch { /* already initialized */ }

    try {
      mf.registerShared({
        react: {
          version: React.version,
          scope: "default",
          get: async () => () => React,
          lib: () => React,
          shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
          loaded: true,
        } as any,
        "react-dom": {
          version: (ReactDOM as any).version ?? React.version,
          scope: "default",
          get: async () => () => ReactDOM,
          lib: () => ReactDOM,
          shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
          loaded: true,
        } as any,
      });
    } catch { /* already registered */ }

    runtimeInitialized = true;
  }

  const ts = (entry as any).timestamp ?? Date.now();
  const rawUrl = remoteEntry.startsWith("http")
    ? remoteEntry
    : `${window.location.origin}${remoteEntry}`;
  const separator = rawUrl.includes("?") ? "&" : "?";
  const entryUrl = `${rawUrl}${separator}t=${ts}`;

  const key = remoteKey(name, version ?? "latest");

  if (registeredRemotes.get(key) !== entryUrl) {
    mf.registerRemotes(
      [{ name: key, entry: entryUrl, type: "module" }],
      { force: true }
    );
    registeredRemotes.set(key, entryUrl);
  }

  const mod = await mf.loadRemote(`${key}/default`) as
    { default: ComponentType<any> } | null;

  if (!mod) return null;
  return mod.default ?? (mod as any);
}
