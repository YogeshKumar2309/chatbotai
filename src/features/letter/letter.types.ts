import { Document } from "mongoose";

export interface ILetter extends Document {
  key: number;
  value: string;
}

export interface CreateLetterInput {
  key: number;
  value: string;
}

export interface UpdateLetterInput {
  key?: number;
  value?: string;
}

export interface LetterQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
}