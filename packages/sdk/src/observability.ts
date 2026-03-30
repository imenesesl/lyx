const isServer = typeof window === "undefined";

export type MetricType =
  | "load_success"
  | "load_error"
  | "render_error"
  | "event_timeout";

export interface MFEMetricEvent {
  mfeName: string;
  mfeVersion: string;
  slot: string;
  type: MetricType;
  loadTimeMs?: number;
  errorMessage?: string;
  timestamp: number;
}

interface ObservabilityConfig {
  endpoint: string;
  flushIntervalMs: number;
  maxBufferSize: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: ObservabilityConfig = {
  endpoint: "/api/metrics",
  flushIntervalMs: 10_000,
  maxBufferSize: 50,
  enabled: true,
};

let config: ObservabilityConfig = { ...DEFAULT_CONFIG };
let buffer: MFEMetricEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let firstFlushDone = false;
let listenersAttached = false;

export function configureObservability(
  partial: Partial<ObservabilityConfig>
): void {
  config = { ...config, ...partial };

  if (!isServer && config.enabled && !flushTimer) {
    startFlushing();
  }
}

function attachPageLifecycleListeners(): void {
  if (listenersAttached || isServer) return;
  listenersAttached = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSync();
  });

  window.addEventListener("beforeunload", () => {
    flushSync();
  });

  window.addEventListener("pagehide", () => {
    flushSync();
  });
}

function startFlushing(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushSync, config.flushIntervalMs);
  attachPageLifecycleListeners();
}

function flushSync(): void {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0);
  const payload = JSON.stringify({ metrics: batch });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(config.endpoint, blob);
      if (!ok) {
        sendViaFetch(payload);
      }
    } else {
      sendViaFetch(payload);
    }
  } catch {
    buffer.unshift(...batch.slice(-config.maxBufferSize));
  }
}

function sendViaFetch(payload: string): void {
  try {
    fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // best-effort
  }
}

/**
 * Report a metric event. Flushes immediately on the first event,
 * then batches subsequent events.
 */
export function reportMetric(event: MFEMetricEvent): void {
  if (isServer || !config.enabled) return;

  buffer.push(event);

  if (!firstFlushDone) {
    firstFlushDone = true;
    setTimeout(flushSync, 2000);
  }

  if (buffer.length >= config.maxBufferSize) {
    flushSync();
  }

  if (!flushTimer) {
    startFlushing();
  }
}

/**
 * Measure MFE load time. Returns a function to call on completion.
 */
export function startLoadTimer(
  mfeName: string,
  mfeVersion: string,
  slot: string
): { success: () => void; error: (msg: string) => void } {
  const start = performance.now();

  return {
    success() {
      reportMetric({
        mfeName,
        mfeVersion,
        slot,
        type: "load_success",
        loadTimeMs: Math.round(performance.now() - start),
        timestamp: Date.now(),
      });
    },
    error(msg: string) {
      reportMetric({
        mfeName,
        mfeVersion,
        slot,
        type: "load_error",
        loadTimeMs: Math.round(performance.now() - start),
        errorMessage: msg,
        timestamp: Date.now(),
      });
    },
  };
}

/**
 * Report an MFE render crash (called from ErrorBoundary).
 */
export function reportRenderError(
  mfeName: string,
  mfeVersion: string,
  slot: string,
  errorMessage: string
): void {
  reportMetric({
    mfeName,
    mfeVersion,
    slot,
    type: "render_error",
    errorMessage,
    timestamp: Date.now(),
  });
}
