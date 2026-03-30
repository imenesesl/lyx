import { Schema, model, type Document, type Types } from "mongoose";

export interface IMFEVersion extends Document {
  mfeId: Types.ObjectId;
  version: string;
  slot: string;
  remoteEntryUrl: string;
  bundlePath: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const mfeVersionSchema = new Schema<IMFEVersion>({
  mfeId: { type: Schema.Types.ObjectId, ref: "MFE", required: true, index: true },
  version: { type: String, required: true },
  slot: { type: String, required: true },
  remoteEntryUrl: { type: String, required: true },
  bundlePath: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

mfeVersionSchema.index({ mfeId: 1, version: 1 }, { unique: true });

export const MFEVersion = model<IMFEVersion>("MFEVersion", mfeVersionSchema);
