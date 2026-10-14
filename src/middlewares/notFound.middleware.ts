import { Request, Response, NextFunction } from "express";
import { ApiError } from "../core";

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};