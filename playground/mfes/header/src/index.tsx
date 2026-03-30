import React from "react";
import { emit, useSharedState } from "@lyx/sdk";

function Header() {
  const [user] = useSharedState("user", { name: "Vibe Coder", loggedIn: true });

  const navItems = ["home", "dashboard", "settings"];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        background: "#1a1a2e",
        color: "#eee",
        borderBottom: "2px solid #e94560",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 2 }}>
        LYX
      </div>

      <nav style={{ display: "flex", gap: 16 }}>
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => emit("lyx:navigate", { mfeName: item, targetSlot: "main" })}
            style={{
              background: "none",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
              fontSize: 14,
              textTransform: "capitalize",
              padding: "8px 12px",
              borderRadius: 4,
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      <div style={{ fontSize: 14, color: "#aaa" }}>
        {user.loggedIn ? `Hi, ${user.name}` : "Guest"}
      </div>
    </header>
  );
}

export default Header;
