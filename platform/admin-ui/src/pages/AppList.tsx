import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { LayoutPreview } from "../components/LayoutPreview";

interface LayoutTemplate {
  _id: string;
  name: string;
  description: string;
  regions: Array<{ id: string; slot: string; position: string; size?: string }>;
}

interface AppItem {
  _id: string;
  accountId: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

export function AppList() {
  const { account } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [layouts, setLayouts] = useState<LayoutTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadApps();
    api.get<LayoutTemplate[]>("/layouts").then(setLayouts).catch(() => {});
  }, []);

  async function loadApps() {
    const data = await api.get<AppItem[]>("/apps");
    setApps(data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/apps", { name, path: path || undefined, description, layoutTemplateId: selectedLayout });
      setShowCreate(false);
      setName("");
      setPath("");
      setDescription("");
      setSelectedLayout("");
      await loadApps();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const selectedLayoutData = layouts.find((l) => l._id === selectedLayout);

  return (
    <div>
      <div className="page-header">
        <h1>Applications</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Create App
        </button>
      </div>

      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowCreate(false)}
        >
          <form
            className="card"
            style={{ width: 520, maxHeight: "85vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Create New App</h2>

            <div className="form-group">
              <label>App Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome App"
                required
              />
            </div>

            <div className="form-group">
              <label>Path</label>
              <input
                className="input"
                value={path}
                onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder={name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "my-app"}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                /{account?.alias || account?.id}/{path || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "...")}/
              </span>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="form-group">
              <label>Select Layout</label>
              <div className="grid grid-3" style={{ marginTop: 8 }}>
                {layouts.map((layout) => (
                  <div
                    key={layout._id}
                    onClick={() => setSelectedLayout(layout._id)}
                    className="card card-hover"
                    style={{
                      padding: 12,
                      borderColor:
                        selectedLayout === layout._id ? "var(--accent)" : "var(--border)",
                      borderWidth: selectedLayout === layout._id ? 2 : 1,
                    }}
                  >
                    <LayoutPreview regions={layout.regions} compact />
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      {layout.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedLayoutData && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                {selectedLayoutData.description}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !selectedLayout}
              >
                {creating ? "Creating..." : "Create App"}
              </button>
            </div>
          </form>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="card empty-state">
          <h3>No applications yet</h3>
          <p>Create your first app to start building with micro frontends.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {apps.map((app) => (
            <Link
              key={app._id}
              to={`/apps/${app._id}`}
              className="card card-hover"
              style={{ display: "block" }}
            >
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{app.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                /{account?.alias || app.accountId}/{app.slug}/
              </div>
              {app.description && (
                <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  {app.description}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Created {new Date(app.createdAt).toLocaleDateString()}
                </span>
                <a
                  href={`/${account?.alias || app.accountId}/${app.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Preview
                </a>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
