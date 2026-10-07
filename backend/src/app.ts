import express from "express";
import cors from "cors";
import { apiRoutes } from "./routes/api.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ArtifactService } from "./services/artifactService.js";
import { EthersBlockchainService } from "./services/blockchainService.js";
import { MetadataRepository } from "./services/metadataRepository.js";
export function createApp(service = new ArtifactService(new EthersBlockchainService(), new MetadataRepository())) { const app = express(); app.use(cors()); app.use(express.json()); app.use("/api", apiRoutes(service)); app.use(errorHandler); return app; }
