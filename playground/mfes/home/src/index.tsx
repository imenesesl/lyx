import React, { useState } from "react";
import { useSharedState, emit, useEvent, MFELoader } from "@lyx/sdk";

function Home() {
  const [user, setUser] = useSharedState("user", {
    name: "Vibe Coder",
    loggedIn: true,
  });
  const [counter, setCounter] = useSharedState("counter", 0);
  const [lastEvent, setLastEvent] = useState<string>("none");

  useEvent("lyx:navigate", (data: any) => {
    setLastEvent(`Navigate to: ${data.mfeName}`);
  });

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: "#1a1a2e" }}>
        Welcome to Lyx
      </h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        This is the Home MFE loaded in the "main" slot.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        {/* Shared State Demo */}
        <Card title="Shared State">
          <p style={{ marginBottom: 12, color: "#666" }}>
            This state is shared across all MFEs:
          </p>
          <div style={{ marginBottom: 8 }}>
            <strong>User:</strong> {user.name}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Counter:</strong> {counter}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCounter((c: number) => c + 1)} style={btnStyle}>
              +1
            </button>
            <button onClick={() => setCounter((c: number) => c - 1)} style={btnStyle}>
              -1
            </button>
            <button
              onClick={() =>
                setUser({ name: "Updated User", loggedIn: true })
              }
              style={btnStyle}
            >
              Change User
            </button>
          </div>
        </Card>

        {/* Event Bus Demo */}
        <Card title="Event Bus">
          <p style={{ marginBottom: 12, color: "#666" }}>
            Send and receive events across MFEs:
          </p>
          <div style={{ marginBottom: 12 }}>
            <strong>Last event:</strong> {lastEvent}
          </div>
          <button
            onClick={() =>
              emit("notification", {
                type: "success",
                message: "Hello from Home MFE!",
              })
            }
            style={btnStyle}
          >
            Emit Notification Event
          </button>
        </Card>

        {/* Dynamic Loading Demo */}
        <Card title="Dynamic MFE Loading">
          <p style={{ marginBottom: 12, color: "#666" }}>
            Load another MFE on demand with a button click:
          </p>
          <button
            onClick={() =>
              emit("lyx:navigate", {
                mfeName: "dashboard",
                targetSlot: "main",
              })
            }
            style={btnStyle}
          >
            Load Dashboard MFE
          </button>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 20,
        background: "#fafafa",
      }}
    >
      <h3 style={{ marginBottom: 12, color: "#1a1a2e" }}>{title}</h3>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "#e94560",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

export default Home;
