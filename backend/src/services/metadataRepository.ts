import type { OnChainArtifact, ProvenanceRecord, ProvenanceRelation } from "../models/artifact.js";
import { createGraphFromRecord } from "./provenanceAnalyzer.js";

export class MetadataRepository {
  private artifacts = new Map<string, OnChainArtifact>();
  private provenance = new Map<string, ProvenanceRecord>();
  private relations: ProvenanceRelation[] = [];

  async save(artifact: OnChainArtifact) {
    this.artifacts.set(artifact.artifactId, artifact);
  }

  async saveProvenance(record: ProvenanceRecord) {
    this.provenance.set(record.artifact, record);
    this.relations = [...this.relations.filter((relation) => !(relation.from === record.artifact || relation.to === record.artifact)), ...record.relationships.map((relationship) => ({
      from: relationship.from,
      to: relationship.to,
      relationship: relationship.relationship
    }))];
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

  async graph(id: string) {
    const artifact = await this.get(id);
    const record = await this.getProvenance(id);

    if (!artifact && !record) {
      return { nodes: [], relationships: [] };
    }

    const graph = record ? createGraphFromRecord(record) : { nodes: [{ id, type: artifact?.artifactType ?? "artifact", label: artifact?.artifactType ?? id, version: artifact?.version }], relationships: [] };

    const normalizedRelationships = graph.relationships.map((relationship) => ({
      from: relationship.source,
      to: relationship.target,
      relationship: relationship.type as ProvenanceRelation["relationship"]
    }));

    return {
      nodes: graph.nodes,
      relationships: normalizedRelationships
    };
  }
}
