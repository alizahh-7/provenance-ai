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
    if (values.description !== undefined) {
      const description = values.description.trim();
      if (description.length > 2_000 || /[\u0000]/.test(description)) throw new ApiError("description must be at most 2000 characters and cannot contain null characters", 400, "INVALID_DESCRIPTION");
    }
  }
  async register(file: Express.Multer.File, values: Partial<Omit<ArtifactInput, "artifactId" | "fingerprint">>, provenanceInput?: string | Record<string, unknown>): Promise<OnChainArtifact & { fileSize: number; algorithm: string; originalFilename: string }> {
    this.validateRegistrationInput(values);
    const fp = await hashFile(file.path);
    const artifactType = values.artifactType!.trim();
    const version = values.version!.trim();
    const input: ArtifactInput = { artifactId: `art_${randomUUID().replaceAll("-", "").slice(0, 28)}`, fingerprint: fp.hash, artifactType, version, metadataUri: values.metadataUri?.trim() || "", description: values.description?.trim() || undefined };

    const existingArtifactIds = new Set(await this.metadata.artifactIds());
    const provenance = typeof provenanceInput === "string"
      ? validateProvenanceInput(provenanceInput, input.artifactId, input.artifactType, input.version, existingArtifactIds)
      : typeof provenanceInput === "object" && provenanceInput
        ? validateProvenanceInput(JSON.stringify(provenanceInput), input.artifactId, input.artifactType, input.version, existingArtifactIds)
        : undefined;

    const artifact = await this.chain.register(input);
    try {
      await this.metadata.save(artifact);
      if (provenance) await this.metadata.saveProvenance(provenance);
    } catch {
      throw new ApiError(`Blockchain registration succeeded for ${artifact.artifactId}, but metadata persistence failed. Do not retry registration; recover this artifact by ID after storage is restored.`, 502, "METADATA_PERSISTENCE_FAILED");
    }

    return { ...artifact, fileSize: fp.fileSize, algorithm: fp.algorithm, originalFilename: file.originalname };
  }
  async verify(file: Express.Multer.File, artifactId: string) { this.assertArtifactId(artifactId); const uploaded = await hashFile(file.path); const registered = await this.get(artifactId); const verified = uploaded.hash === registered.fingerprint.toLowerCase(); return { verified, status: verified ? "PASS" : "FAIL", artifactId, uploadedHash: uploaded.hash, registeredHash: registered.fingerprint, algorithm: uploaded.algorithm, fileSize: uploaded.fileSize, contractAddress: registered.contractAddress, chainId: registered.chainId, registeredAt: registered.registeredAt, registrant: registered.registrant, transactionHash: registered.transactionHash, message: verified ? "Artifact fingerprint matches the blockchain record." : "Artifact fingerprint does not match the blockchain record." }; }
  async get(id: string) {
    this.assertArtifactId(id);
    const chainRecord = await this.chain.get(id);
    if (!chainRecord) throw new ApiError("Artifact was not found on the configured blockchain", 404, "ARTIFACT_NOT_FOUND");
    // The contract is authoritative for fingerprint evidence. Supporting fields
    // (description and a known transaction hash) are recovered only from the
    // configured off-chain repository when it has them.
    const stored = await this.metadata.get(id);
    return { ...chainRecord, description: stored?.description, transactionHash: chainRecord.transactionHash ?? stored?.transactionHash };
  }
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
  async recent(limit: number) {
    if (!this.metadata.isPersistent) throw new ApiError("Recent activity is unavailable while METADATA_STORAGE=memory. Configure Firestore for durable history.", 503, "PERSISTENCE_UNAVAILABLE");
    return this.metadata.recent(Math.max(1, Math.min(limit, 50)));
  }
}
