import { emit, on } from "./events/event-bus";
import type { EventUnsubscribe } from "@lyx/types";

export interface NavigatePayload {
  mfeName: string;
  targetSlot: string;
  params?: Record<string, string>;
}

/**
 * Navigate to an MFE by loading it in the specified slot.
 * The shell listens for "lyx:navigate" events and updates the layout.
 *
 * @example
 * navigate("dashboard");                        // loads in "main" slot
 * navigate("settings", "modal");                // loads in "modal" slot
 * navigate("profile", "main", { id: "42" });    // with params
 */
export function navigate(
  mfeName: string,
  targetSlot = "main",
  params?: Record<string, string>
): void {
  const payload: NavigatePayload = { mfeName, targetSlot, params };
  emit("lyx:navigate", payload);

  if (typeof window !== "undefined" && window.history) {
    const base = getAppBase();
    const search = params ? "?" + new URLSearchParams(params).toString() : "";
    window.history.pushState(
      { lyx: payload },
      "",
      `${base}${mfeName}${search}`
    );
  }
}

/**
 * Go back in browser history. Triggers popstate which the shell handles.
 */
export function goBack(): void {
  window.history.back();
}

/**
 * Subscribe to navigation changes (both navigate() calls and popstate).
 */
export function onNavigate(
  handler: (payload: NavigatePayload | null) => void
): EventUnsubscribe {
  const unsubEvent = on<NavigatePayload>("lyx:navigate", handler);

  const popstateHandler = (e: PopStateEvent) => {
    handler(e.state?.lyx ?? null);
  };
  window.addEventListener("popstate", popstateHandler);

  return () => {
    unsubEvent();
    window.removeEventListener("popstate", popstateHandler);
  };
}

function getAppBase(): string {
  if (typeof window === "undefined") return "/";
  const match = window.location.pathname.match(/^(\/apps\/[^/]+\/)/);
  return match?.[1] ?? "/";
}
