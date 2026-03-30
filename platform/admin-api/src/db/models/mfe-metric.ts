import { Schema, model, type Document } from "mongoose";

export interface IMFEMetric extends Document {
  mfeName: string;
  mfeVersion: string;
  slot: string;
  type: "load_success" | "load_error" | "render_error" | "event_timeout";
  loadTimeMs?: number;
  errorMessage?: string;
  timestamp: Date;
}

const mfeMetricSchema = new Schema<IMFEMetric>({
  mfeName: { type: String, required: true, index: true },
  mfeVersion: { type: String, required: true },
  slot: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["load_success", "load_error", "render_error", "event_timeout"],
    index: true,
  },
  loadTimeMs: { type: Number },
  errorMessage: { type: String },
  timestamp: { type: Date, required: true, index: true },
});

mfeMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });
mfeMetricSchema.index({ mfeName: 1, timestamp: -1 });

export const MFEMetric = model<IMFEMetric>("MFEMetric", mfeMetricSchema);
