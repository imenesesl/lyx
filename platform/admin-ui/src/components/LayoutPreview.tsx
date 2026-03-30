interface Region {
  id: string;
  slot: string;
  position: string;
  size?: string;
}

interface LayoutPreviewProps {
  regions: Region[];
  compact?: boolean;
}

const POSITION_COLORS: Record<string, string> = {
  top: "rgba(99, 102, 241, 0.3)",
  left: "rgba(34, 197, 94, 0.3)",
  center: "rgba(245, 158, 11, 0.3)",
  right: "rgba(236, 72, 153, 0.3)",
  bottom: "rgba(139, 92, 246, 0.3)",
};

export function LayoutPreview({ regions, compact }: LayoutPreviewProps) {
  const h = compact ? 120 : 200;
  const topRegions = regions.filter((r) => r.position === "top");
  const bottomRegions = regions.filter((r) => r.position === "bottom");
  const leftRegions = regions.filter((r) => r.position === "left");
  const rightRegions = regions.filter((r) => r.position === "right");
  const centerRegions = regions.filter((r) => r.position === "center");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        height: h,
        fontSize: compact ? 10 : 12,
      }}
    >
      {topRegions.map((r) => (
        <div
          key={r.id}
          style={{
            background: POSITION_COLORS.top,
            padding: compact ? 4 : 8,
            textAlign: "center",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {r.slot}
        </div>
      ))}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {leftRegions.map((r) => (
          <div
            key={r.id}
            style={{
              background: POSITION_COLORS.left,
              width: compact ? 50 : 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight: "1px solid var(--border)",
              color: "var(--text-secondary)",
              writingMode: compact ? undefined : "vertical-rl",
            }}
          >
            {r.slot}
          </div>
        ))}

        {centerRegions.map((r) => (
          <div
            key={r.id}
            style={{
              background: POSITION_COLORS.center,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            {r.slot}
          </div>
        ))}

        {rightRegions.map((r) => (
          <div
            key={r.id}
            style={{
              background: POSITION_COLORS.right,
              width: compact ? 50 : 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "1px solid var(--border)",
              color: "var(--text-secondary)",
              writingMode: compact ? undefined : "vertical-rl",
            }}
          >
            {r.slot}
          </div>
        ))}
      </div>

      {bottomRegions.map((r) => (
        <div
          key={r.id}
          style={{
            background: POSITION_COLORS.bottom,
            padding: compact ? 4 : 8,
            textAlign: "center",
            borderTop: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {r.slot}
        </div>
      ))}
    </div>
  );
}
