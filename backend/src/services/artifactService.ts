import { randomUUID } from "node:crypto";
import type { BlockchainGateway } from "./blockchainService.js";
import type { MetadataRepository } from "./metadataRepository.js";
import { hashFile } from "./hashingService.js";
import type { ArtifactInput, OnChainArtifact } from "../models/artifact.js";
import { analyzeProvenance, validateProvenanceInput } from "./provenanceAnalyzer.js";

export class ArtifactService {
  constructor(private readonly chain: BlockchainGateway, private readonly metadata: MetadataRepository) {}
  private assertArtifactId(artifactId: string) { if (!artifactId?.trim() || Buffer.byteLength(artifactId, "utf8") > 32) throw Object.assign(new Error("artifactId must be a non-empty UTF-8 value no longer than 32 bytes"), { statusCode: 400 }); }
  async register(file: Express.Multer.File, values: Partial<Omit<ArtifactInput, "artifactId" | "fingerprint">>, provenanceInput?: string | Record<string, unknown>): Promise<OnChainArtifact & { fileSize: number; algorithm: string; originalFilename: string }> {
    if (!values.artifactType?.trim() || !values.version?.trim()) throw Object.assign(new Error("artifactType and version are required"), { statusCode: 400 });
    const fp = await hashFile(file.path);
    const input: ArtifactInput = { artifactId: `art_${randomUUID().replaceAll("-", "").slice(0, 28)}`, fingerprint: fp.hash, artifactType: values.artifactType.trim(), version: values.version.trim(), metadataUri: values.metadataUri?.trim() || "" };

    const existingArtifactIds = new Set(await this.metadata.artifactIds());
    const provenance = typeof provenanceInput === "string"
      ? validateProvenanceInput(provenanceInput, input.artifactId, input.artifactType, input.version, existingArtifactIds)
      : typeof provenanceInput === "object" && provenanceInput
        ? validateProvenanceInput(JSON.stringify(provenanceInput), input.artifactId, input.artifactType, input.version, existingArtifactIds)
        : undefined;

    const artifact = await this.chain.register(input);
    await this.metadata.save(artifact);

    if (provenance) {
      await this.metadata.saveProvenance(provenance);
    }

    return { ...artifact, fileSize: fp.fileSize, algorithm: fp.algorithm, originalFilename: file.originalname };
  }
  async verify(file: Express.Multer.File, artifactId: string) { this.assertArtifactId(artifactId); const uploaded = await hashFile(file.path); const registered = await this.chain.get(artifactId); if (!registered) throw Object.assign(new Error("Artifact was not found on the configured blockchain"), { statusCode: 404 }); const verified = uploaded.hash === registered.fingerprint.toLowerCase(); return { verified, status: verified ? "PASS" : "FAIL", artifactId, uploadedHash: uploaded.hash, registeredHash: registered.fingerprint, message: verified ? "Artifact fingerprint matches the blockchain record." : "Artifact fingerprint does not match the blockchain record." }; }
  async get(id: string) { this.assertArtifactId(id); const result = await this.chain.get(id); if (!result) throw Object.assign(new Error("Artifact was not found on the configured blockchain"), { statusCode: 404 }); return result; }
  async graph(id: string) {
    const graph = await this.metadata.graph(id);
    const record = await this.metadata.getProvenance(id);
    return {
      ...graph,
      analysis: await analyzeProvenance(record, this.metadata)
    };
  }
}
