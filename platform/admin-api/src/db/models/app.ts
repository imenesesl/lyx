import { Schema, model, type Document, type Types } from "mongoose";

export interface IApp extends Document {
  accountId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const appSchema = new Schema<IApp>({
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

appSchema.index({ accountId: 1, slug: 1 }, { unique: true });

export const App = model<IApp>("App", appSchema);
