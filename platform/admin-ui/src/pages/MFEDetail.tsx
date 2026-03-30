import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface MFEItem {
  _id: string;
  name: string;
  description: string;
  archived: boolean;
  createdAt: string;
}

interface MFEVersionItem {
  _id: string;
  version: string;
  slot: string;
  remoteEntryUrl: string;
  bundlePath: string;
  createdAt: string;
}

export function MFEDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mfe, setMfe] = useState<MFEItem | null>(null);
  const [versions, setVersions] = useState<MFEVersionItem[]>([]);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<MFEItem>(`/mfes/${id}`).then(setMfe).catch((e) => setError(e.message));
    loadVersions();
  }, [id]);

  async function loadVersions() {
    try {
      const data = await api.get<MFEVersionItem[]>(`/mfes/${id}/versions`);
      setVersions(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleArchive() {
    if (!mfe) return;
    setToggling(true);
    try {
      const updated = await api.put<MFEItem>(`/mfes/${id}`, { archived: !mfe.archived });
      setMfe(updated);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure? This will delete the MFE and all its versions permanently.")) return;
    try {
      await api.del(`/mfes/${id}`);
      navigate("/mfes");
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!mfe) {
    return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1>{mfe.name}</h1>
            {mfe.archived && <span className="badge badge-warning">Archived</span>}
          </div>
          {mfe.description && (
            <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>{mfe.description}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className={`btn btn-sm ${mfe.archived ? "btn-primary" : "btn-secondary"}`}
            onClick={handleToggleArchive}
            disabled={toggling}
          >
            {toggling ? "..." : mfe.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
          How to publish a new version
        </h3>
        <pre
          style={{
            background: "var(--bg-primary)",
            padding: 16,
            borderRadius: "var(--radius)",
            fontSize: 13,
            overflow: "auto",
            color: "var(--text-primary)",
          }}
        >
{`cd apps/your-project
lyx deploy`}
        </pre>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Versions ({versions.length})
      </h2>

      {versions.length === 0 ? (
        <div className="card empty-state">
          <h3>No versions published</h3>
          <p>Use the CLI to build and publish your first version.</p>
        </div>
      ) : (
        versions.map((v) => (
          <div key={v._id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>v{v.version}</span>
                <span className="badge badge-accent">{v.slot}</span>
              </div>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <div>Bundle: {v.bundlePath}</div>
              <div>Entry: {v.remoteEntryUrl}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
