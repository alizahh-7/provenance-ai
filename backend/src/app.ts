import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { apiRoutes } from "./routes/api.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ArtifactService } from "./services/artifactService.js";
import { EthersBlockchainService } from "./services/blockchainService.js";
import { createMetadataRepository } from "./services/metadataRepository.js";

export function createApp(
  service = new ArtifactService(
    new EthersBlockchainService(),
    createMetadataRepository()
  )
) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRoutes(service));

  const frontendDist = resolve(process.cwd(), "frontend", "dist");

  app.use(express.static(frontendDist));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    res.sendFile(resolve(frontendDist, "index.html"), (error) => {
      if (error) next(error);
    });
  });

  app.use(errorHandler);

  return app;
}
