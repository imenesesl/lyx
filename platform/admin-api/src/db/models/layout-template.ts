import { Schema, model, type Document } from "mongoose";

export interface ILayoutRegion {
  id: string;
  slot: string;
  position: "top" | "left" | "center" | "right" | "bottom";
  size?: string;
}

export interface ILayoutTemplate extends Document {
  name: string;
  description: string;
  regions: ILayoutRegion[];
  isBuiltIn: boolean;
  createdAt: Date;
}

const layoutRegionSchema = new Schema<ILayoutRegion>(
  {
    id: { type: String, required: true },
    slot: { type: String, required: true },
    position: { type: String, required: true, enum: ["top", "left", "center", "right", "bottom"] },
    size: { type: String },
  },
  { _id: false }
);

const layoutTemplateSchema = new Schema<ILayoutTemplate>({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  regions: { type: [layoutRegionSchema], required: true },
  isBuiltIn: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const LayoutTemplate = model<ILayoutTemplate>("LayoutTemplate", layoutTemplateSchema);
