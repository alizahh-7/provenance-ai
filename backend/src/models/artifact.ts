export interface ArtifactInput { artifactId: string; fingerprint: string; artifactType: string; version: string; metadataUri: string; }
export interface OnChainArtifact extends ArtifactInput { registeredAt: number; registrant: string; transactionHash?: string; chainId?: string; contractAddress?: string; }
export interface ProvenanceRelation { from: string; to: string; relationship: "DERIVED_FROM" | "PROCESSED_BY" | "TRAINED_TO_CREATE"; }
