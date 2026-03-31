import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useRefresh } from "../components/AppShell";
import { LayoutPreview } from "../components/LayoutPreview";
import { ListSkeleton } from "../components/Skeleton";

interface LayoutTemplate { _id: string; name: string; description: string; regions: Array<{ id: string; slot: string; position: string; size?: string }>; isBuiltIn: boolean; createdAt: string; }

export function Layouts() {
  const { refreshKey } = useRefresh();
  const [layouts, setLayouts] = useState<LayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<LayoutTemplate[]>("/layouts").then(setLayouts).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete layout "${name}"?`)) return;
    try { await api.del(`/layouts/${id}`); setError(""); setLoading(true); api.get<LayoutTemplate[]>("/layouts").then(setLayouts).finally(() => setLoading(false)); } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Layouts</h1>
        <Link to="/layouts/new" className="btn btn-primary">Create Layout</Link>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="grid grid-3">
          {layouts.map((layout) => (
            <div key={layout._id} className="card">
              <LayoutPreview regions={layout.regions} compact />
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{layout.name}</span>
                  {layout.isBuiltIn && <span className="badge badge-warning">built-in</span>}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{layout.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                  {layout.regions.map((r) => (
                    <span key={r.id} className="badge badge-accent">{r.slot}</span>
                  ))}
                </div>
                {!layout.isBuiltIn && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link to={`/layouts/${layout._id}/edit`} className="btn btn-secondary btn-xs">Edit</Link>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(layout._id, layout.name)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
