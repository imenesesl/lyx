import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { LayoutPreview } from "../components/LayoutPreview";
import { VersionSelector } from "../components/VersionSelector";

interface AppItem {
  _id: string;
  accountId: string;
  name: string;
  slug: string;
  description: string;
}

interface Region {
  id: string;
  slot: string;
  position: string;
  size?: string;
}

interface Assignment {
  slotId: string;
  mfeId: string;
  mfeVersionId: string;
  mfeName: string;
  mfeVersion: string;
}

interface DraftConfig {
  _id: string;
  version: string;
  layoutSnapshot: { name: string; regions: Region[] };
  assignments: Assignment[];
  status: string;
}

interface PublishedVersion {
  _id: string;
  version: string;
  publishedAt: string;
  assignments: Assignment[];
  layoutSnapshot: { name: string; regions: Region[] };
}

interface MFEItem {
  _id: string;
  name: string;
  archived: boolean;
}

interface MFEVersionItem {
  _id: string;
  version: string;
  slot: string;
  createdAt: string;
  remoteEntryUrl: string;
}

export function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuth();
  const [app, setApp] = useState<AppItem | null>(null);
  const [draft, setDraft] = useState<DraftConfig | null>(null);
  const [publishedVersions, setPublishedVersions] = useState<PublishedVersion[]>([]);
  const [allMfes, setAllMfes] = useState<MFEItem[]>([]);
  const [mfeVersionsMap, setMfeVersionsMap] = useState<Record<string, MFEVersionItem[]>>({});
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [tab, setTab] = useState<"config" | "versions" | "settings">("config");
  const [editName, setEditName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  async function loadAll() {
    try {
      const [appData, configData, versions, mfes] = await Promise.all([
        api.get<AppItem>(`/apps/${id}`),
        api.get<DraftConfig>(`/apps/${id}/config`),
        api.get<PublishedVersion[]>(`/apps/${id}/versions`),
        api.get<MFEItem[]>("/mfes"),
      ]);
      setApp(appData);
      setEditName(appData.name);
      setEditPath(appData.slug);
      setEditDescription(appData.description);
      setDraft(configData);
      setPublishedVersions(versions);
      setAllMfes(mfes);

      const vMap: Record<string, MFEVersionItem[]> = {};
      for (const mfe of mfes) {
        try {
          vMap[mfe._id] = await api.get<MFEVersionItem[]>(`/mfes/${mfe._id}/versions`);
        } catch {
          vMap[mfe._id] = [];
        }
      }
      setMfeVersionsMap(vMap);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await api.put(`/apps/${id}/config`, { assignments: draft.assignments });
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await api.post(`/apps/${id}/publish`, { assignments: draft?.assignments });
      await loadAll();
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  function assignMfeToSlot(slotId: string, mfeId: string) {
    if (!draft) return;
    const mfe = allMfes.find((m) => m._id === mfeId);
    if (!mfe) return;

    const updated = draft.assignments.filter((a) => a.slotId !== slotId);
    if (mfeId) {
      updated.push({
        slotId,
        mfeId,
        mfeVersionId: "",
        mfeName: mfe.name,
        mfeVersion: "",
      });
    }
    setDraft({ ...draft, assignments: updated });
  }

  function selectVersion(slotId: string, versionId: string) {
    if (!draft) return;
    const assignment = draft.assignments.find((a) => a.slotId === slotId);
    if (!assignment) return;

    const versions = mfeVersionsMap[assignment.mfeId] ?? [];
    const ver = versions.find((v) => v._id === versionId);
    if (!ver) return;

    const updated = draft.assignments.map((a) =>
      a.slotId === slotId
        ? { ...a, mfeVersionId: versionId, mfeVersion: ver.version }
        : a
    );
    setDraft({ ...draft, assignments: updated });
  }

  async function handleSaveApp() {
    setSavingApp(true);
    try {
      const updated = await api.put<AppItem>(`/apps/${id}`, {
        name: editName,
        path: editPath,
        description: editDescription,
      });
      setApp(updated);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingApp(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this app?")) return;
    try {
      await api.del(`/apps/${id}`);
      navigate("/apps");
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!app || !draft) {
    return <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{app.name}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>/{account?.alias || app.accountId}/{app.slug}/</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a
            href={`/${account?.alias || app.accountId}/${app.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            aria-disabled={publishedVersions.length === 0}
            onClick={publishedVersions.length === 0 ? (e: React.MouseEvent) => e.preventDefault() : undefined}
          >
            Preview
          </a>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          className={`btn btn-sm ${tab === "config" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("config")}
        >
          Configuration
        </button>
        <button
          className={`btn btn-sm ${tab === "versions" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("versions")}
        >
          Published Versions ({publishedVersions.length})
        </button>
        <button
          className={`btn btn-sm ${tab === "settings" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {tab === "config" && (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Layout: {draft.layoutSnapshot.name}
            </h3>
            <LayoutPreview regions={draft.layoutSnapshot.regions} />

            <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 16 }}>
              Slot Assignments
            </h3>

            {draft.layoutSnapshot.regions.map((region) => {
              const assignment = draft.assignments.find((a) => a.slotId === region.slot);
              const selectedMfeVersions = assignment
                ? mfeVersionsMap[assignment.mfeId] ?? []
                : [];

              return (
                <div
                  key={region.id}
                  className="card"
                  style={{ marginBottom: 12, padding: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span className="badge badge-accent">{region.slot}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {region.position}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <select
                      className="select"
                      value={assignment?.mfeId ?? ""}
                      onChange={(e) => assignMfeToSlot(region.slot, e.target.value)}
                    >
                      <option value="">-- Select MFE --</option>
                      {allMfes
                        .filter((mfe) => !mfe.archived || mfe._id === assignment?.mfeId)
                        .map((mfe) => (
                        <option key={mfe._id} value={mfe._id}>
                          {mfe.name}{mfe.archived ? " (archived)" : ""}
                        </option>
                      ))}
                    </select>

                    {assignment && selectedMfeVersions.length > 0 && (
                      <VersionSelector
                        versions={selectedMfeVersions}
                        selectedId={assignment.mfeVersionId}
                        onChange={(vId) => selectVersion(region.slot, vId)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "versions" && (
        <div>
          {publishedVersions.length === 0 ? (
            <div className="card empty-state">
              <h3>No published versions</h3>
              <p>Configure your slots and click Publish to create the first version.</p>
            </div>
          ) : (
            publishedVersions.map((pv) => (
              <div key={pv._id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span
                      style={{ fontSize: 18, fontWeight: 700, marginRight: 12 }}
                    >
                      v{pv.version}
                    </span>
                    <span className="badge badge-success">published</span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {new Date(pv.publishedAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                    Layout: {pv.layoutSnapshot.name}
                  </div>
                  {pv.assignments.map((a) => (
                    <div key={a.slotId} style={{ color: "var(--text-muted)" }}>
                      {a.slotId} → {a.mfeName} v{a.mfeVersion}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>App Settings</h3>

          <div className="form-group">
            <label>Name</label>
            <input
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Path</label>
            <input
              className="input"
              value={editPath}
              onChange={(e) => setEditPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              /{account?.alias || app.accountId}/{editPath}/
            </span>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              className="input"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setEditName(app.name); setEditPath(app.slug); setEditDescription(app.description); }}
            >
              Reset
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveApp}
              disabled={savingApp || !editName.trim() || !editPath.trim()}
            >
              {savingApp ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
