import { Schema, model, type Document } from "mongoose";

export interface IAccount extends Document {
  email: string;
  passwordHash: string;
  name: string;
  alias?: string;
  shellUrl?: string;
  createdAt: Date;
}

const accountSchema = new Schema<IAccount>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  alias: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  shellUrl: { type: String, default: "", trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const Account = model<IAccount>("Account", accountSchema);
