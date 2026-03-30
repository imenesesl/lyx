import React, { useState } from "react";
import { useSharedState, useEvent, emit } from "@lyx/sdk";

const menuItems = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "profile", label: "Profile", icon: "👤" },
];

function Sidebar() {
  const [active, setActive] = useState("home");
  const [user] = useSharedState("user", { name: "Vibe Coder", loggedIn: true });

  useEvent<{ mfeName: string }>("lyx:navigate", (data) => {
    setActive(data.mfeName);
  });

  return (
    <aside
      style={{
        height: "100%",
        background: "#16213e",
        color: "#ccc",
        padding: "16px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #1a1a2e" }}>
        <div style={{ fontSize: 12, color: "#888" }}>Logged in as</div>
        <div style={{ fontWeight: 600, color: "#e94560" }}>{user.name}</div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActive(item.id);
              emit("lyx:navigate", { mfeName: item.id, targetSlot: "main" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "12px 20px",
              background: active === item.id ? "#1a1a2e" : "transparent",
              border: "none",
              borderLeft: active === item.id ? "3px solid #e94560" : "3px solid transparent",
              color: active === item.id ? "#fff" : "#aaa",
              cursor: "pointer",
              fontSize: 14,
              textAlign: "left",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
