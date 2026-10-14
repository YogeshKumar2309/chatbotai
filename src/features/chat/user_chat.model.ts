import { Schema, model, Model, Types } from "mongoose";

export type ChatRole = "user" | "assistant";

export interface IUserChat {
  userId: Types.ObjectId;
  uniqueId: string;
  role: ChatRole;
  words: number[];
  text: string;
  mood?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userChatSchema = new Schema<IUserChat>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    uniqueId: { type: String, required: true, lowercase: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    words: { type: [Number], required: true, default: [] },
    text: { type: String, required: true, maxlength: 5000 },
    mood: { type: String, default: null },
  },
  { timestamps: true }
);

userChatSchema.index({ userId: 1, uniqueId: 1, createdAt: -1 });

export const UserChat: Model<IUserChat> =
  model<IUserChat>("UserChat", userChatSchema);