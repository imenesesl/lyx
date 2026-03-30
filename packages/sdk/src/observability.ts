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
  flushIntervalMs: 30_000,
  maxBufferSize: 50,
  enabled: true,
};

let config: ObservabilityConfig = { ...DEFAULT_CONFIG };
let buffer: MFEMetricEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function configureObservability(
  partial: Partial<ObservabilityConfig>
): void {
  config = { ...config, ...partial };

  if (!isServer && config.enabled && !flushTimer) {
    startFlushing();
  }
}

function startFlushing(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flush, config.flushIntervalMs);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        config.endpoint,
        JSON.stringify({ metrics: batch })
      );
      if (!ok) {
        await fetchFlush(batch);
      }
    } else {
      await fetchFlush(batch);
    }
  } catch {
    buffer.unshift(...batch.slice(-config.maxBufferSize));
  }
}

async function fetchFlush(batch: MFEMetricEvent[]): Promise<void> {
  await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics: batch }),
    keepalive: true,
  });
}

/**
 * Report a metric event. Buffers and sends in batches.
 */
export function reportMetric(event: MFEMetricEvent): void {
  if (isServer || !config.enabled) return;

  buffer.push(event);

  if (buffer.length >= config.maxBufferSize) {
    flush();
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
