import { Schema, model, type Document, type Types } from "mongoose";

export interface IMFE extends Document {
  accountId: Types.ObjectId;
  name: string;
  description: string;
  archived: boolean;
  createdAt: Date;
}

const mfeSchema = new Schema<IMFE>({
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "" },
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const MFE = model<IMFE>("MFE", mfeSchema);
