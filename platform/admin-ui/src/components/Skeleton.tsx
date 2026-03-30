interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height = 14, radius, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius ?? "var(--radius)",
        ...style,
      }}
    />
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-stat" />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <Skeleton width="180px" height={24} />
        <Skeleton width="100px" height={34} radius={8} />
      </div>
      <CardSkeleton />
      <div style={{ marginTop: 24 }}>
        <ListSkeleton />
      </div>
    </div>
  );
}
