import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useRefresh } from "../components/AppShell";
import { ListSkeleton } from "../components/Skeleton";

interface MFEItem { _id: string; name: string; description: string; archived: boolean; createdAt: string; }

export function MFEList() {
  const { refreshKey } = useRefresh();
  const [mfes, setMfes] = useState<MFEItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<MFEItem[]>("/mfes").then(setMfes).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/mfes", { name, description });
      setShowCreate(false);
      setName(""); setDescription("");
      setLoading(true);
      api.get<MFEItem[]>("/mfes").then(setMfes).finally(() => setLoading(false));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  const active = mfes.filter((m) => !m.archived);
  const archived = mfes.filter((m) => m.archived);

  return (
    <div>
      <div className="page-header">
        <h1>Micro Frontends</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Register MFE</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <form className="modal-content" style={{ width: 440 }} onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Register Micro Frontend</h2>
            <div className="form-group">
              <label>Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. header, sidebar, dashboard" required autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Registering..." : "Register"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : mfes.length === 0 ? (
        <div className="card empty-state">
          <h3>No micro frontends registered</h3>
          <p>Register an MFE to start uploading versions.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-2" style={{ marginBottom: archived.length > 0 ? 24 : 0 }}>
              {active.map((mfe) => (
                <Link key={mfe._id} to={`/mfes/${mfe._id}`} className="card card-hover" style={{ display: "block" }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{mfe.name}</div>
                  {mfe.description && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{mfe.description}</div>}
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Created {new Date(mfe.createdAt).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>Archived ({archived.length})</h3>
              <div className="grid grid-2">
                {archived.map((mfe) => (
                  <Link key={mfe._id} to={`/mfes/${mfe._id}`} className="card card-hover" style={{ display: "block", opacity: 0.6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{mfe.name}</span>
                      <span className="badge badge-warning">archived</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
