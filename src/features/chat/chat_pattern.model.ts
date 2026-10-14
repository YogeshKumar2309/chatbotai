import { Schema, model, Model } from "mongoose";

export interface IQuestionItem {
  words: number[];
  text: string;
  count: number;
}

export interface IAnswerItem {
  type: string;
  words: number[];
  text: string;
  hitCount: number;
  count: number;
}

export interface IChatPattern {
  questions: IQuestionItem[];
  answers: IAnswerItem[];
  matchCount: number;
  totalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestionItem>(
  {
    words: { type: [Number], required: true },
    text: { type: String, required: true, trim: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const answerSchema = new Schema<IAnswerItem>(
  {
    type: { type: String, required: true, lowercase: true, index: true },
    words: { type: [Number], required: true },
    text: { type: String, required: true, maxlength: 100 },
    hitCount: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const chatPatternSchema = new Schema<IChatPattern>(
  {
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    matchCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

chatPatternSchema.index({ totalCount: -1, createdAt: -1 });
chatPatternSchema.index({ "questions.words": 1 });
chatPatternSchema.index({ "answers.type": 1 });

export const ChatPattern: Model<IChatPattern> =
  model<IChatPattern>("ChatPattern", chatPatternSchema);