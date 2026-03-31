import type { ComponentType } from "react";
import type { MFERegistryEntry } from "@lyx/types";
import { getLyxConfig } from "./config";

type AnyComponent = ComponentType<Record<string, unknown>>;

interface MFEContainer {
  init?: (shareScopes: Record<string, unknown>) => Promise<void>;
  get: (module: string) => Promise<() => { default?: AnyComponent }>;
}

function getWindowProperty(key: string): unknown {
  return (window as unknown as Record<string, unknown>)[key];
}

function getWindowContainer(name: string): MFEContainer | undefined {
  return getWindowProperty(name) as MFEContainer | undefined;
}

function getWebpackShareScopes(): { default?: Record<string, unknown> } | undefined {
  return getWindowProperty("__webpack_share_scopes__") as
    { default?: Record<string, unknown> } | undefined;
}

const moduleCache = new Map<string, AnyComponent>();

export async function loadMFE(
  name: string,
  registryUrl?: string
): Promise<AnyComponent> {
  if (moduleCache.has(name)) {
    return moduleCache.get(name)!;
  }

  const url = registryUrl ?? getLyxConfig().registryUrl;
  const res = await fetch(`${url}/mfes/${name}`);
  if (!res.ok) {
    throw new Error(`[lyx] MFE "${name}" not found in registry`);
  }

  const entry: MFERegistryEntry = await res.json();
  const Component = await loadRemoteScript(entry);
  moduleCache.set(name, Component);
  return Component;
}

async function loadRemoteScript(
  entry: MFERegistryEntry
): Promise<AnyComponent> {
  const { name, remoteEntry } = entry;

  const existing = getWindowContainer(name);
  if (existing) {
    return extractDefault(existing);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = remoteEntry;
    script.type = "text/javascript";
    script.async = true;

    script.onload = async () => {
      try {
        const container = getWindowContainer(name);
        if (!container) {
          reject(new Error(`[lyx] Container "${name}" not found after loading script`));
          return;
        }
        resolve(await extractDefault(container));
      } catch (err) {
        reject(err);
      }
    };

    script.onerror = () =>
      reject(new Error(`[lyx] Failed to load remote entry: ${remoteEntry}`));

    document.head.appendChild(script);
  });
}

async function extractDefault(
  container: MFEContainer
): Promise<AnyComponent> {
  if (typeof container.init === "function") {
    const scopes = getWebpackShareScopes() as { default?: Record<string, unknown> } | undefined;
    if (scopes?.default) {
      await container.init(scopes.default);
    }
  }
  const factory = await container.get("./default");
  const mod = factory();
  return mod.default ?? (() => null);
}
