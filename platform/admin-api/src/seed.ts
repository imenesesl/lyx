import { LayoutTemplate } from "./db/models/layout-template.js";

const BUILT_IN_LAYOUTS = [
  {
    name: "Empty",
    description: "A blank canvas with a single full-page slot. Your MFE controls everything.",
    regions: [
      { id: "root", slot: "root", position: "center" as const },
    ],
    isBuiltIn: true,
  },
  {
    name: "Classic",
    description: "Header + sidebar + main content + footer. The most common web app layout.",
    regions: [
      { id: "header", slot: "header", position: "top" as const },
      { id: "sidebar", slot: "sidebar", position: "left" as const, size: "250px" },
      { id: "main", slot: "main", position: "center" as const },
      { id: "footer", slot: "footer", position: "bottom" as const },
    ],
    isBuiltIn: true,
  },
  {
    name: "Full Width",
    description: "Header + full-width main content + footer. No sidebar.",
    regions: [
      { id: "header", slot: "header", position: "top" as const },
      { id: "main", slot: "main", position: "center" as const },
      { id: "footer", slot: "footer", position: "bottom" as const },
    ],
    isBuiltIn: true,
  },
  {
    name: "Dashboard",
    description: "Header + left sidebar + main content + right sidebar + footer. For data-heavy apps.",
    regions: [
      { id: "header", slot: "header", position: "top" as const },
      { id: "sidebar-left", slot: "sidebar-left", position: "left" as const, size: "220px" },
      { id: "main", slot: "main", position: "center" as const },
      { id: "sidebar-right", slot: "sidebar-right", position: "right" as const, size: "280px" },
      { id: "footer", slot: "footer", position: "bottom" as const },
    ],
    isBuiltIn: true,
  },
];

export async function seedLayouts(): Promise<void> {
  for (const layout of BUILT_IN_LAYOUTS) {
    const existing = await LayoutTemplate.findOne({ name: layout.name, isBuiltIn: true });
    if (!existing) {
      await LayoutTemplate.create(layout);
      console.log(`[lyx-admin] Seeded layout: ${layout.name}`);
    }
  }
}
