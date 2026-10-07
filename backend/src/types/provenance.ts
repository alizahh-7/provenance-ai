export type ProvenanceSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ProvenanceIssueCode =
  | "MISSING_PARENT"
  | "MISSING_DATASET"
  | "MISSING_TRAINING_RUN"
  | "UNEXPECTED_VERSION_JUMP"
  | "INCONSISTENT_METADATA"
  | "BROKEN_PARENT_RELATIONSHIP"
  | "BROKEN_TRAINING_DATASET_RELATIONSHIP";

export interface ProvenanceIssue {
  code: ProvenanceIssueCode;
  severity: ProvenanceSeverity;
  message: string;
}

export type ProvenanceRiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface ProvenanceAnalysis {
  riskLevel: ProvenanceRiskLevel;
  score: number;
  issues: ProvenanceIssue[];
  summary: string;
}

export interface ProvenanceGraphNode {
  id: string;
  type: string;
  label: string;
  version?: string;
}

export interface ProvenanceGraphRelationship {
  source: string;
  target: string;
  type: string;
}

export interface ProvenanceGraph {
  nodes: ProvenanceGraphNode[];
  relationships: ProvenanceGraphRelationship[];
  analysis?: ProvenanceAnalysis;
}
