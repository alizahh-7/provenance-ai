import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ApiError } from "../utils/errors.js";
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({ success: false, code: tooLarge ? "FILE_TOO_LARGE" : "MULTIPART_ERROR", error: tooLarge ? "Artifact exceeds the configured file size limit" : "Malformed multipart upload" });
  }
  const safeError = err instanceof ApiError;
  const validationError = !safeError && typeof err?.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500;
  const status = safeError || validationError ? err.statusCode : 500;
  return res.status(status).json({ success: false, code: safeError ? err.code : validationError ? "VALIDATION_ERROR" : "INTERNAL_ERROR", error: safeError || validationError ? err.message : "Internal server error" });
};
