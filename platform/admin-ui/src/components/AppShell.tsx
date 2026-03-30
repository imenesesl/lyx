import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import { createContext, useContext, useState, useCallback } from "react";

interface RefreshContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue>({ refreshKey: 0, triggerRefresh: () => {} });

export function useRefresh() {
  return useContext(RefreshContext);
}

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: "◫", end: true },
  { to: "/apps", label: "Applications", icon: "▦", end: false },
  { to: "/mfes", label: "Micro Frontends", icon: "◱", end: false },
  { to: "/health", label: "MFE Health", icon: "♥", end: false },
  { to: "/layouts", label: "Layouts", icon: "⊞", end: false },
  { to: "/settings", label: "Settings", icon: "⚙", end: false },
];

export function AppShell() {
  const { account, logout } = useAuth();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  }, []);

  const pageTitle = NAV_ITEMS.find((n) =>
    n.end ? location.pathname === "/admin" || location.pathname === "/" : location.pathname.startsWith(n.to === "/" ? "/__never__" : n.to)
  )?.label ?? "";

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      <div style={{ display: "flex", height: "100vh" }}>
        <aside
          style={{
            width: "var(--sidebar-width)",
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "white",
                }}
              >
                L
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Lyx Admin</span>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  transition: "all var(--transition)",
                })}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: "center", opacity: 0.8 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                {account?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {account?.name}
                </div>
                <div
                  style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", cursor: "pointer" }}
                  title="Click to copy"
                  onClick={() => navigator.clipboard.writeText(account?.alias || account?.id || "")}
                >
                  /{account?.alias || account?.id}/
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              style={{ width: "100%", justifyContent: "flex-start", color: "var(--text-muted)" }}
            >
              Log out
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <header
            style={{
              height: "var(--header-height)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              flexShrink: 0,
              background: "var(--bg-primary)",
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{pageTitle}</h2>
            <button
              className="btn btn-ghost btn-icon"
              onClick={triggerRefresh}
              title="Refresh content"
              style={{ fontSize: 16 }}
            >
              <span className={spinning ? "spinning" : ""} style={{ display: "inline-block" }}>↻</span>
            </button>
          </header>

          <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </RefreshContext.Provider>
  );
}
