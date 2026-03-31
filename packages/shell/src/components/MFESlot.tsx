import React, { Suspense, useEffect, useState, useRef, type ComponentType } from "react";
import * as ReactDOM from "react-dom";
import type { MFERegistryEntry } from "@lyx/types";
import { startLoadTimer, reportRenderError } from "@lyx/sdk";

interface SharedConfig {
  singleton?: boolean;
  requiredVersion: false | string;
  eager?: boolean;
}

interface ShareArgs {
  version?: string;
  scope?: string | Array<string>;
  shareConfig?: SharedConfig;
  get?: (() => () => unknown) | (() => Promise<() => unknown>);
  lib?: () => unknown;
  loaded?: boolean;
}
import { ErrorBoundary } from "./ErrorBoundary";
import { SlotSkeleton } from "./SlotSkeleton";
import { ShadowContainer } from "./ShadowContainer";
import { startStyleCapture, type CapturedStyles } from "./styleCapture";

const isServer = typeof window === "undefined";

type CssIsolationMode = "shadow" | "none";

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
  const [Component, setComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<string>("");
  const mfeInfoRef = useRef<{ name: string; version: string }>({ name: "", version: "" });
  const [capturedStyles, setCapturedStyles] = useState<CapturedStyles>({ css: [], links: [] });
  const [isolationMode, setIsolationMode] = useState<CssIsolationMode>("shadow");

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

        const isolation = resolveCssIsolation(entry);
        if (!cancelled) setIsolationMode(isolation);

        const capture = isolation === "shadow" ? startStyleCapture() : null;

        const loadTimerWithVersion = startLoadTimer(entry.name, entry.version ?? "unknown", slot);
        const comp = await loadMFEComponent(entry, mf);

        if (capture) {
          const styles = capture.stop();
          if (!cancelled) setCapturedStyles(styles);
        }

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

  const mfeContent = (
    <ErrorBoundary
      fallback={<SlotPlaceholder slot={slot} state="crashed" />}
      onError={onCrash}
    >
      <Suspense fallback={skeletonFallback}>
        <Component {...mergedProps} />
      </Suspense>
    </ErrorBoundary>
  );

  if (isolationMode === "shadow") {
    return (
      <ShadowContainer
        styles={capturedStyles.css}
        styleLinks={capturedStyles.links}
      >
        {mfeContent}
      </ShadowContainer>
    );
  }

  return mfeContent;
}

function resolveCssIsolation(entry: MFERegistryEntry): CssIsolationMode {
  const raw = entry.metadata?.cssIsolation;
  if (raw === "none") return "none";
  return "shadow";
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
  const colors: Record<string, string> = {
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
): Promise<ComponentType<Record<string, unknown>> | null> {
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
          } satisfies ShareArgs,
          "react-dom": {
            version: ReactDOM.version ?? React.version,
            scope: "default",
            lib: () => ReactDOM,
            shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
          } satisfies ShareArgs,
        },
      });
    } catch { /* already initialized */ }

    try {
      const reactShared: ShareArgs = {
        version: React.version,
        scope: "default",
        get: async () => () => React,
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
        loaded: true,
      };
      const reactDomShared: ShareArgs = {
        version: ReactDOM.version ?? React.version,
        scope: "default",
        get: async () => () => ReactDOM,
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
        loaded: true,
      };
      mf.registerShared({ react: reactShared, "react-dom": reactDomShared });
    } catch { /* already registered */ }

    runtimeInitialized = true;
  }

  const ts = entry.timestamp ?? Date.now();
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

  interface RemoteModule {
    default?: ComponentType<Record<string, unknown>>;
  }
  const mod = await mf.loadRemote(`${key}/default`) as RemoteModule | null;

  if (!mod) return null;
  return mod.default ?? null;
}
