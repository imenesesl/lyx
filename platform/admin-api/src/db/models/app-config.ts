import { Schema, model, type Document, type Types } from "mongoose";
import type { ILayoutRegion } from "./layout-template.js";

export interface ISlotAssignment {
  slotId: string;
  mfeId: Types.ObjectId;
  mfeVersionId: Types.ObjectId;
  mfeName: string;
  mfeVersion: string;
  remoteEntryUrl: string;
}

export interface IAppConfig extends Document {
  appId: Types.ObjectId;
  version: string;
  layoutTemplateId: Types.ObjectId;
  layoutSnapshot: {
    name: string;
    regions: ILayoutRegion[];
  };
  assignments: ISlotAssignment[];
  status: "draft" | "published";
  publishedAt: Date | null;
  createdAt: Date;
}

const slotAssignmentSchema = new Schema<ISlotAssignment>(
  {
    slotId: { type: String, required: true },
    mfeId: { type: Schema.Types.ObjectId, ref: "MFE", required: true },
    mfeVersionId: { type: Schema.Types.ObjectId, ref: "MFEVersion", required: true },
    mfeName: { type: String, required: true },
    mfeVersion: { type: String, required: true },
    remoteEntryUrl: { type: String, default: "" },
  },
  { _id: false }
);

const layoutRegionEmbedded = new Schema(
  {
    id: { type: String, required: true },
    slot: { type: String, required: true },
    position: { type: String, required: true },
    size: { type: String },
  },
  { _id: false }
);

const appConfigSchema = new Schema<IAppConfig>({
  appId: { type: Schema.Types.ObjectId, ref: "App", required: true, index: true },
  version: { type: String, required: true },
  layoutTemplateId: { type: Schema.Types.ObjectId, ref: "LayoutTemplate", required: true },
  layoutSnapshot: {
    type: {
      name: { type: String, required: true },
      regions: { type: [layoutRegionEmbedded], required: true },
    },
    required: true,
  },
  assignments: { type: [slotAssignmentSchema], default: [] },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

appConfigSchema.index({ appId: 1, version: 1 }, { unique: true });
appConfigSchema.index({ appId: 1, status: 1 });

export const AppConfig = model<IAppConfig>("AppConfig", appConfigSchema);
