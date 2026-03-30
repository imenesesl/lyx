import React from "react";

const SHIMMER_CSS = `
@keyframes lyx-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.lyx-skeleton-line {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 800px 100%;
  animation: lyx-shimmer 1.6s infinite ease-in-out;
  border-radius: 4px;
}
`;

let styleInjected = false;

function SkeletonStyle() {
  if (styleInjected && typeof window !== "undefined") return null;
  styleInjected = true;
  return <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />;
}

function Line({ width = "100%", height = 14, mb = 8 }: { width?: string; height?: number; mb?: number }) {
  return (
    <div
      className="lyx-skeleton-line"
      style={{ width, height, marginBottom: mb }}
    />
  );
}

function TopSkeleton() {
  return (
    <div style={{ padding: "12px 24px", background: "#fafafa", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 16 }}>
      <div className="lyx-skeleton-line" style={{ width: 32, height: 32, borderRadius: 8 }} />
      <Line width="120px" height={16} mb={0} />
      <div style={{ flex: 1 }} />
      <Line width="80px" height={16} mb={0} />
      <Line width="80px" height={16} mb={0} />
    </div>
  );
}

function LeftSkeleton() {
  return (
    <div style={{ padding: 16, background: "#fafafa", borderRight: "1px solid #eee", minHeight: "100%" }}>
      <Line width="80%" height={12} mb={20} />
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="lyx-skeleton-line" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />
          <Line width={`${60 + (i * 7) % 30}%`} height={12} mb={0} />
        </div>
      ))}
    </div>
  );
}

function CenterSkeleton() {
  return (
    <div style={{ padding: 32 }}>
      <Line width="40%" height={24} mb={16} />
      <Line width="70%" height={12} mb={12} />
      <Line width="55%" height={12} mb={24} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ background: "#fafafa", borderRadius: 8, padding: 20, border: "1px solid #eee" }}>
            <div className="lyx-skeleton-line" style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 12 }} />
            <Line width="60%" height={14} mb={8} />
            <Line width="80%" height={10} mb={4} />
            <Line width="45%" height={10} mb={0} />
          </div>
        ))}
      </div>
      <Line width="90%" height={12} mb={8} />
      <Line width="75%" height={12} mb={8} />
      <Line width="85%" height={12} mb={0} />
    </div>
  );
}

function RightSkeleton() {
  return (
    <div style={{ padding: 16, background: "#fafafa", borderLeft: "1px solid #eee", minHeight: "100%" }}>
      <Line width="90%" height={14} mb={16} />
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
          <Line width="70%" height={12} mb={6} />
          <Line width="50%" height={10} mb={0} />
        </div>
      ))}
    </div>
  );
}

function BottomSkeleton() {
  return (
    <div style={{ padding: "12px 24px", background: "#fafafa", borderTop: "1px solid #eee", display: "flex", justifyContent: "center", gap: 24 }}>
      <Line width="60px" height={10} mb={0} />
      <Line width="60px" height={10} mb={0} />
      <Line width="80px" height={10} mb={0} />
    </div>
  );
}

const SKELETON_MAP: Record<string, () => React.ReactNode> = {
  top: TopSkeleton,
  left: LeftSkeleton,
  center: CenterSkeleton,
  right: RightSkeleton,
  bottom: BottomSkeleton,
};

export function SlotSkeleton({ position, slot }: { position: string; slot: string }) {
  const Comp = SKELETON_MAP[position] ?? CenterSkeleton;
  return (
    <>
      <SkeletonStyle />
      <div data-lyx-skeleton={slot} aria-busy="true" aria-label={`Loading ${slot}`}>
        <Comp />
      </div>
    </>
  );
}
