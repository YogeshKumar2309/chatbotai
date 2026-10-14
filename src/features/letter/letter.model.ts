import { Schema, model, Model } from "mongoose";

export interface ILetter {
  key: number;
  value: string;
  count: number;
  types: string[];
  createdAt: Date;
  updatedAt: Date;
}

const letterSchema = new Schema<ILetter>(
  {
    key: {
      type: Number,
      required: [true, "Key is required"],
      unique: true,
      min: 1,
      index: true,
    },
    value: {
      type: String,
      required: [true, "Value is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
      index: true,
    },
    types: {
      type: [String],
      default: ["a"],
      index: true,
    },
  },
  { timestamps: true }
);

letterSchema.index({ count: -1, key: 1 });
letterSchema.index({ key: 1, value: 1 });

export const Letter: Model<ILetter> = model<ILetter>("Letter", letterSchema);