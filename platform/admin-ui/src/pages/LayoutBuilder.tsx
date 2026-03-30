import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { api } from "../api/client";
import { LayoutPreview } from "../components/LayoutPreview";

type Position = "top" | "left" | "center" | "right" | "bottom";

interface Region {
  id: string;
  slot: string;
  position: Position;
  size?: string;
}

const POSITIONS: { value: Position; label: string; color: string }[] = [
  { value: "top", label: "Top", color: "rgba(99, 102, 241, 0.3)" },
  { value: "left", label: "Left", color: "rgba(34, 197, 94, 0.3)" },
  { value: "center", label: "Center", color: "rgba(245, 158, 11, 0.3)" },
  { value: "right", label: "Right", color: "rgba(236, 72, 153, 0.3)" },
  { value: "bottom", label: "Bottom", color: "rgba(139, 92, 246, 0.3)" },
];

export function LayoutBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [regions, setRegions] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [newSlot, setNewSlot] = useState("");
  const [newPosition, setNewPosition] = useState<Position>("center");
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<any>(`/layouts/${id}`).then((layout) => {
      setName(layout.name);
      setDescription(layout.description);
      setRegions(layout.regions);
    }).catch((e) => setError(e.message));
  }, [id]);

  function addRegion() {
    const slot = newSlot.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slot) return;
    if (regions.some((r) => r.slot === slot)) {
      setError(`Slot "${slot}" already exists`);
      return;
    }

    const region: Region = {
      id: `${slot}-${Date.now()}`,
      slot,
      position: newPosition,
      size: (newPosition === "left" || newPosition === "right") && newSize ? newSize : undefined,
    };

    setRegions([...regions, region]);
    setNewSlot("");
    setNewSize("");
    setError("");
  }

  function removeRegion(regionId: string) {
    setRegions(regions.filter((r) => r.id !== regionId));
  }

  function moveRegion(regionId: string, direction: -1 | 1) {
    const idx = regions.findIndex((r) => r.id === regionId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= regions.length) return;
    const updated = [...regions];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setRegions(updated);
  }

  function updateRegion(regionId: string, field: string, value: string) {
    setRegions(regions.map((r) =>
      r.id === regionId ? { ...r, [field]: value || undefined } : r
    ));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Layout name is required");
      return;
    }
    if (regions.length === 0) {
      setError("Add at least one region");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEditing) {
        await api.put(`/layouts/${id}`, { name, description, regions });
      } else {
        await api.post("/layouts", { name, description, regions });
      }
      navigate("/layouts");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEditing ? "Edit Layout" : "Create Layout"}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Layout Info</h3>

            <div className="form-group">
              <label>Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Custom Layout"
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
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Add Region</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px auto", gap: 12, alignItems: "end" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Slot Name</label>
                <input
                  className="input"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="e.g. header, sidebar"
                  onKeyDown={(e) => e.key === "Enter" && addRegion()}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Position</label>
                <select
                  className="select"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value as Position)}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Size</label>
                <input
                  className="input"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="250px"
                  disabled={newPosition !== "left" && newPosition !== "right"}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={addRegion}
                disabled={!newSlot.trim()}
                style={{ height: 42 }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Regions ({regions.length})
            </h3>

            {regions.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 32 }}>
                Add regions to build your layout
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {regions.map((region, idx) => {
                  const posInfo = POSITIONS.find((p) => p.value === region.position);
                  return (
                    <div
                      key={region.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: posInfo?.color ?? "var(--bg-tertiary)",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "2px 6px", fontSize: 10 }}
                          onClick={() => moveRegion(region.id, -1)}
                          disabled={idx === 0}
                        >
                          ▲
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "2px 6px", fontSize: 10 }}
                          onClick={() => moveRegion(region.id, 1)}
                          disabled={idx === regions.length - 1}
                        >
                          ▼
                        </button>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{region.slot}</span>
                          <span className="badge badge-accent">{region.position}</span>
                          {region.size && (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{region.size}</span>
                          )}
                        </div>
                      </div>

                      {(region.position === "left" || region.position === "right") && (
                        <input
                          className="input"
                          style={{ width: 80 }}
                          value={region.size ?? ""}
                          onChange={(e) => updateRegion(region.id, "size", e.target.value)}
                          placeholder="250px"
                        />
                      )}

                      <select
                        className="select"
                        style={{ width: 110 }}
                        value={region.position}
                        onChange={(e) => updateRegion(region.id, "position", e.target.value)}
                      >
                        {POSITIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRegion(region.id)}
                        style={{ padding: "4px 10px" }}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => navigate("/layouts")}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Layout"}
            </button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-secondary)" }}>
              Live Preview
            </h3>
            {regions.length > 0 ? (
              <LayoutPreview regions={regions} />
            ) : (
              <div style={{
                height: 200,
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}>
                Add regions to see preview
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)" }}>
              Quick Templates
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setRegions([
                  { id: "h-1", slot: "header", position: "top" },
                  { id: "m-1", slot: "main", position: "center" },
                  { id: "f-1", slot: "footer", position: "bottom" },
                ])}
              >
                Header + Main + Footer
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setRegions([
                  { id: "h-1", slot: "header", position: "top" },
                  { id: "s-1", slot: "sidebar", position: "left", size: "250px" },
                  { id: "m-1", slot: "main", position: "center" },
                  { id: "f-1", slot: "footer", position: "bottom" },
                ])}
              >
                With Sidebar
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setRegions([
                  { id: "h-1", slot: "header", position: "top" },
                  { id: "s-1", slot: "sidebar", position: "left", size: "250px" },
                  { id: "m-1", slot: "main", position: "center" },
                  { id: "r-1", slot: "panel", position: "right", size: "300px" },
                  { id: "f-1", slot: "footer", position: "bottom" },
                ])}
              >
                Three Column
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
