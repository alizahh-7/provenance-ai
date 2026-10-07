import type { RequestHandler } from "express";
import type { ArtifactService } from "../services/artifactService.js";
import { removeTemporaryFile } from "../utils/files.js";
const requireFile = (file?: Express.Multer.File) => { if (!file) throw Object.assign(new Error("A multipart field named artifact is required"), { statusCode: 400 }); return file; };
export const artifactController = (service: ArtifactService): Record<string, RequestHandler> => ({
  register: async (req, res) => { const file = requireFile(req.file); try { const artifact = await service.register(file, req.body); res.status(201).json({ success: true, artifact }); } finally { await removeTemporaryFile(file.path); } },
  verify: async (req, res) => { const file = requireFile(req.file); try { res.json(await service.verify(file, String(req.body.artifactId || ""))); } finally { await removeTemporaryFile(file.path); } },
  get: async (req, res) => { const id = String(req.params.id); res.json({ success: true, artifact: await service.get(id) }); },
  provenance: async (req, res) => { const id = String(req.params.id); res.json({ success: true, artifactId: id, ...(await service.graph(id)) }); }
});
