import type { OnChainArtifact, ProvenanceRecord } from "../models/artifact.js";
import { createGraphFromRecord } from "./provenanceAnalyzer.js";

export class MetadataRepository {
  private artifacts = new Map<string, OnChainArtifact>();
  private provenance = new Map<string, ProvenanceRecord>();

  async save(artifact: OnChainArtifact) {
    this.artifacts.set(artifact.artifactId, artifact);
  }

  async saveProvenance(record: ProvenanceRecord) {
    this.provenance.set(record.artifact, record);
  }

  async artifactIds(): Promise<string[]> {
    return Array.from(this.artifacts.keys());
  }

  async hasArtifact(id: string): Promise<boolean> {
    return this.artifacts.has(id);
  }

  async get(id: string) {
    return this.artifacts.get(id) ?? null;
  }

  async getProvenance(id: string) {
    return this.provenance.get(id) ?? null;
  }

  async graph(id: string, knownArtifact?: OnChainArtifact | null) {
    const artifact = await this.get(id);
    const record = await this.getProvenance(id);

    if (!artifact && !record) {
      return { nodes: [], edges: [], relationships: [] };
    }

    const found = artifact ?? knownArtifact;
    const graph = record ? createGraphFromRecord(record) : { nodes: [{ id, type: found?.artifactType?.toLowerCase().includes("model") ? "model" as const : "artifact" as const, label: found?.artifactType ?? id, metadata: {}, version: found?.version }], edges: [], relationships: [] };

    return {
      ...graph
    };
  }
}
