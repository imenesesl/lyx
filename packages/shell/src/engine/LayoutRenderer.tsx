import React, { useCallback, useEffect, useState } from "react";
import type { Layout, LayoutRegion } from "@lyx/types";
import { MFESlot } from "../components/MFESlot";

const isServer = typeof window === "undefined";

interface NavigatePayload {
  mfeName: string;
  targetSlot: string;
  params?: Record<string, string>;
}

interface SlotOverride {
  mfeName: string;
  params?: Record<string, string>;
}

interface LayoutRendererProps {
  layout: Layout;
  registryUrl: string;
}

export function LayoutRenderer({ layout, registryUrl }: LayoutRendererProps) {
  const assigned = new Set(layout.assignedSlots ?? []);
  const [slotOverrides, setSlotOverrides] = useState<Record<string, SlotOverride>>({});

  const handleNavigate = useCallback((payload: NavigatePayload) => {
    setSlotOverrides((prev) => ({
      ...prev,
      [payload.targetSlot]: { mfeName: payload.mfeName, params: payload.params },
    }));
  }, []);

  useEffect(() => {
    if (isServer) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NavigatePayload>).detail;
      if (detail?.mfeName && detail?.targetSlot) {
        handleNavigate(detail);
      }
    };
    window.addEventListener("lyx:lyx:navigate", handler);

    const popHandler = (e: PopStateEvent) => {
      const lyx = e.state?.lyx as NavigatePayload | undefined;
      if (lyx?.mfeName && lyx?.targetSlot) {
        handleNavigate(lyx);
      }
    };
    window.addEventListener("popstate", popHandler);

    return () => {
      window.removeEventListener("lyx:lyx:navigate", handler);
      window.removeEventListener("popstate", popHandler);
    };
  }, [handleNavigate]);

  const regionVisible = (r: LayoutRegion) =>
    slotOverrides[r.slot] || assigned.size === 0 || assigned.has(r.slot);

  const top = layout.regions.filter((r) => r.position === "top" && regionVisible(r));
  const left = layout.regions.filter((r) => r.position === "left" && regionVisible(r));
  const center = layout.regions.filter((r) => r.position === "center" && regionVisible(r));
  const right = layout.regions.filter((r) => r.position === "right" && regionVisible(r));
  const bottom = layout.regions.filter((r) => r.position === "bottom" && regionVisible(r));

  const middle = [...left, ...center, ...right];

  const middleColumns = [
    ...left.map((r) => r.size ?? "250px"),
    ...center.map(() => "1fr"),
    ...right.map((r) => r.size ?? "250px"),
  ].join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {top.map((region) => (
        <RegionSlot
          key={region.id}
          region={region}
          registryUrl={registryUrl}
          override={slotOverrides[region.slot]}
          assigned={assigned}
        />
      ))}

      {middle.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: middleColumns || "1fr",
            flex: 1,
          }}
        >
          {middle.map((region) => (
            <RegionSlot
              key={region.id}
              region={region}
              registryUrl={registryUrl}
              override={slotOverrides[region.slot]}
              assigned={assigned}
            />
          ))}
        </div>
      )}

      {bottom.map((region) => (
        <RegionSlot
          key={region.id}
          region={region}
          registryUrl={registryUrl}
          override={slotOverrides[region.slot]}
          assigned={assigned}
        />
      ))}
    </div>
  );
}

function RegionSlot({
  region,
  registryUrl,
  override,
  assigned,
}: {
  region: LayoutRegion;
  registryUrl: string;
  override?: SlotOverride;
  assigned: Set<string>;
}) {
  const hasContent = override || assigned.size === 0 || assigned.has(region.slot);

  if (!hasContent) return null;

  return (
    <div data-lyx-region={region.id} data-lyx-slot={region.slot}>
      <MFESlot
        slot={region.slot}
        registryUrl={registryUrl}
        position={region.position}
        overrideMfe={override?.mfeName}
        overrideParams={override?.params}
      />
    </div>
  );
}
