import type { ComponentType } from "react";
import type { MFERegistryEntry } from "@lyx/types";
import { getLyxConfig } from "./config";

const moduleCache = new Map<string, ComponentType<any>>();

/**
 * Dynamically load an MFE by name from the registry.
 * Returns the default-exported React component.
 */
export async function loadMFE(
  name: string,
  registryUrl?: string
): Promise<ComponentType<any>> {
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
): Promise<ComponentType<any>> {
  const { name, remoteEntry } = entry;

  const existing = (window as any)[name];
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
        const container = (window as any)[name];
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
  container: any
): Promise<ComponentType<any>> {
  if (typeof container.init === "function") {
    const shareScopes = (window as any).__webpack_share_scopes__?.default;
    if (shareScopes) {
      await container.init(shareScopes);
    }
  }
  const factory = await container.get("./default");
  const mod = factory();
  return mod.default ?? mod;
}
