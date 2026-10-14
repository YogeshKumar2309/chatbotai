import { Schema, model, Model } from "mongoose";

export interface IAnswer {
  answerWords: number[];
  answerText?: string;        // ⭐ optional
  source: "ai" | "cache" | "manual";
  hitCount: number;
  count: number;              // ⭐ count add kiya
  createdAt: Date;
}

export interface IConversation {
  questionKey: string;        // "77,22,35,89" — fast lookup
  questionWords: number[];
  questionText?: string;      // ⭐ optional
  answers: IAnswer[];
  totalHits: number;
  totalCount: number;         // ⭐
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>(
  {
    answerWords: { type: [Number], required: true },
    answerText: { type: String, trim: true },   // ⭐ not required
    source: {
      type: String,
      enum: ["ai", "cache", "manual"],
      default: "manual",
    },
    hitCount: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    questionKey: { type: String, required: true, unique: true, index: true },
    questionWords: { type: [Number], required: true, index: true },
    questionText: { type: String, trim: true },   // ⭐ not required
    answers: { type: [answerSchema], default: [] },
    totalHits: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ questionWords: 1 });
conversationSchema.index({ totalCount: -1 });

export const Conversation: Model<IConversation> =
  model<IConversation>("Conversation", conversationSchema);