import { randomUUID } from "node:crypto";
import type { BlockchainGateway } from "./blockchainService.js";
import type { MetadataRepository } from "./metadataRepository.js";
import { hashFile } from "./hashingService.js";
import type { ArtifactInput, OnChainArtifact } from "../models/artifact.js";
import { analyzeProvenance, validateProvenanceInput } from "./provenanceAnalyzer.js";
import { ApiError } from "../utils/errors.js";

export class ArtifactService {
  constructor(private readonly chain: BlockchainGateway, private readonly metadata: MetadataRepository) {}
  private assertArtifactId(artifactId: string) { if (!artifactId?.trim() || Buffer.byteLength(artifactId, "utf8") > 32 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(artifactId)) throw new ApiError("artifactId must be a safe non-empty identifier no longer than 32 UTF-8 bytes", 400, "INVALID_ARTIFACT_ID"); }
  private validateRegistrationInput(values: Partial<Omit<ArtifactInput, "artifactId" | "fingerprint">>) {
    const validLabel = (value: string | undefined) => Boolean(value?.trim() && value.trim().length <= 64 && /^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(value.trim()));
    if (!validLabel(values.artifactType)) throw new ApiError("artifactType is required and must be at most 64 safe text characters", 400, "INVALID_ARTIFACT_TYPE");
    if (!validLabel(values.version)) throw new ApiError("version is required and must be at most 64 safe text characters", 400, "INVALID_VERSION");
    if (values.metadataUri?.trim()) {
      const uri = values.metadataUri.trim();
      if (uri.length > 2048 || !/^(https?:\/\/|ipfs:\/\/)/i.test(uri)) throw new ApiError("metadataUri must be an http(s) or ipfs URI no longer than 2048 characters", 400, "INVALID_METADATA_URI");
    }
  }
  async register(file: Express.Multer.File, values: Partial<Omit<ArtifactInput, "artifactId" | "fingerprint">>, provenanceInput?: string | Record<string, unknown>): Promise<OnChainArtifact & { fileSize: number; algorithm: string; originalFilename: string }> {
    this.validateRegistrationInput(values);
    const fp = await hashFile(file.path);
    const artifactType = values.artifactType!.trim();
    const version = values.version!.trim();
    const input: ArtifactInput = { artifactId: `art_${randomUUID().replaceAll("-", "").slice(0, 28)}`, fingerprint: fp.hash, artifactType, version, metadataUri: values.metadataUri?.trim() || "" };

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
  async verify(file: Express.Multer.File, artifactId: string) { this.assertArtifactId(artifactId); const uploaded = await hashFile(file.path); const registered = await this.chain.get(artifactId); if (!registered) throw new ApiError("Artifact was not found on the configured blockchain", 404, "ARTIFACT_NOT_FOUND"); const verified = uploaded.hash === registered.fingerprint.toLowerCase(); return { verified, status: verified ? "PASS" : "FAIL", artifactId, uploadedHash: uploaded.hash, registeredHash: registered.fingerprint, algorithm: uploaded.algorithm, fileSize: uploaded.fileSize, contractAddress: registered.contractAddress, chainId: registered.chainId, registeredAt: registered.registeredAt, registrant: registered.registrant, message: verified ? "Artifact fingerprint matches the blockchain record." : "Artifact fingerprint does not match the blockchain record." }; }
  async get(id: string) { this.assertArtifactId(id); const result = await this.chain.get(id); if (!result) throw new ApiError("Artifact was not found on the configured blockchain", 404, "ARTIFACT_NOT_FOUND"); return result; }
  async graph(id: string) {
    this.assertArtifactId(id);
    const chainArtifact = await this.chain.get(id);
    const storedArtifact = await this.metadata.get(id);
    const record = await this.metadata.getProvenance(id);
    if (!chainArtifact && !storedArtifact && !record) throw new ApiError("Artifact was not found on the configured blockchain", 404, "ARTIFACT_NOT_FOUND");
    const graph = await this.metadata.graph(id, chainArtifact);
    return {
      ...graph,
      analysis: await analyzeProvenance(record, this.metadata)
    };
  }
}
