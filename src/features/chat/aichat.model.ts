import { Schema, model, Model, Types } from "mongoose";

export type AIChatRole = "user" | "assistant" | "system";

export interface IAIChat {
  userId: Types.ObjectId;
  uniqueId: string;
  role: AIChatRole;
  content: string;
  tokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiChatSchema = new Schema<IAIChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    uniqueId: { type: String, required: true, lowercase: true, index: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true, maxlength: 5000 },
    tokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiChatSchema.index({ userId: 1, createdAt: -1 });
aiChatSchema.index({ uniqueId: 1, createdAt: 1 });

export const AIChat: Model<IAIChat> =
  model<IAIChat>("AIChat", aiChatSchema, "aichats");