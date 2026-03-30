import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { LayoutPreview } from "../components/LayoutPreview";

interface LayoutTemplate {
  _id: string;
  name: string;
  description: string;
  regions: Array<{ id: string; slot: string; position: string; size?: string }>;
  isBuiltIn: boolean;
  createdAt: string;
}

export function Layouts() {
  const [layouts, setLayouts] = useState<LayoutTemplate[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLayouts();
  }, []);

  async function loadLayouts() {
    try {
      const data = await api.get<LayoutTemplate[]>("/layouts");
      setLayouts(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete layout "${name}"?`)) return;
    try {
      await api.del(`/layouts/${id}`);
      setError("");
      await loadLayouts();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Layout Templates</h1>
        <Link to="/layouts/new" className="btn btn-primary">
          Create Layout
        </Link>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="grid grid-3">
        {layouts.map((layout) => (
          <div key={layout._id} className="card">
            <LayoutPreview regions={layout.regions} />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{layout.name}</span>
                {layout.isBuiltIn && <span className="badge badge-warning">built-in</span>}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{layout.description}</p>
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                Slots:{" "}
                {layout.regions.map((r) => (
                  <span key={r.id} className="badge badge-accent" style={{ marginRight: 4 }}>
                    {r.slot}
                  </span>
                ))}
              </div>
              {!layout.isBuiltIn && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link to={`/layouts/${layout._id}/edit`} className="btn btn-sm btn-secondary">
                    Edit
                  </Link>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(layout._id, layout.name)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
