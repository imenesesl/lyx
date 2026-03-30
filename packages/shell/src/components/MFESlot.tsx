import React, { Suspense, useEffect, useState, useRef, type ComponentType } from "react";
import type { MFERegistryEntry } from "@lyx/types";
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { init, loadRemote, registerRemotes } = await import("@module-federation/runtime");

      const target = overrideMfe ?? slot;
      if (loadedRef.current === target && Component) return;

      setLoading(true);
      setError(null);

      try {
        const url = overrideMfe
          ? `${registryUrl}/mfes/by-name/${overrideMfe}`
          : `${registryUrl}/mfes/slot/${slot}`;

        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) {
            setLoading(false);
            setComponent(null);
          }
          return;
        }

        const entry: MFERegistryEntry = await res.json();
        const comp = await loadMFEComponent(entry, { init, loadRemote, registerRemotes });

        if (!cancelled && comp) {
          loadedRef.current = target;
          setComponent(() => comp);
        }
      } catch (err) {
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

  return (
    <ErrorBoundary fallback={<SlotPlaceholder slot={slot} state="crashed" />}>
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

function remoteKey(name: string, version: string): string {
  return `${name}_v${version.replace(/\./g, "_")}`;
}

async function loadMFEComponent(
  entry: MFERegistryEntry,
  mf: { init: any; loadRemote: any; registerRemotes: any }
): Promise<ComponentType<any> | null> {
  const { name, remoteEntry, version } = entry;

  if (!runtimeInitialized) {
    try {
      mf.init({ name: "lyx_shell", remotes: [] });
    } catch { /* already initialized */ }
    runtimeInitialized = true;
  }

  const entryUrl = remoteEntry.startsWith("http")
    ? remoteEntry
    : `${window.location.origin}${remoteEntry}`;

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
