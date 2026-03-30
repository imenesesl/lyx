import React, { useEffect, useState, useCallback } from "react";

interface DevtoolsState {
  slices: Record<string, unknown>;
}

interface EventLogEntry {
  name: string;
  payload: unknown;
  timestamp: number;
}

function getStoreSnapshot(): Record<string, unknown> {
  const w = globalThis as any;
  return w.__lyx_zustand_store__?.getState()?.slices ?? {};
}

function subscribeStore(cb: () => void): () => void {
  const w = globalThis as any;
  if (w.__lyx_zustand_store__?.subscribe) {
    return w.__lyx_zustand_store__.subscribe(cb);
  }
  return () => {};
}

export function LyxDevtools() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"state" | "events" | "nav">("state");
  const [storeState, setStoreState] = useState<Record<string, unknown>>({});
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [navLog, setNavLog] = useState<Array<{ path: string; ts: number }>>([]);

  const refresh = useCallback(() => {
    setStoreState({ ...getStoreSnapshot() });
  }, []);

  useEffect(() => {
    const unsub = subscribeStore(refresh);
    refresh();
    return unsub;
  }, [refresh]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const name = e.type.replace("lyx:", "");
      setEventLog((prev) => [
        { name, payload: ce.detail, timestamp: Date.now() },
        ...prev.slice(0, 99),
      ]);
    };

    const origDispatch = window.dispatchEvent.bind(window);
    window.dispatchEvent = function (event: Event) {
      if (event.type.startsWith("lyx:")) {
        handler(event);
      }
      return origDispatch(event);
    };

    const popHandler = () => {
      setNavLog((prev) => [
        { path: window.location.pathname, ts: Date.now() },
        ...prev.slice(0, 49),
      ]);
    };
    window.addEventListener("popstate", popHandler);

    const origPush = window.history.pushState.bind(window.history);
    window.history.pushState = function (...args: any[]) {
      origPush(...args);
      setNavLog((prev) => [
        { path: String(args[2] ?? window.location.pathname), ts: Date.now() },
        ...prev.slice(0, 49),
      ]);
    };

    return () => {
      window.dispatchEvent = origDispatch;
      window.history.pushState = origPush;
      window.removeEventListener("popstate", popHandler);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  const s: Record<string, React.CSSProperties> = {
    panel: {
      position: "fixed",
      bottom: 0,
      right: 0,
      width: 420,
      maxHeight: "60vh",
      background: "#1a1d27",
      color: "#e4e6f0",
      borderTop: "2px solid #6366f1",
      borderLeft: "2px solid #6366f1",
      borderTopLeftRadius: 12,
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 12,
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-4px -4px 20px rgba(0,0,0,0.5)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      background: "#242836",
      borderBottom: "1px solid #2e3348",
    },
    tabs: {
      display: "flex",
      gap: 4,
      padding: "6px 12px",
      borderBottom: "1px solid #2e3348",
    },
    tab: {
      padding: "4px 12px",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 600,
    },
    body: {
      flex: 1,
      overflow: "auto",
      padding: 12,
    },
    close: {
      background: "none",
      border: "none",
      color: "#8b8fa3",
      cursor: "pointer",
      fontSize: 16,
    },
    key: { color: "#818cf8" },
    val: { color: "#22c55e" },
    muted: { color: "#5f6378", fontSize: 10 },
  };

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={{ fontWeight: 700, color: "#818cf8", fontSize: 13 }}>
          Lyx Devtools
        </span>
        <button onClick={() => setOpen(false)} style={s.close}>x</button>
      </div>

      <div style={s.tabs}>
        {(["state", "events", "nav"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...s.tab,
              background: tab === t ? "#6366f1" : "#2a2e3d",
              color: tab === t ? "#fff" : "#8b8fa3",
            }}
          >
            {t === "state" ? "State" : t === "events" ? "Events" : "Navigation"}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {tab === "state" && (
          <div>
            {Object.keys(storeState).length === 0 ? (
              <div style={s.muted}>No shared state yet</div>
            ) : (
              Object.entries(storeState).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={s.key}>{key}</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#e4e6f0", paddingLeft: 12 }}>
                    {JSON.stringify(val, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "events" && (
          <div>
            {eventLog.length === 0 ? (
              <div style={s.muted}>No events emitted yet</div>
            ) : (
              eventLog.map((entry, i) => (
                <div key={i} style={{ marginBottom: 8, borderBottom: "1px solid #2e3348", paddingBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={s.key}>{entry.name}</span>
                    <span style={s.muted}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#8b8fa3", fontSize: 11, paddingLeft: 12 }}>
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "nav" && (
          <div>
            <div style={{ marginBottom: 8, color: "#8b8fa3" }}>
              Current: <span style={s.key}>{window.location.pathname}</span>
            </div>
            {navLog.length === 0 ? (
              <div style={s.muted}>No navigation events yet</div>
            ) : (
              navLog.map((entry, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{entry.path}</span>
                  <span style={s.muted}>{new Date(entry.ts).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
