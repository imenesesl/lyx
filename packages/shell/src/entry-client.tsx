import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { ShellApp } from "./ShellApp";

const container = document.getElementById("root")!;
const initialData = window.__LYX_INITIAL__;

function renderApp() {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ShellApp
        initialLayout={initialData?.layout}
        initialSlug={initialData?.slug}
        initialRegistryBase={initialData?.registryBase}
      />
    </React.StrictMode>
  );
}

if (initialData && container.innerHTML.trim()) {
  try {
    hydrateRoot(
      container,
      <React.StrictMode>
        <ShellApp
          initialLayout={initialData.layout}
          initialSlug={initialData.slug}
          initialRegistryBase={initialData.registryBase}
        />
      </React.StrictMode>,
      {
        onRecoverableError(error) {
          console.warn("[lyx] Hydration recovery:", error);
        },
      }
    );
  } catch {
    container.innerHTML = "";
    renderApp();
  }
} else {
  renderApp();
}
