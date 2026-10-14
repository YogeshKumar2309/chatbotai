import { Request, Response, NextFunction } from "express";
import { ApiError } from "../core";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  logger.error(`${statusCode} - ${err.message}`);
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal Server Error",
  });
};