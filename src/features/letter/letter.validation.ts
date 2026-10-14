import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../core";
import { isPositiveInt } from "../../utils/validators";
import { LETTER_MESSAGES } from "./letter.constants";

const isWord = (v: unknown): boolean =>
  typeof v === "string" && /^[a-zA-Z]{1,50}$/.test(v.trim());

export const validateCreateLetter = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { key, value } = req.body;
  if (!isPositiveInt(Number(key))) return next(new ApiError(400, LETTER_MESSAGES.INVALID_KEY));
  if (!isWord(value)) return next(new ApiError(400, LETTER_MESSAGES.INVALID_VALUE));
  next();
};

export const validateUpdateLetter = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { key, value } = req.body;
  if (key !== undefined && !isPositiveInt(Number(key)))
    return next(new ApiError(400, LETTER_MESSAGES.INVALID_KEY));
  if (value !== undefined && !isWord(value))
    return next(new ApiError(400, LETTER_MESSAGES.INVALID_VALUE));
  next();
};

export const validateKeyParam = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const key = Number(req.params.key);
  if (!isPositiveInt(key)) return next(new ApiError(400, LETTER_MESSAGES.INVALID_KEY));
  next();
};