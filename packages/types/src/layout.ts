export type LayoutPosition = "top" | "left" | "center" | "right" | "bottom";

export interface LayoutRegion {
  id: string;
  slot: string;
  position: LayoutPosition;
  /** CSS flex/grid sizing hint (e.g. "1fr", "250px", "auto") */
  size?: string;
}

export interface Layout {
  name: string;
  description?: string;
  regions: LayoutRegion[];
}
