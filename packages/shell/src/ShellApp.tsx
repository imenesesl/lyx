import React, { useEffect, useState } from "react";
import type { Layout } from "@lyx/types";
import { LayoutRenderer } from "./engine/LayoutRenderer";

const isServer = typeof window === "undefined";

function getAppIdentifier(ssrSlug?: string): { accountId: string; slug: string } {
  if (ssrSlug) return { accountId: "", slug: ssrSlug };
  if (isServer) return { accountId: "", slug: "" };
  const match = window.location.pathname.match(/^\/([a-z0-9][a-z0-9-]{1,30}[a-z0-9]|[a-f0-9]{24})\/([^/]+)/);
  if (match) return { accountId: match[1], slug: match[2] };
  return { accountId: "", slug: "" };
}

function getRegistryBase(accountId: string, slug: string): string {
  if (accountId && slug) {
    return `/api/runtime/${accountId}/${slug}`;
  }
  if (slug) {
    return `/api/runtime/${slug}`;
  }
  if (!isServer && typeof __LYX_REGISTRY_URL__ !== "undefined") {
    return __LYX_REGISTRY_URL__;
  }
  return "http://localhost:3456";
}

declare const __LYX_REGISTRY_URL__: string;

export interface ShellAppProps {
  initialLayout?: Layout;
  initialSlug?: string;
  initialRegistryBase?: string;
}

export function ShellApp({ initialLayout, initialSlug, initialRegistryBase }: ShellAppProps) {
  const [appId] = useState(() => getAppIdentifier(initialSlug));
  const slug = appId.slug;
  const registryBase = initialRegistryBase || getRegistryBase(appId.accountId, slug);
  const [layout, setLayout] = useState<Layout | null>(initialLayout ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (layout) return;
    if (isServer) return;

    if (!slug) {
      setError("No app specified. Visit /{accountId}/{slug}/ to load an app.");
      return;
    }

    fetch(`${registryBase}/layout`)
      .then(async (res) => {
        if (res.ok) {
          setLayout(await res.json());
        } else {
          setError(`App "${slug}" not found or has no published version.`);
        }
      })
      .catch(() => setError("Cannot reach the Lyx API server."));
  }, []);

  if (error) {
    return (
      <div style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        color: "#666",
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#333", marginBottom: 8 }}>Lyx Shell</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <p>Loading {slug}...</p>
      </div>
    );
  }

  return (
    <>
      <LayoutRenderer layout={layout} registryUrl={registryBase} />
      {!isServer && <ClientOnlyDevtools />}
    </>
  );
}

function ClientOnlyDevtools() {
  const [Devtools, setDevtools] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import("./components/LyxDevtools").then((m) => {
      setDevtools(() => m.LyxDevtools);
    });
  }, []);

  if (!Devtools) return null;
  return <Devtools />;
}
