import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { ShellApp } from "./ShellApp";

const container = document.getElementById("root")!;
const initialData = (window as any).__LYX_INITIAL__;

if (initialData && container.innerHTML.trim()) {
  hydrateRoot(
    container,
    <React.StrictMode>
      <ShellApp
        initialLayout={initialData.layout}
        initialSlug={initialData.slug}
        initialRegistryBase={initialData.registryBase}
      />
    </React.StrictMode>
  );
} else {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ShellApp />
    </React.StrictMode>
  );
}
