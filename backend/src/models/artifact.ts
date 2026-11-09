/**
 * `fingerprint`, type, version, timestamp and registrant are anchored by the
 * contract. `description` is intentionally off-chain convenience metadata.
 */
export interface ArtifactInput { artifactId: string; fingerprint: string; artifactType: string; version: string; metadataUri: string; description?: string; }
export interface OnChainArtifact extends ArtifactInput { registeredAt: number; registrant: string; transactionHash?: string; chainId?: string; contractAddress?: string; }
export type ProvenanceRelationType = "DERIVED_FROM" | "PROCESSED_BY" | "TRAINED_TO_CREATE" | "DATASET_FOR_TRAINING" | "PREPROCESSING_FOR_TRAINING";
export interface ProvenanceRelation { from: string; to: string; relationship: ProvenanceRelationType; }
export interface ProvenanceRecord {
  artifact: string;
  artifactType: string;
  version: string;
  parent?: string | null;
  dataset?: string | null;
  datasets?: string[];
  preprocessing?: string | null;
  trainingRun?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp?: number | string | null;
  relationships: ProvenanceRelation[];
}
