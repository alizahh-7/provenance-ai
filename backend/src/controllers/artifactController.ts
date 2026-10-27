import type { RequestHandler } from "express";
import type { ArtifactService } from "../services/artifactService.js";
import { removeTemporaryFile } from "../utils/files.js";
const requireFile = (file?: Express.Multer.File) => { if (!file) throw Object.assign(new Error("A multipart field named artifact is required"), { statusCode: 400 }); return file; };
export const artifactController = (service: ArtifactService): Record<string, RequestHandler> => ({
  register: async (req, res) => { const file = requireFile(req.file); try { const provenanceInput = typeof req.body.provenance === "string" ? req.body.provenance : typeof req.body.provenance === "object" && req.body.provenance ? JSON.stringify(req.body.provenance) : undefined; const artifact = await service.register(file, req.body, provenanceInput); res.status(201).json({ success: true, registrationStatus: "CONFIRMED", artifact }); } finally { await removeTemporaryFile(file.path); } },
  verify: async (req, res) => { const file = requireFile(req.file); try { res.json(await service.verify(file, String(req.body.artifactId || ""))); } finally { await removeTemporaryFile(file.path); } },
  get: async (req, res) => { const id = String(req.params.id); res.json({ success: true, artifact: await service.get(id) }); },
  provenance: async (req, res) => { const id = String(req.params.id); const result = await service.graph(id); res.json({ success: true, artifactId: id, ...result, graph: { nodes: result.nodes, edges: result.edges, relationships: result.relationships } }); }
});
