import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useRefresh } from "../components/AppShell";
import { PageSkeleton } from "../components/Skeleton";

interface MFEItem { _id: string; name: string; description: string; archived: boolean; createdAt: string; }
interface MFEVersionItem { _id: string; version: string; slot: string; remoteEntryUrl: string; bundlePath: string; createdAt: string; }

export function MFEDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshKey } = useRefresh();
  const [mfe, setMfe] = useState<MFEItem | null>(null);
  const [versions, setVersions] = useState<MFEVersionItem[]>([]);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<MFEItem>(`/mfes/${id}`).then(setMfe).catch((e) => setError(e.message));
    api.get<MFEVersionItem[]>(`/mfes/${id}/versions`).then(setVersions).catch(() => {});
  }, [id, refreshKey]);

  async function handleToggleArchive() {
    if (!mfe) return;
    setToggling(true);
    try { const updated = await api.put<MFEItem>(`/mfes/${id}`, { archived: !mfe.archived }); setMfe(updated); setError(""); } catch (err: any) { setError(err.message); } finally { setToggling(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this MFE and all versions permanently?")) return;
    try { await api.del(`/mfes/${id}`); navigate("/mfes"); } catch (err: any) { setError(err.message); }
  }

  if (!mfe) return <PageSkeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{mfe.name}</h1>
            {mfe.archived && <span className="badge badge-warning">archived</span>}
          </div>
          {mfe.description && <p className="page-subtitle">{mfe.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn btn-sm ${mfe.archived ? "btn-primary" : "btn-secondary"}`} onClick={handleToggleArchive} disabled={toggling}>
            {toggling ? "..." : mfe.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Deploy a new version</h3>
        <pre className="code-block">
{`cd apps/your-project
lyx deploy`}
        </pre>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Versions ({versions.length})</h3>

      {versions.length === 0 ? (
        <div className="card empty-state">
          <h3>No versions published</h3>
          <p>Use the CLI to build and publish your first version.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {versions.map((v) => (
            <div key={v._id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>v{v.version}</span>
                  <span className="badge badge-accent">{v.slot}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(v.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                <div>Bundle: {v.bundlePath}</div>
                <div>Entry: {v.remoteEntryUrl}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
