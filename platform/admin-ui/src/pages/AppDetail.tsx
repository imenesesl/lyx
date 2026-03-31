import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/auth";
import { useRefresh } from "../components/AppShell";
import { LayoutPreview } from "../components/LayoutPreview";
import { VersionSelector } from "../components/VersionSelector";
import { PageSkeleton } from "../components/Skeleton";

interface AppItem { _id: string; accountId: string; name: string; slug: string; description: string; }
interface Region { id: string; slot: string; position: string; size?: string; }
interface Assignment { slotId: string; mfeId: string; mfeVersionId: string; mfeName: string; mfeVersion: string; }
interface DraftConfig { _id: string; version: string; layoutSnapshot: { name: string; regions: Region[] }; assignments: Assignment[]; status: string; }
interface PublishedVersion { _id: string; version: string; publishedAt: string; assignments: Assignment[]; layoutSnapshot: { name: string; regions: Region[] }; }
interface MFEItem { _id: string; name: string; archived: boolean; }
interface MFEVersionItem { _id: string; version: string; slot: string; createdAt: string; remoteEntryUrl: string; }
interface CanaryRule { slotId: string; stableMfe: string; stableVersion: string; canaryMfe: string; canaryVersion: string; percentage: number; errorThreshold: number; startedAt: string; metrics: { stable: { total: number; errors: number; errorRate: number }; canary: { total: number; errors: number; errorRate: number } } }

export function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuth();
  const { refreshKey } = useRefresh();
  const [app, setApp] = useState<AppItem | null>(null);
  const [draft, setDraft] = useState<DraftConfig | null>(null);
  const [publishedVersions, setPublishedVersions] = useState<PublishedVersion[]>([]);
  const [allMfes, setAllMfes] = useState<MFEItem[]>([]);
  const [mfeVersionsMap, setMfeVersionsMap] = useState<Record<string, MFEVersionItem[]>>({});
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [tab, setTab] = useState<"config" | "versions" | "canary" | "settings">("config");
  const [canaryRules, setCanaryRules] = useState<CanaryRule[]>([]);
  const [canaryLoading, setCanaryLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => { if (id) { loadAll(); loadCanary(); } }, [id, refreshKey]);

  async function loadAll() {
    try {
      const [appData, configData, versions, mfes] = await Promise.all([
        api.get<AppItem>(`/apps/${id}`),
        api.get<DraftConfig>(`/apps/${id}/config`),
        api.get<PublishedVersion[]>(`/apps/${id}/versions`),
        api.get<MFEItem[]>("/mfes"),
      ]);
      setApp(appData); setEditName(appData.name); setEditPath(appData.slug); setEditDescription(appData.description);
      setDraft(configData); setPublishedVersions(versions); setAllMfes(mfes);
      const vMap: Record<string, MFEVersionItem[]> = {};
      for (const mfe of mfes) {
        try { vMap[mfe._id] = await api.get<MFEVersionItem[]>(`/mfes/${mfe._id}/versions`); } catch { vMap[mfe._id] = []; }
      }
      setMfeVersionsMap(vMap);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  }

  async function loadCanary() {
    try {
      setCanaryLoading(true);
      const rules = await api.get<CanaryRule[]>(`/apps/${id}/canary`);
      setCanaryRules(rules);
    } catch { setCanaryRules([]); }
    finally { setCanaryLoading(false); }
  }

  async function handleSetCanary(slotId: string, mfeVersionId: string, percentage: number) {
    try {
      await api.post(`/apps/${id}/canary`, { slotId, mfeVersionId, percentage });
      await loadCanary();
      setError("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  }

  async function handlePromote(slotId: string) {
    try {
      await api.post(`/apps/${id}/canary/${slotId}/promote`);
      await Promise.all([loadAll(), loadCanary()]);
      setError("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  }

  async function handleRollback(slotId: string) {
    try {
      await api.post(`/apps/${id}/canary/${slotId}/rollback`);
      await loadCanary();
      setError("");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try { await api.put(`/apps/${id}/config`, { assignments: draft.assignments }); setError(""); } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); } finally { setSaving(false); }
  }

  async function handlePublish() {
    setPublishing(true);
    try { await api.post(`/apps/${id}/publish`, { assignments: draft?.assignments }); await loadAll(); setError(""); } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); } finally { setPublishing(false); }
  }

  function assignMfeToSlot(slotId: string, mfeId: string) {
    if (!draft) return;
    const mfe = allMfes.find((m) => m._id === mfeId);
    const updated = draft.assignments.filter((a) => a.slotId !== slotId);
    if (mfeId && mfe) updated.push({ slotId, mfeId, mfeVersionId: "", mfeName: mfe.name, mfeVersion: "" });
    setDraft({ ...draft, assignments: updated });
  }

  function selectVersion(slotId: string, versionId: string) {
    if (!draft) return;
    const assignment = draft.assignments.find((a) => a.slotId === slotId);
    if (!assignment) return;
    const ver = (mfeVersionsMap[assignment.mfeId] ?? []).find((v) => v._id === versionId);
    if (!ver) return;
    setDraft({ ...draft, assignments: draft.assignments.map((a) => a.slotId === slotId ? { ...a, mfeVersionId: versionId, mfeVersion: ver.version } : a) });
  }

  async function handleSaveApp() {
    setSavingApp(true);
    try { const updated = await api.put<AppItem>(`/apps/${id}`, { name: editName, path: editPath, description: editDescription }); setApp(updated); setError(""); } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); } finally { setSavingApp(false); }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this app?")) return;
    try { await api.del(`/apps/${id}`); navigate("/apps"); } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
  }

  if (!app || !draft) return <PageSkeleton />;

  const ns = account?.alias || app.accountId;
  const shellBase = account?.shellUrl || "";
  const previewUrl = `${shellBase}/${ns}/${app.slug}/`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{app.name}</h1>
          <p className="page-subtitle" style={{ fontFamily: "monospace", fontSize: 12 }}>/{ns}/{app.slug}/</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" aria-disabled={publishedVersions.length === 0} onClick={publishedVersions.length === 0 ? (e: React.MouseEvent) => e.preventDefault() : undefined}>
            Preview ↗
          </a>
          <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button>
          <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing}>{publishing ? "Publishing..." : "Publish"}</button>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="tabs">
        <button className={`tab ${tab === "config" ? "tab-active" : ""}`} onClick={() => setTab("config")}>Configuration</button>
        <button className={`tab ${tab === "versions" ? "tab-active" : ""}`} onClick={() => setTab("versions")}>Versions ({publishedVersions.length})</button>
        <button className={`tab ${tab === "canary" ? "tab-active" : ""}`} onClick={() => setTab("canary")}>Canary{canaryRules.length > 0 ? ` (${canaryRules.length})` : ""}</button>
        <button className={`tab ${tab === "settings" ? "tab-active" : ""}`} onClick={() => setTab("settings")}>Settings</button>
      </div>

      {tab === "config" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Slot Assignments</h3>
            {draft.layoutSnapshot.regions.map((region) => {
              const assignment = draft.assignments.find((a) => a.slotId === region.slot);
              const selectedMfeVersions = assignment ? mfeVersionsMap[assignment.mfeId] ?? [] : [];
              return (
                <div key={region.id} className="card" style={{ marginBottom: 8, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="badge badge-accent">{region.slot}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{region.position}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="select" value={assignment?.mfeId ?? ""} onChange={(e) => assignMfeToSlot(region.slot, e.target.value)}>
                      <option value="">— Select MFE —</option>
                      {allMfes.filter((mfe) => !mfe.archived || mfe._id === assignment?.mfeId).map((mfe) => (
                        <option key={mfe._id} value={mfe._id}>{mfe.name}{mfe.archived ? " (archived)" : ""}</option>
                      ))}
                    </select>
                    {assignment && selectedMfeVersions.length > 0 && (
                      <VersionSelector versions={selectedMfeVersions} selectedId={assignment.mfeVersionId} onChange={(vId) => selectVersion(region.slot, vId)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ position: "sticky", top: 24 }}>
            <div className="card">
              <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Layout: {draft.layoutSnapshot.name}</h4>
              <LayoutPreview regions={draft.layoutSnapshot.regions} />
            </div>
          </div>
        </div>
      )}

      {tab === "versions" && (
        <div>
          {publishedVersions.length === 0 ? (
            <div className="card empty-state">
              <h3>No published versions</h3>
              <p>Configure your slots and click Publish.</p>
            </div>
          ) : publishedVersions.map((pv) => (
            <div key={pv._id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>v{pv.version}</span>
                  <span className="badge badge-success">published</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(pv.publishedAt).toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Layout: {pv.layoutSnapshot.name}</div>
                {pv.assignments.map((a) => (
                  <div key={a.slotId} style={{ color: "var(--text-muted)" }}>{a.slotId} → {a.mfeName} v{a.mfeVersion}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "canary" && (
        <CanaryTab
          loading={canaryLoading}
          rules={canaryRules}
          draft={draft}
          allMfes={allMfes}
          mfeVersionsMap={mfeVersionsMap}
          onSetCanary={handleSetCanary}
          onPromote={handlePromote}
          onRollback={handleRollback}
        />
      )}

      {tab === "settings" && (
        <div style={{ maxWidth: 500 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>App Settings</h3>
            <div className="form-group">
              <label>Name</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Path</label>
              <input className="input" value={editPath} onChange={(e) => setEditPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
              <p className="form-hint">/{ns}/{editPath}/</p>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditName(app.name); setEditPath(app.slug); setEditDescription(app.description); }}>Reset</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveApp} disabled={savingApp || !editName.trim() || !editPath.trim()}>
                {savingApp ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", marginBottom: 8 }}>Delete Application</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>This action is irreversible. All versions and configurations will be lost.</p>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete this app</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CanaryTab({
  loading,
  rules,
  draft,
  allMfes,
  mfeVersionsMap,
  onSetCanary,
  onPromote,
  onRollback,
}: {
  loading: boolean;
  rules: CanaryRule[];
  draft: DraftConfig | null;
  allMfes: MFEItem[];
  mfeVersionsMap: Record<string, MFEVersionItem[]>;
  onSetCanary: (slotId: string, mfeVersionId: string, percentage: number) => void;
  onPromote: (slotId: string) => void;
  onRollback: (slotId: string) => void;
}) {
  const [newSlot, setNewSlot] = useState("");
  const [newMfeId, setNewMfeId] = useState("");
  const [newVersionId, setNewVersionId] = useState("");
  const [newPct, setNewPct] = useState(10);

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading canary rules...</div>;

  const assignedSlots = draft?.assignments.map((a) => a.slotId) ?? [];
  const slotsWithCanary = new Set(rules.map((r) => r.slotId));
  const availableSlots = assignedSlots.filter((s) => !slotsWithCanary.has(s));

  const selectedMfeVersions = newMfeId ? mfeVersionsMap[newMfeId] ?? [] : [];

  return (
    <div>
      {rules.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Active Canaries</h3>
          {rules.map((rule) => (
            <div key={rule.slotId} className="card" style={{ marginBottom: 8, padding: 16, borderLeft: "3px solid var(--warning)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="badge badge-accent">{rule.slotId}</span>
                  <span className="badge badge-warning">{rule.percentage}% canary</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Started {new Date(rule.startedAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Stable ({100 - rule.percentage}%)</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{rule.stableMfe} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>v{rule.stableVersion}</span></div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <span>{rule.metrics.stable.total} requests</span>
                    <span style={{ marginLeft: 12, color: rule.metrics.stable.errorRate > 5 ? "var(--danger)" : "var(--text-muted)" }}>
                      {rule.metrics.stable.errorRate}% errors
                    </span>
                  </div>
                </div>
                <div style={{ padding: 12, background: "var(--warning-muted)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Canary ({rule.percentage}%)</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{rule.canaryMfe} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>v{rule.canaryVersion}</span></div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <span>{rule.metrics.canary.total} requests</span>
                    <span style={{ marginLeft: 12, color: rule.metrics.canary.errorRate > rule.errorThreshold ? "var(--danger)" : "var(--success)" }}>
                      {rule.metrics.canary.errorRate}% errors
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-danger btn-sm" onClick={() => onRollback(rule.slotId)}>Rollback</button>
                <button className="btn btn-primary btn-sm" onClick={() => onPromote(rule.slotId)}>Promote to Stable</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>Start New Canary</h3>

        {availableSlots.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {assignedSlots.length === 0
              ? "Publish at least one version with slot assignments first."
              : "All slots already have an active canary."}
          </p>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Slot</label>
              <select className="select" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} style={{ minWidth: 120 }}>
                <option value="">— Slot —</option>
                {availableSlots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>MFE</label>
              <select className="select" value={newMfeId} onChange={(e) => { setNewMfeId(e.target.value); setNewVersionId(""); }} style={{ minWidth: 140 }}>
                <option value="">— MFE —</option>
                {allMfes.filter((m) => !m.archived).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Version</label>
              <select className="select" value={newVersionId} onChange={(e) => setNewVersionId(e.target.value)} style={{ minWidth: 100 }}>
                <option value="">— Version —</option>
                {selectedMfeVersions.map((v) => <option key={v._id} value={v._id}>v{v.version}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Traffic %</label>
              <input className="input" type="number" min={1} max={99} value={newPct} onChange={(e) => setNewPct(Number(e.target.value))} style={{ width: 70 }} />
            </div>
            <button
              className="btn btn-warning btn-sm"
              disabled={!newSlot || !newVersionId}
              onClick={() => { onSetCanary(newSlot, newVersionId, newPct); setNewSlot(""); setNewMfeId(""); setNewVersionId(""); }}
            >
              Start Canary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
