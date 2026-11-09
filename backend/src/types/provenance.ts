export type ProvenanceSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ProvenanceIssueCode =
  | "MISSING_PROVENANCE" | "MISSING_PARENT" | "MISSING_DATASET" | "MISSING_PREPROCESSING"
  | "MISSING_TRAINING_RUN" | "MISSING_MODEL_LINEAGE" | "UNSUPPORTED_VERSION_FORMAT"
  | "UNEXPECTED_VERSION_JUMP" | "INCONSISTENT_METADATA" | "BROKEN_PARENT_RELATIONSHIP"
  | "BROKEN_TRAINING_DATASET_RELATIONSHIP" | "UNKNOWN_PARENT";
export interface ProvenanceIssue { code: ProvenanceIssueCode; severity: ProvenanceSeverity; message: string; affectedNodeId: string | null; affectedField?: string; }
export type ProvenanceRiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export interface ProvenanceAnalysis { analysisMode: "RULE_BASED"; riskLevel: ProvenanceRiskLevel; riskScore: number; severity: ProvenanceSeverity; issues: ProvenanceIssue[]; explanation: string; }
export type ProvenanceNodeType = "dataset" | "preprocessing" | "training" | "model" | "artifact";
export interface ProvenanceGraphNode { id: string; type: ProvenanceNodeType; label: string; metadata: Record<string, unknown>; version?: string; }
export type ProvenanceGraphEdgeType = "processed_by" | "preprocessing_for" | "dataset_for_training" | "trained_to_create" | "derived_from";
export interface ProvenanceGraphEdge { id: string; source: string; target: string; type: ProvenanceGraphEdgeType; }
export interface ProvenanceGraph { nodes: ProvenanceGraphNode[]; edges: ProvenanceGraphEdge[]; relationships: Array<{ from: string; to: string; relationship: string }>; }
export interface ProvenanceInput {
  artifact?: string; artifactType?: string; version?: string; parent?: string | null;
  dataset?: string | null; datasets?: string[]; preprocessing?: string | null; trainingRun?: string | null;
  metadata?: Record<string, unknown> | null; timestamp?: number | string | null;
  relationships?: Array<{ from: string; to: string; type: string }>;
}
