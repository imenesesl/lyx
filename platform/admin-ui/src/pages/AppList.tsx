import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { useRefresh } from "../components/AppShell";
import { LayoutPreview } from "../components/LayoutPreview";
import { ListSkeleton } from "../components/Skeleton";

interface LayoutTemplate { _id: string; name: string; description: string; regions: Array<{ id: string; slot: string; position: string; size?: string }>; }
interface AppItem { _id: string; accountId: string; name: string; slug: string; description: string; createdAt: string; }

export function AppList() {
  const { account } = useAuth();
  const { refreshKey } = useRefresh();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [layouts, setLayouts] = useState<LayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<AppItem[]>("/apps"),
      api.get<LayoutTemplate[]>("/layouts"),
    ]).then(([a, l]) => { setApps(a); setLayouts(l); }).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/apps", { name, path: path || undefined, description, layoutTemplateId: selectedLayout });
      setShowCreate(false);
      setName(""); setPath(""); setDescription(""); setSelectedLayout("");
      setLoading(true);
      api.get<AppItem[]>("/apps").then(setApps).finally(() => setLoading(false));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  const selectedLayoutData = layouts.find((l) => l._id === selectedLayout);
  const ns = account?.alias || account?.id;
  const shellBase = account?.shellUrl || "";

  return (
    <div>
      <div className="page-header">
        <h1>Applications</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Application</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <form className="modal-content" style={{ width: 520, maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Create Application</h2>

            <div className="form-group">
              <label>Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome App" required autoFocus />
            </div>

            <div className="form-group">
              <label>URL Path</label>
              <input className="input" value={path} onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "my-app"} />
              <p className="form-hint">/{ns}/{path || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "...")}/</p>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>

            <div className="form-group">
              <label>Layout Template</label>
              <div className="grid grid-3" style={{ marginTop: 6 }}>
                {layouts.map((layout) => (
                  <div key={layout._id} onClick={() => setSelectedLayout(layout._id)} className="card card-hover" style={{ padding: 10, borderColor: selectedLayout === layout._id ? "var(--accent)" : "var(--border)", borderWidth: selectedLayout === layout._id ? 2 : 1 }}>
                    <LayoutPreview regions={layout.regions} compact />
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, textAlign: "center" }}>{layout.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedLayoutData && (
              <div style={{ marginBottom: 16, padding: 10, background: "var(--bg-tertiary)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-secondary)" }}>
                {selectedLayoutData.description}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating || !selectedLayout}>
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : apps.length === 0 ? (
        <div className="card empty-state">
          <h3>No applications yet</h3>
          <p>Create your first app to start building with micro frontends.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {apps.map((app) => (
            <Link key={app._id} to={`/apps/${app._id}`} className="card card-hover" style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>/{ns}/{app.slug}/</div>
                </div>
                <a href={`${shellBase}/${ns}/${app.slug}/`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs" onClick={(e) => e.stopPropagation()}>
                  Preview ↗
                </a>
              </div>
              {app.description && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{app.description}</div>}
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Created {new Date(app.createdAt).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
