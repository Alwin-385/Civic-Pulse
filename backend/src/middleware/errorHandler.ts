import { Request, Response, NextFunction } from "express";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseConnectionError } from "../utils/dbError";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Error:", err);

  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({
      message: DATABASE_UNAVAILABLE_MESSAGE,
    });
  }

  const message =
    typeof err?.message === "string" && err.message.length < 500
      ? err.message
      : "Internal Server Error";

  return res.status(err.status || 500).json({
    message,
  });
};