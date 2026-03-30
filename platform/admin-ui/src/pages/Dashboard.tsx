import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";

interface AppItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

interface MFEItem {
  _id: string;
  name: string;
}

export function Dashboard() {
  const { account, refreshAccount } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [mfes, setMfes] = useState<MFEItem[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasSuccess, setAliasSuccess] = useState(false);

  useEffect(() => {
    api.get<AppItem[]>("/apps").then(setApps).catch(() => {});
    api.get<MFEItem[]>("/mfes").then(setMfes).catch(() => {});
  }, []);

  useEffect(() => {
    if (account?.alias) setAliasInput(account.alias);
  }, [account?.alias]);

  async function handleAliasSave() {
    setAliasError("");
    setAliasSuccess(false);
    setAliasSaving(true);
    try {
      await api.put("/auth/alias", { alias: aliasInput });
      await refreshAccount();
      setAliasSuccess(true);
      setTimeout(() => setAliasSuccess(false), 3000);
    } catch (err: any) {
      setAliasError(err.message);
    } finally {
      setAliasSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome, {account?.name}</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            Manage your micro frontend applications
          </p>
          <p
            style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6, fontFamily: "monospace", cursor: "pointer" }}
            title="Click to copy"
            onClick={() => { navigator.clipboard.writeText(account?.alias || account?.id || ""); }}
          >
            URL namespace: /{account?.alias || account?.id}/
          </p>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <div className="card">
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)" }}>
            {apps.length}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Applications
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--success)" }}>
            {mfes.length}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Micro Frontends
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--warning)" }}>
            {apps.filter((a) => a.description).length}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Active Projects
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Custom URL Namespace</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
          Your apps are served at <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>/{account?.alias || account?.id}/{"{slug}"}/</code>.
          Set a custom alias to replace the default ID.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <input
              className="input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-company"
              style={{ width: "100%" }}
              maxLength={32}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              3-32 characters, lowercase letters, numbers, hyphens. Example: <strong>my-team</strong>
            </span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAliasSave}
            disabled={aliasSaving || !aliasInput || aliasInput.length < 3 || aliasInput === account?.alias}
          >
            {aliasSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {aliasError && <p className="error-text" style={{ marginTop: 8 }}>{aliasError}</p>}
        {aliasSuccess && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 8 }}>Alias updated! Your apps are now at /{aliasInput}/</p>}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent Apps</h2>
            <Link to="/apps" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {apps.length === 0 ? (
            <div className="card empty-state">
              <h3>No apps yet</h3>
              <p>Create your first application to get started.</p>
              <Link to="/apps" className="btn btn-primary" style={{ marginTop: 16 }}>
                Create App
              </Link>
            </div>
          ) : (
            apps.slice(0, 5).map((app) => (
              <Link
                key={app._id}
                to={`/apps/${app._id}`}
                className="card card-hover"
                style={{ display: "block", marginBottom: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{app.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      /{app.slug}
                    </div>
                  </div>
                  <span className="badge badge-accent">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent MFEs</h2>
            <Link to="/mfes" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {mfes.length === 0 ? (
            <div className="card empty-state">
              <h3>No MFEs yet</h3>
              <p>Register your first micro frontend.</p>
              <Link to="/mfes" className="btn btn-primary" style={{ marginTop: 16 }}>
                Add MFE
              </Link>
            </div>
          ) : (
            mfes.slice(0, 5).map((mfe) => (
              <Link
                key={mfe._id}
                to={`/mfes/${mfe._id}`}
                className="card card-hover"
                style={{ display: "block", marginBottom: 12 }}
              >
                <div style={{ fontWeight: 600 }}>{mfe.name}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
