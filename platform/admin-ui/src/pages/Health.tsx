import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { useRefresh } from "../components/AppShell";
import { CardSkeleton } from "../components/Skeleton";

interface MFEHealth {
  mfeName: string;
  version: string;
  status: "green" | "yellow" | "red";
  total: number;
  errors: number;
  errorRate: number;
  availability: number;
  loadTime: { p50: number; p95: number; p99: number };
  recentErrors: Array<{ type: string; message?: string; timestamp: string }>;
}

interface HealthResponse {
  window: string;
  since: string;
  mfes: MFEHealth[];
  summary: { total: number; healthy: number; degraded: number; unhealthy: number };
}

interface BucketData {
  start: string;
  total: number;
  errors: number;
  errorRate: number;
  loadTimeP50: number;
  loadTimeP95: number;
}

interface DetailResponse {
  mfeName: string;
  window: string;
  buckets: BucketData[];
}

interface LogEntry {
  id: string;
  mfeName: string;
  mfeVersion: string;
  slot: string;
  type: "load_success" | "load_error" | "render_error" | "event_timeout";
  loadTimeMs?: number;
  errorMessage?: string;
  timestamp: string;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: { mfeNames: string[] };
}

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  load_success: { bg: "var(--success-muted)", color: "var(--success)", label: "LOAD OK" },
  load_error: { bg: "var(--danger-muted)", color: "var(--danger)", label: "LOAD ERR" },
  render_error: { bg: "var(--danger-muted)", color: "var(--danger)", label: "RENDER ERR" },
  event_timeout: { bg: "var(--warning-muted)", color: "var(--warning)", label: "TIMEOUT" },
};

const WINDOWS = [
  { label: "1h", value: 3600000 },
  { label: "6h", value: 21600000 },
  { label: "24h", value: 86400000 },
  { label: "7d", value: 604800000 },
];

const STATUS_COLORS = {
  green: "var(--success)",
  yellow: "var(--warning)",
  red: "var(--danger)",
};

const STATUS_BG = {
  green: "var(--success-muted)",
  yellow: "var(--warning-muted)",
  red: "var(--danger-muted)",
};

const STATUS_LABELS = {
  green: "Healthy",
  yellow: "Degraded",
  red: "Unhealthy",
};

export function Health() {
  const { refreshKey } = useRefresh();
  const [tab, setTab] = useState<"health" | "logs">("health");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowMs, setWindowMs] = useState(3600000);
  const [selectedMfe, setSelectedMfe] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<HealthResponse>(`/metrics/health?window=${windowMs}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refreshKey, windowMs]);

  useEffect(() => {
    if (!selectedMfe) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .get<DetailResponse>(`/metrics/health/${selectedMfe}?window=${windowMs}&buckets=24`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedMfe, windowMs, refreshKey]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>MFE Health</h1>
          <p className="page-subtitle">Per-MFE observability, error budgets, and logs</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              className={`btn btn-sm ${windowMs === w.value ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setWindowMs(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === "health" ? "tab-active" : ""}`} onClick={() => setTab("health")}>Dashboard</button>
        <button className={`tab ${tab === "logs" ? "tab-active" : ""}`} onClick={() => setTab("logs")}>Logs</button>
      </div>

      {tab === "logs" && <LogsPanel windowMs={windowMs} refreshKey={refreshKey} />}

      {tab === "health" && loading ? (
        <CardSkeleton count={4} />
      ) : tab === "health" && (!data || data.mfes.length === 0) ? (
        <div className="card empty-state" style={{ textAlign: "center", padding: 48 }}>
          <h3>No metrics yet</h3>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            MFE health data will appear once users interact with your applications.
          </p>
        </div>
      ) : tab === "health" && data ? (
        <>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>◱</div>
              <div>
                <div className="stat-value">{data.summary.total}</div>
                <div className="stat-label">Tracked MFEs</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--success-muted)", color: "var(--success)" }}>●</div>
              <div>
                <div className="stat-value">{data.summary.healthy}</div>
                <div className="stat-label">Healthy</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--warning-muted)", color: "var(--warning)" }}>●</div>
              <div>
                <div className="stat-value">{data.summary.degraded}</div>
                <div className="stat-label">Degraded</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--danger-muted)", color: "var(--danger)" }}>●</div>
              <div>
                <div className="stat-value">{data.summary.unhealthy}</div>
                <div className="stat-label">Unhealthy</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: selectedMfe ? "1fr 1fr" : "1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>MFE Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.mfes.map((mfe) => (
                  <div
                    key={mfe.mfeName}
                    className="card card-hover"
                    onClick={() => setSelectedMfe(selectedMfe === mfe.mfeName ? null : mfe.mfeName)}
                    style={{
                      padding: 16,
                      cursor: "pointer",
                      borderLeft: `3px solid ${STATUS_COLORS[mfe.status]}`,
                      background: selectedMfe === mfe.mfeName ? "var(--bg-hover)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: STATUS_COLORS[mfe.status],
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{mfe.mfeName}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          v{mfe.version}
                        </span>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: STATUS_BG[mfe.status],
                          color: STATUS_COLORS[mfe.status],
                        }}
                      >
                        {STATUS_LABELS[mfe.status]}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 12 }}>
                      <MetricValue label="Availability" value={`${mfe.availability}%`} />
                      <MetricValue label="Error Rate" value={`${mfe.errorRate}%`} />
                      <MetricValue label="p50 Load" value={`${mfe.loadTime.p50}ms`} />
                      <MetricValue label="p95 Load" value={`${mfe.loadTime.p95}ms`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedMfe && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                  {selectedMfe} — Detail
                </h3>
                {detailLoading ? (
                  <CardSkeleton count={1} />
                ) : detail ? (
                  <div className="card" style={{ padding: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Load Time (ms)</h4>
                    <MiniChart
                      buckets={detail.buckets}
                      getValue={(b) => b.loadTimeP50}
                      getSecondary={(b) => b.loadTimeP95}
                      color="var(--accent)"
                      secondaryColor="var(--accent-hover)"
                    />

                    <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 24, marginBottom: 16 }}>Error Rate (%)</h4>
                    <MiniChart
                      buckets={detail.buckets}
                      getValue={(b) => b.errorRate}
                      color="var(--danger)"
                    />

                    {data.mfes.find((m) => m.mfeName === selectedMfe)?.recentErrors?.length ? (
                      <>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 24, marginBottom: 12 }}>Recent Errors</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {data.mfes
                            .find((m) => m.mfeName === selectedMfe)
                            ?.recentErrors.map((err, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: 10,
                                  background: "var(--danger-muted)",
                                  borderRadius: "var(--radius)",
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span className="badge badge-danger">{err.type}</span>
                                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                                    {new Date(err.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                {err.message && (
                                  <div style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 11 }}>
                                    {err.message.slice(0, 200)}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="card empty-state">
                    <p>No detail data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniChart({
  buckets,
  getValue,
  getSecondary,
  color,
  secondaryColor,
}: {
  buckets: BucketData[];
  getValue: (b: BucketData) => number;
  getSecondary?: (b: BucketData) => number;
  color: string;
  secondaryColor?: string;
}) {
  if (buckets.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No data</div>;

  const values = buckets.map(getValue);
  const max = Math.max(...values, ...(getSecondary ? buckets.map(getSecondary) : []), 1);
  const h = 100;
  const w = 100;

  const toPath = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 100 }}>
      {getSecondary && (
        <path
          d={toPath(buckets.map(getSecondary))}
          fill="none"
          stroke={secondaryColor ?? color}
          strokeWidth="1"
          opacity="0.4"
        />
      )}
      <path d={toPath(values)} fill="none" stroke={color} strokeWidth="1.5" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i / (values.length - 1)) * w}
          cy={h - (v / max) * h}
          r="1.5"
          fill={color}
        >
          <title>
            {new Date(buckets[i].start).toLocaleTimeString()} — {getValue(buckets[i])}
          </title>
        </circle>
      ))}
    </svg>
  );
}

function LogsPanel({ windowMs, refreshKey }: { windowMs: number; refreshKey: number }) {
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [mfeFilter, setMfeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      window: String(windowMs),
      page: String(page),
      limit: "50",
    });
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (mfeFilter !== "all") params.set("mfe", mfeFilter);
    if (search) params.set("search", search);

    api
      .get<LogsResponse>(`/metrics/logs?${params}`)
      .then(setLogs)
      .catch(() => setLogs(null))
      .finally(() => setLoading(false));
  }, [windowMs, page, typeFilter, mfeFilter, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => { setPage(1); }, [typeFilter, mfeFilter, search, windowMs]);

  const handleSearch = () => { setSearch(searchInput); };

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ minWidth: 130 }}>
          <option value="all">All types</option>
          <option value="load_success">Load Success</option>
          <option value="load_error">Load Error</option>
          <option value="render_error">Render Error</option>
          <option value="event_timeout">Event Timeout</option>
        </select>

        <select className="select" value={mfeFilter} onChange={(e) => setMfeFilter(e.target.value)} style={{ minWidth: 130 }}>
          <option value="all">All MFEs</option>
          {(logs?.filters.mfeNames ?? []).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 200 }}>
          <input
            className="input"
            placeholder="Search error messages..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleSearch}>Search</button>
        </div>

        <button
          className={`btn btn-sm ${autoRefresh ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          title={autoRefresh ? "Auto-refresh ON (5s)" : "Auto-refresh OFF"}
        >
          {autoRefresh ? "⏸ Live" : "▶ Live"}
        </button>

        {logs && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
            {logs.pagination.total} events
          </span>
        )}
      </div>

      {/* Logs table */}
      {loading && !logs ? (
        <CardSkeleton count={3} />
      ) : !logs || logs.logs.length === 0 ? (
        <div className="card empty-state" style={{ textAlign: "center", padding: 48 }}>
          <h3>No logs found</h3>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            {search || typeFilter !== "all" || mfeFilter !== "all"
              ? "Try adjusting your filters."
              : "Logs will appear once MFEs are loaded by users."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ borderRadius: "var(--radius)", border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th style={thStyle}>Timestamp</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>MFE</th>
                  <th style={thStyle}>Version</th>
                  <th style={thStyle}>Slot</th>
                  <th style={thStyle}>Load Time</th>
                  <th style={{ ...thStyle, width: "40%" }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.logs.map((log) => {
                  const style = TYPE_STYLES[log.type] ?? TYPE_STYLES.load_success;
                  const isError = log.type === "load_error" || log.type === "render_error";
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isError ? "rgba(239, 68, 68, 0.04)" : undefined,
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10,
                          fontWeight: 600, background: style.bg, color: style.color, fontFamily: "monospace",
                        }}>
                          {style.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{log.mfeName}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>v{log.mfeVersion}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="badge badge-accent" style={{ fontSize: 10 }}>{log.slot}</span>
                      </td>
                      <td style={tdStyle}>
                        {log.loadTimeMs != null ? (
                          <span style={{
                            fontFamily: "monospace", fontSize: 11,
                            color: log.loadTimeMs > 3000 ? "var(--danger)" : log.loadTimeMs > 1000 ? "var(--warning)" : "var(--text-secondary)",
                          }}>
                            {log.loadTimeMs}ms
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {log.errorMessage ? (
                          <span style={{
                            fontFamily: "monospace", fontSize: 11, color: "var(--danger)",
                            wordBreak: "break-word", lineHeight: 1.4,
                          }}>
                            {log.errorMessage.length > 200 ? log.errorMessage.slice(0, 200) + "..." : log.errorMessage}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs.pagination.pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                Page {logs.pagination.page} of {logs.pagination.pages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= logs.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};
