import type { MetadataRepository } from "./metadataRepository.js";
import type { OnChainArtifact, ProvenanceRecord, ProvenanceRelation } from "../models/artifact.js";
import type { ProvenanceAnalysis, ProvenanceIssue, ProvenanceRiskLevel, ProvenanceSeverity } from "../types/provenance.js";

const supportedRelationshipTypes = new Set([
  "DERIVED_FROM",
  "PROCESSED_BY",
  "TRAINED_TO_CREATE",
  "DATASET_FOR_TRAINING",
  "PREPROCESSING_FOR_TRAINING"
]);

const toError = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

function parseVersionValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  const match = cleaned.match(/(?:^|[a-z-])?(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  return Number(match[1]);
}

function isInitialModelVersion(version: string | null | undefined): boolean {
  const parsed = parseVersionValue(version);
  return parsed !== null && parsed === 1;
}

function relationshipMatches(record: ProvenanceRecord | null, source: string, target: string, relationshipType: string) {
  if (!record) return false;
  return record.relationships.some(
    (relationship) => relationship.from === source && relationship.to === target && relationship.relationship === relationshipType
  );
}

export function validateProvenanceInput(
  raw: string | null | undefined,
  expectedArtifactId: string,
  expectedArtifactType: string,
  expectedVersion: string,
  existingArtifactIds?: Set<string>
): ProvenanceRecord | undefined {
  if (raw == null || raw === "") return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw toError("Malformed provenance JSON. Please supply valid provenance metadata.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw toError("Provenance must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  const artifact = typeof record.artifact === "string" ? record.artifact.trim() : undefined;
  if (artifact && artifact !== expectedArtifactId) {
    throw toError("Provenance artifact ID does not match the registered artifact ID.");
  }

  const artifactType = typeof record.artifactType === "string" ? record.artifactType.trim() : expectedArtifactType;
  const version = typeof record.version === "string" ? record.version.trim() : expectedVersion;

  if (!artifactType) throw toError("Provenance artifactType is required.");
  if (artifactType !== expectedArtifactType) {
    throw toError("Provenance artifactType does not match the registered artifact type.");
  }

  if (!version) throw toError("Provenance version is required.");
  if (version !== expectedVersion) {
    throw toError("Provenance version does not match the registered artifact version.");
  }

  const parent = typeof record.parent === "string" ? record.parent.trim() : record.parent === null ? null : undefined;
  const dataset = typeof record.dataset === "string" ? record.dataset.trim() : record.dataset === null ? null : undefined;
  const preprocessing = typeof record.preprocessing === "string" ? record.preprocessing.trim() : record.preprocessing === null ? null : undefined;
  const trainingRun = typeof record.trainingRun === "string" ? record.trainingRun.trim() : record.trainingRun === null ? null : undefined;

  if (typeof record.parent !== "undefined" && record.parent !== null && typeof record.parent !== "string") {
    throw toError("Provenance parent must be a string ID or null.");
  }
  if (typeof record.parent === "string" && !record.parent.trim()) {
    throw toError("Provenance parent cannot be an empty string.");
  }
  if (typeof record.dataset !== "undefined" && record.dataset !== null && typeof record.dataset !== "string") {
    throw toError("Provenance dataset must be a string ID or null.");
  }
  if (typeof record.preprocessing !== "undefined" && record.preprocessing !== null && typeof record.preprocessing !== "string") {
    throw toError("Provenance preprocessing must be a string ID or null.");
  }
  if (typeof record.trainingRun !== "undefined" && record.trainingRun !== null && typeof record.trainingRun !== "string") {
    throw toError("Provenance trainingRun must be a string ID or null.");
  }
  if (typeof record.parent === "string" && existingArtifactIds && !existingArtifactIds.has(record.parent)) {
    throw toError(`Provenance parent references an unknown artifact ID: ${record.parent}.`);
  }

  if (record.metadata !== undefined && record.metadata !== null && (typeof record.metadata !== "object" || Array.isArray(record.metadata))) {
    throw toError("Provenance metadata must be an object when provided.");
  }

  if (record.timestamp !== undefined && record.timestamp !== null && typeof record.timestamp !== "number" && typeof record.timestamp !== "string") {
    throw toError("Provenance timestamp must be a number or ISO string when provided.");
  }

  const rawRelationships = Array.isArray(record.relationships) ? record.relationships : [];
  const relationships: ProvenanceRelation[] = rawRelationships.map((relationship, index) => {
    if (!relationship || typeof relationship !== "object" || Array.isArray(relationship)) {
      throw toError(`Provenance relationship at index ${index} must be an object.`);
    }
    const rel = relationship as Record<string, unknown>;
    const from = typeof rel.from === "string" ? rel.from.trim() : undefined;
    const to = typeof rel.to === "string" ? rel.to.trim() : undefined;
    const relationshipType = typeof rel.type === "string" ? rel.type.trim() : undefined;
    if (!from || !to) throw toError(`Provenance relationship at index ${index} must include non-empty from and to artifact IDs.`);
    if (!relationshipType || !supportedRelationshipTypes.has(relationshipType)) {
      throw toError(`Unsupported provenance relationship type "${String(relationshipType ?? "undefined")}".`);
    }

    const resolvedFrom = from === "$CURRENT_ARTIFACT" ? expectedArtifactId : from;
    const resolvedTo = to === "$CURRENT_ARTIFACT" ? expectedArtifactId : to;

    if (resolvedFrom === resolvedTo) {
      throw toError(`Provenance relationship at index ${index} cannot reference the same artifact as both source and target.`);
    }
    if (relationshipType === "DERIVED_FROM" && !(resolvedTo === expectedArtifactId && resolvedFrom !== expectedArtifactId)) {
      throw toError("DERIVED_FROM relationships must point from a parent artifact to the current artifact.");
    }
    if (relationshipType === "DERIVED_FROM" && resolvedFrom === expectedArtifactId) {
      throw toError("DERIVED_FROM relationships cannot use the current artifact as the parent reference.");
    }
    if (existingArtifactIds && relationshipType === "DERIVED_FROM" && !existingArtifactIds.has(resolvedFrom)) {
      throw toError(`DERIVED_FROM relationship references an unknown parent artifact ID: ${resolvedFrom}.`);
    }
    return { from: resolvedFrom, to: resolvedTo, relationship: relationshipType as ProvenanceRelation["relationship"] };
  });

  return {
    artifact: expectedArtifactId,
    artifactType,
    version,
    parent: parent ?? undefined,
    dataset: dataset ?? undefined,
    preprocessing: preprocessing ?? undefined,
    trainingRun: trainingRun ?? undefined,
    metadata: (record.metadata as Record<string, unknown> | null | undefined) ?? undefined,
    timestamp: record.timestamp as number | string | null | undefined,
    relationships
  };
}

function addIssue(issues: ProvenanceIssue[], code: ProvenanceIssue["code"], severity: ProvenanceSeverity, message: string) {
  issues.push({ code, severity, message });
}

export async function analyzeProvenance(
  record: ProvenanceRecord | null | undefined,
  metadataLookup?: Pick<MetadataRepository, "get">
): Promise<ProvenanceAnalysis> {
  const issues: ProvenanceIssue[] = [];

  if (!record) {
    return {
      riskLevel: "NONE",
      score: 0,
      issues: [],
      summary: "No provenance record was supplied for this artifact."
    };
  }

  const recordType = record.artifactType?.trim().toLowerCase();
  const isModel = recordType === "model" || recordType?.includes("model") || false;
  const currentVersionNumber = parseVersionValue(record.version);

  if (isModel && !record.parent && !isInitialModelVersion(record.version)) {
    addIssue(issues, "MISSING_PARENT", "MEDIUM", "Model has no recorded parent lineage.");
  }

  if (isModel && !record.dataset) {
    addIssue(issues, "MISSING_DATASET", "HIGH", "Training dataset is not linked.");
  }

  if (isModel && !record.trainingRun) {
    addIssue(issues, "MISSING_TRAINING_RUN", "HIGH", "Training run is not linked to the model.");
  }

  if (record.parent && metadataLookup) {
    const parentArtifact = (await metadataLookup.get(record.parent)) as OnChainArtifact | null | undefined;
    const parentVersion = parentArtifact?.version ?? null;
    const parentVersionNumber = parseVersionValue(parentVersion);

    if (parentVersionNumber !== null && currentVersionNumber !== null && parentVersionNumber > currentVersionNumber) {
      addIssue(issues, "BROKEN_PARENT_RELATIONSHIP", "HIGH", `Parent version ${String(parentVersion)} is newer than the artifact version ${String(record.version)}.`);
    }

    if (parentVersionNumber !== null && currentVersionNumber !== null && currentVersionNumber - parentVersionNumber > 1) {
      addIssue(issues, "UNEXPECTED_VERSION_JUMP", "MEDIUM", `Model version changed from ${String(parentVersion)} to ${String(record.version)} without intermediate lineage.`);
    }
  }

  if (record.trainingRun && record.dataset) {
    const hasDatasetRelationship = record.relationships.some(
      (relationship) =>
        relationship.relationship === "DATASET_FOR_TRAINING" &&
        ((relationship.from === record.dataset && relationship.to === record.trainingRun) ||
          (relationship.from === record.trainingRun && relationship.to === record.dataset))
    );
    if (!hasDatasetRelationship) {
      addIssue(issues, "BROKEN_TRAINING_DATASET_RELATIONSHIP", "HIGH", "Training run and dataset are linked without a valid training-dataset relationship.");
    }
  }

  const metadataVersion = record.metadata && typeof record.metadata === "object" && "version" in record.metadata ? String((record.metadata as Record<string, unknown>).version ?? "") : "";
  if (metadataVersion && record.version && metadataVersion !== record.version) {
    addIssue(issues, "INCONSISTENT_METADATA", "HIGH", `Artifact version ${String(record.version)} conflicts with metadata version ${String(metadataVersion)}.`);
  }

  if (record.metadata && typeof record.metadata === "object" && "artifactVersion" in record.metadata) {
    const artifactVersion = String((record.metadata as Record<string, unknown>).artifactVersion ?? "");
    if (artifactVersion && artifactVersion !== record.version) {
      addIssue(issues, "INCONSISTENT_METADATA", "HIGH", `Artifact metadata reports version ${artifactVersion}, but the record version is ${String(record.version)}.`);
    }
  }

  if (record.parent && !relationshipMatches(record, record.parent, record.artifact, "DERIVED_FROM")) {
    addIssue(issues, "BROKEN_PARENT_RELATIONSHIP", "MEDIUM", "Parent lineage is recorded without a valid provenance relationship.");
  }

  const dedupedIssues = issues.filter((issue, index, all) => all.findIndex((candidate) => candidate.code === issue.code && candidate.message === issue.message) === index);

  const riskLevel = getRiskLevel(dedupedIssues);
  const score = computeScore(dedupedIssues);
  const summary = summarizeIssues(dedupedIssues, riskLevel);

  return {
    riskLevel,
    score,
    issues: dedupedIssues,
    summary
  };
}

function getRiskLevel(issues: ProvenanceIssue[]): ProvenanceRiskLevel {
  if (issues.length === 0) return "NONE";
  if (issues.some((issue) => issue.severity === "HIGH")) return "HIGH";
  if (issues.some((issue) => issue.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

function computeScore(issues: ProvenanceIssue[]): number {
  let score = 0;
  for (const issue of issues) {
    if (issue.severity === "HIGH") score += 60;
    else if (issue.severity === "MEDIUM") score += 35;
    else score += 15;
  }
  return Math.min(score, 100);
}

function summarizeIssues(issues: ProvenanceIssue[], riskLevel: ProvenanceRiskLevel): string {
  if (issues.length === 0) {
    return "The artifact provenance is complete and internally consistent.";
  }
  const severityLabel = riskLevel === "NONE" ? "no" : riskLevel.toLowerCase();
  return `The artifact has ${issues.length} provenance issue${issues.length > 1 ? "s" : ""} and is classified as ${severityLabel} risk.`;
}

export function createGraphFromRecord(record: ProvenanceRecord): { nodes: Array<{ id: string; type: string; label: string; version?: string }>; relationships: Array<{ source: string; target: string; type: string }> } {
  const nodes = new Map<string, { id: string; type: string; label: string; version?: string }>();
  const relationships: Array<{ source: string; target: string; type: string }> = [];

  const addNode = (id: string, type: string, label: string, version?: string) => {
    if (!id) return;
    nodes.set(id, { id, type, label, version });
  };

  const resolveNodeType = (id: string): string => {
    if (id === record.artifact) return record.artifactType;
    if (id === record.parent) return "artifact";
    if (id === record.dataset) return "dataset";
    if (id === record.preprocessing) return "preprocessing";
    if (id === record.trainingRun) return "training";
    return "artifact";
  };

  addNode(record.artifact, record.artifactType, record.artifactType, record.version);
  if (record.parent) addNode(record.parent, "artifact", record.parent);
  if (record.dataset) addNode(record.dataset, "dataset", record.dataset);
  if (record.preprocessing) addNode(record.preprocessing, "preprocessing", record.preprocessing);
  if (record.trainingRun) addNode(record.trainingRun, "training", record.trainingRun);

  for (const relationship of record.relationships) {
    relationships.push({
      source: relationship.from,
      target: relationship.to,
      type: relationship.relationship
    });
    addNode(relationship.from, resolveNodeType(relationship.from), relationship.from);
    addNode(relationship.to, resolveNodeType(relationship.to), relationship.to);
  }

  return {
    nodes: Array.from(nodes.values()),
    relationships
  };
}
