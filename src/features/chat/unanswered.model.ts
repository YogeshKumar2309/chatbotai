import { Schema, model, Model } from "mongoose";

export interface IUnanswered {
  questionKey: string;      // "77,22,35,89" — fast lookup
  questionWords: number[];  // [77, 22, 35, 89]
  count: number;            // kitni baar aaya
  mood?: string;
  firstSeen: Date;
  lastSeen: Date;
}

const unansweredSchema = new Schema<IUnanswered>(
  {
    questionKey: { type: String, required: true, unique: true, index: true },
    questionWords: { type: [Number], required: true, index: true },
    count: { type: Number, default: 1, index: true },
    mood: { type: String },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

unansweredSchema.index({ count: -1 });   // sabse zyada puchhe gaye upar

export const Unanswered: Model<IUnanswered> =
  model<IUnanswered>("Unanswered", unansweredSchema);