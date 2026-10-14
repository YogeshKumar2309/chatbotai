import { Schema, model, Model } from "mongoose";

export interface IChatType {
  code: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatTypeSchema = new Schema<IChatType>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export const ChatType: Model<IChatType> =
  model<IChatType>("ChatType", chatTypeSchema);