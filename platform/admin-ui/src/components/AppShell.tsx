import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth";

export function AppShell() {
  const { account, logout } = useAuth();

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: "var(--accent)" }}>Lyx</span> Admin
          </h2>
        </div>

        <nav style={{ flex: 1, padding: "12px" }}>
          <SidebarLink to="/" label="Dashboard" />
          <SidebarLink to="/apps" label="Apps" />
          <SidebarLink to="/mfes" label="Micro Frontends" />
          <SidebarLink to="/layouts" label="Layouts" />
        </nav>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
            {account?.name}
          </div>
          <div
            style={{ color: "var(--text-muted)", fontSize: 10, fontFamily: "monospace", marginBottom: 8, cursor: "pointer", wordBreak: "break-all" }}
            title="Click to copy namespace"
            onClick={() => { navigator.clipboard.writeText(account?.alias || account?.id || ""); }}
          >
            /{account?.alias || account?.id}/
          </div>
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 13,
              padding: 0,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        display: "block",
        padding: "10px 14px",
        borderRadius: "var(--radius)",
        fontSize: 14,
        fontWeight: 500,
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        background: isActive ? "var(--accent-muted)" : "transparent",
        marginBottom: 4,
        transition: "all 0.15s",
      })}
    >
      {label}
    </NavLink>
  );
}
