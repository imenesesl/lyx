import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface MFEItem {
  _id: string;
  name: string;
  description: string;
  archived: boolean;
  createdAt: string;
}

export function MFEList() {
  const [mfes, setMfes] = useState<MFEItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMfes();
  }, []);

  async function loadMfes() {
    const data = await api.get<MFEItem[]>("/mfes");
    setMfes(data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await api.post("/mfes", { name, description });
      setShowCreate(false);
      setName("");
      setDescription("");
      await loadMfes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Micro Frontends</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Register MFE
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
            style={{ width: 440 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
              Register Micro Frontend
            </h2>

            <div className="form-group">
              <label>MFE Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. header, sidebar, dashboard"
                required
              />
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

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Registering..." : "Register"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mfes.length === 0 ? (
        <div className="card empty-state">
          <h3>No micro frontends registered</h3>
          <p>Register an MFE to start uploading versions.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {mfes.map((mfe) => (
            <Link
              key={mfe._id}
              to={`/mfes/${mfe._id}`}
              className="card card-hover"
              style={{ display: "block" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{mfe.name}</span>
                {mfe.archived && <span className="badge badge-warning">Archived</span>}
              </div>
              {mfe.description && (
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                  {mfe.description}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                Created {new Date(mfe.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
