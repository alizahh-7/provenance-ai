import { Router } from "express";
import type { ArtifactService } from "../services/artifactService.js";
import { artifactController } from "../controllers/artifactController.js";
import { upload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const apiRoutes = (service: ArtifactService) => { const router = Router(); const c = artifactController(service); router.get("/health", (_req, res) => res.json({ success: true, status: "ok" })); router.post("/artifacts/register", upload.single("artifact"), asyncHandler(c.register)); router.post("/artifacts/verify", upload.single("artifact"), asyncHandler(c.verify)); router.get("/artifacts", asyncHandler(c.recent)); router.get("/artifacts/:id", asyncHandler(c.get)); router.get("/provenance/:id", asyncHandler(c.provenance)); return router; };
