import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config/env.js";
const directory = join(process.cwd(), config.uploadsDir); mkdirSync(directory, { recursive: true });
export const upload = multer({ storage: multer.diskStorage({ destination: directory, filename: (_req, file, cb) => cb(null, `${randomUUID()}${file.originalname.includes(".") ? `.${file.originalname.split(".").pop()}` : ""}`) }), limits: { fileSize: config.maxFileSize, files: 1 } });
