import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { useRefresh } from "../components/AppShell";
import { CardSkeleton, ListSkeleton } from "../components/Skeleton";

interface AppItem { _id: string; name: string; slug: string; description: string; createdAt: string; }
interface MFEItem { _id: string; name: string; description: string; archived: boolean; }

export function Dashboard() {
  const { account } = useAuth();
  const { refreshKey } = useRefresh();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [mfes, setMfes] = useState<MFEItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<AppItem[]>("/apps"),
      api.get<MFEItem[]>("/mfes"),
    ]).then(([a, m]) => { setApps(a); setMfes(m); }).catch(() => {}).finally(() => setLoading(false));
  }, [refreshKey]);

  const activeMfes = mfes.filter((m) => !m.archived);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p className="page-subtitle">Welcome back, {account?.name}</p>
        </div>
        <Link to="/apps" className="btn btn-primary">Create App</Link>
      </div>

      {loading ? (
        <>
          <CardSkeleton count={4} />
          <div style={{ marginTop: 24 }}><ListSkeleton /></div>
        </>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>▦</div>
              <div>
                <div className="stat-value">{apps.length}</div>
                <div className="stat-label">Applications</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--success-muted)", color: "var(--success)" }}>◱</div>
              <div>
                <div className="stat-value">{activeMfes.length}</div>
                <div className="stat-label">Active MFEs</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--warning-muted)", color: "var(--warning)" }}>⊞</div>
              <div>
                <div className="stat-value">{mfes.length - activeMfes.length}</div>
                <div className="stat-label">Archived</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#a78bfa" }}>◫</div>
              <div>
                <div className="stat-value">{apps.filter((a) => a.description).length}</div>
                <div className="stat-label">Documented</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Applications</h3>
                <Link to="/apps" style={{ fontSize: 12, color: "var(--text-muted)" }}>View all →</Link>
              </div>
              {apps.length === 0 ? (
                <div className="card empty-state">
                  <h3>No apps yet</h3>
                  <p>Create your first application to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {apps.slice(0, 5).map((app) => (
                    <Link key={app._id} to={`/apps/${app._id}`} className="card card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>/{app.slug}</div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(app.createdAt).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Micro Frontends</h3>
                <Link to="/mfes" style={{ fontSize: 12, color: "var(--text-muted)" }}>View all →</Link>
              </div>
              {mfes.length === 0 ? (
                <div className="card empty-state">
                  <h3>No MFEs yet</h3>
                  <p>Register your first micro frontend.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mfes.slice(0, 5).map((mfe) => (
                    <Link key={mfe._id} to={`/mfes/${mfe._id}`} className="card card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{mfe.name}</span>
                        {mfe.archived && <span className="badge badge-warning">archived</span>}
                      </div>
                      {mfe.description && <span style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mfe.description}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
