import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/auth";

export function Settings() {
  const { account, refreshAccount, logout } = useAuth();
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasSuccess, setAliasSuccess] = useState(false);

  const [shellUrlInput, setShellUrlInput] = useState("");
  const [shellUrlError, setShellUrlError] = useState("");
  const [shellUrlSaving, setShellUrlSaving] = useState(false);
  const [shellUrlSuccess, setShellUrlSuccess] = useState(false);

  useEffect(() => {
    if (account?.alias) setAliasInput(account.alias);
    if (account?.shellUrl) setShellUrlInput(account.shellUrl);
  }, [account?.alias, account?.shellUrl]);

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

  async function handleShellUrlSave() {
    setShellUrlError("");
    setShellUrlSuccess(false);
    setShellUrlSaving(true);
    try {
      await api.put("/auth/shell-url", { shellUrl: shellUrlInput });
      await refreshAccount();
      setShellUrlSuccess(true);
      setTimeout(() => setShellUrlSuccess(false), 3000);
    } catch (err: any) {
      setShellUrlError(err.message);
    } finally {
      setShellUrlSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Account</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Your account information</p>

          <div className="form-group">
            <label>Name</label>
            <input className="input" value={account?.name ?? ""} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="input" value={account?.email ?? ""} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Account ID</label>
            <input className="input" value={account?.id ?? ""} disabled style={{ opacity: 0.6, fontFamily: "monospace", fontSize: 12 }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>URL Namespace</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Your apps are served at{" "}
            <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
              /{account?.alias || account?.id}/{"<slug>"}/
            </code>
          </p>

          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>Custom Alias</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-company"
                maxLength={32}
              />
              <button
                className="btn btn-primary"
                onClick={handleAliasSave}
                disabled={aliasSaving || !aliasInput || aliasInput.length < 3 || aliasInput === account?.alias}
                style={{ flexShrink: 0 }}
              >
                {aliasSaving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="form-hint">3-32 characters: lowercase letters, numbers, hyphens</p>
          </div>

          {aliasError && <p className="error-text">{aliasError}</p>}
          {aliasSuccess && (
            <p style={{ color: "var(--success)", fontSize: 12, marginTop: 4 }}>
              Alias updated — your apps are now at /{aliasInput}/
            </p>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Shell URL</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Set the base URL of your SSR/Shell service. Preview links will point to this domain instead of the Admin UI domain.
            Required when Admin UI and Shell run on different domains (e.g. separate App Runner services).
          </p>

          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>Shell Service URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={shellUrlInput}
                onChange={(e) => setShellUrlInput(e.target.value.trim())}
                placeholder="https://abc123.us-west-2.awsapprunner.com"
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleShellUrlSave}
                disabled={shellUrlSaving || shellUrlInput === (account?.shellUrl ?? "")}
                style={{ flexShrink: 0 }}
              >
                {shellUrlSaving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="form-hint">Full URL including https://. Leave empty to use same domain as Admin.</p>
          </div>

          {shellUrlError && <p className="error-text">{shellUrlError}</p>}
          {shellUrlSuccess && (
            <p style={{ color: "var(--success)", fontSize: 12, marginTop: 4 }}>
              Shell URL updated — preview links will now point to {shellUrlInput || "same domain"}
            </p>
          )}
        </div>

        <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--danger)" }}>Danger Zone</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Careful, these actions cannot be undone.
          </p>
          <button className="btn btn-danger btn-sm" onClick={logout}>Log out of all sessions</button>
        </div>
      </div>
    </div>
  );
}
