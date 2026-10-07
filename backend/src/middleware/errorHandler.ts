import type { ErrorRequestHandler } from "express";
import multer from "multer";
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => { const status = err instanceof multer.MulterError ? 400 : err.statusCode || 500; res.status(status).json({ success: false, error: status === 500 ? "Internal server error" : err.message }); };
