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

  const top = layout.regions.filter((r) => r.position === "top");
  const left = layout.regions.filter((r) => r.position === "left");
  const center = layout.regions.filter((r) => r.position === "center");
  const right = layout.regions.filter((r) => r.position === "right");
  const bottom = layout.regions.filter((r) => r.position === "bottom");

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
        />
      ))}

      {(left.length > 0 || center.length > 0 || right.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: middleColumns || "1fr",
            flex: 1,
          }}
        >
          {[...left, ...center, ...right].map((region) => (
            <RegionSlot
              key={region.id}
              region={region}
              registryUrl={registryUrl}
              override={slotOverrides[region.slot]}
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
        />
      ))}
    </div>
  );
}

function RegionSlot({
  region,
  registryUrl,
  override,
}: {
  region: LayoutRegion;
  registryUrl: string;
  override?: SlotOverride;
}) {
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
