import type { OnChainArtifact, ProvenanceRelation } from "../models/artifact.js";
export class MetadataRepository {
  private artifacts = new Map<string, OnChainArtifact>(); private relations: ProvenanceRelation[] = [];
  async save(artifact: OnChainArtifact) { this.artifacts.set(artifact.artifactId, artifact); }
  async get(id: string) { return this.artifacts.get(id) ?? null; }
  async graph(id: string) { const artifact = await this.get(id); return { nodes: artifact ? [{ id, label: artifact.artifactType, version: artifact.version }] : [], relationships: this.relations.filter(r => r.from === id || r.to === id) }; }
}
