interface Version {
  _id: string;
  version: string;
  slot: string;
  createdAt: string;
}

interface VersionSelectorProps {
  versions: Version[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function VersionSelector({ versions, selectedId, onChange }: VersionSelectorProps) {
  return (
    <select
      className="select"
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      style={{ minWidth: 140 }}
    >
      <option value="">Select version</option>
      {versions.map((v) => (
        <option key={v._id} value={v._id}>
          v{v.version} ({v.slot}) - {new Date(v.createdAt).toLocaleDateString()}
        </option>
      ))}
    </select>
  );
}
