import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../core";
import { letterRepository } from "./letter.repository";
import { LETTER_MESSAGES } from "./letter.constants";

export const ensureLetterExists = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const key = Number(req.params.key);
    const letter = await letterRepository.findByKey(key);
    if (!letter) throw new ApiError(404, LETTER_MESSAGES.NOT_FOUND(key));
    (req as any).letter = letter;
    next();
  } catch (err) {
    next(err);
  }
};

export const letterRequestLogger = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.log(`[LETTER] ${req.method} ${req.originalUrl}`);
  next();
};