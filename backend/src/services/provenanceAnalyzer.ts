import type { MetadataRepository } from "./metadataRepository.js";
import type { OnChainArtifact, ProvenanceRecord, ProvenanceRelation, ProvenanceRelationType } from "../models/artifact.js";
import type { ProvenanceAnalysis, ProvenanceGraph, ProvenanceGraphEdgeType, ProvenanceGraphNode, ProvenanceIssue, ProvenanceIssueCode, ProvenanceRiskLevel, ProvenanceSeverity } from "../types/provenance.js";

const supported = new Set<ProvenanceRelationType>(["DERIVED_FROM", "PROCESSED_BY", "TRAINED_TO_CREATE", "DATASET_FOR_TRAINING", "PREPROCESSING_FOR_TRAINING"]);
const fail = (message: string): never => { throw Object.assign(new Error(message), { statusCode: 400 }); };
const validId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
const checkDepth = (value: unknown, depth = 0): void => {
  if (depth > 8) fail("Provenance metadata exceeds the maximum nesting depth of 8.");
  if (value && typeof value === "object") for (const child of Object.values(value)) checkDepth(child, depth + 1);
};

export function validateProvenanceInput(raw: string | null | undefined, expectedArtifactId: string, expectedArtifactType: string, expectedVersion: string, existingArtifactIds?: Set<string>): ProvenanceRecord | undefined {
  if (raw == null) return undefined;
  if (Buffer.byteLength(raw, "utf8") > 65_536) fail("Provenance JSON exceeds the 65536 byte limit.");
  if (!raw.trim()) fail("Provenance must not be empty when supplied.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("Malformed provenance JSON. Please supply valid provenance metadata."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Provenance must be a JSON object.");
  checkDepth(value);
  const input = value as Record<string, unknown>;
  if (input.artifact !== undefined && input.artifact !== expectedArtifactId) fail("Provenance artifact ID does not match the registered artifact ID.");
  const artifactType = input.artifactType === undefined ? expectedArtifactType : input.artifactType;
  const version = input.version === undefined ? expectedVersion : input.version;
  if (typeof artifactType !== "string" || artifactType.trim() !== expectedArtifactType) fail("Provenance artifactType must match the registered artifact type.");
  if (typeof version !== "string" || version.trim() !== expectedVersion) fail("Provenance version must match the registered artifact version.");
  const resolvedType = artifactType as string;
  const resolvedVersion = version as string;
  for (const key of ["parent", "dataset", "preprocessing", "trainingRun"] as const) {
    const id = input[key];
    if (id !== undefined && id !== null && !validId(id)) fail(`Provenance ${key} must be a valid identifier or null.`);
  }
  if (input.datasets !== undefined && (!Array.isArray(input.datasets) || input.datasets.length > 32 || !input.datasets.every(validId))) fail("Provenance datasets must be an array of at most 32 valid identifiers.");
  const inputDatasets = Array.isArray(input.datasets) ? input.datasets as string[] : undefined;
  if (inputDatasets && new Set(inputDatasets).size !== inputDatasets.length) fail("Provenance datasets must not contain duplicate identifiers.");
  if (input.dataset != null && inputDatasets?.includes(input.dataset as string)) fail("Provenance dataset must not be repeated in datasets.");
  for (const key of ["metadata"] as const) if (input[key] !== undefined && input[key] !== null && (typeof input[key] !== "object" || Array.isArray(input[key]))) fail(`Provenance ${key} must be an object or null.`);
  if (input.timestamp !== undefined && input.timestamp !== null && !(typeof input.timestamp === "number" && Number.isFinite(input.timestamp)) && !(typeof input.timestamp === "string" && Number.isFinite(Date.parse(input.timestamp)))) fail("Provenance timestamp must be a finite number or valid date string.");
  if (input.relationships !== undefined && !Array.isArray(input.relationships)) fail("Provenance relationships must be an array.");
  const datasets = [...(input.dataset ? [input.dataset as string] : []), ...(inputDatasets ?? [])];
  const roleIds = [expectedArtifactId, ...datasets, input.preprocessing, input.trainingRun, input.parent].filter((id): id is string => typeof id === "string");
  if (new Set(roleIds).size !== roleIds.length) fail("Provenance node identifiers must be unique across lineage roles.");
  const known = new Set(roleIds);
  const relationships: ProvenanceRelation[] = [];
  for (const [index, rawRelation] of ((input.relationships as unknown[] | undefined) ?? []).entries()) {
    if (!rawRelation || typeof rawRelation !== "object" || Array.isArray(rawRelation)) fail(`Provenance relationship at index ${index} must be an object.`);
    const rel = rawRelation as Record<string, unknown>;
    const from = rel.from === "$CURRENT_ARTIFACT" ? expectedArtifactId : rel.from;
    const to = rel.to === "$CURRENT_ARTIFACT" ? expectedArtifactId : rel.to;
    if (!validId(from) || !validId(to) || from === to) fail(`Provenance relationship at index ${index} has invalid endpoints.`);
    if (typeof rel.type !== "string" || !supported.has(rel.type as ProvenanceRelationType)) fail(`Unsupported provenance relationship type at index ${index}.`);
    const source = from as string, target = to as string;
    if (!known.has(source) || !known.has(target)) fail(`Provenance relationship at index ${index} references an undeclared node.`);
    const relationship = rel.type as ProvenanceRelationType;
    const valid = relationship === "DERIVED_FROM" ? source === input.parent && target === expectedArtifactId
      : relationship === "PROCESSED_BY" ? datasets.includes(source) && target === input.preprocessing
      : relationship === "DATASET_FOR_TRAINING" ? datasets.includes(source) && target === input.trainingRun
      : relationship === "PREPROCESSING_FOR_TRAINING" ? source === input.preprocessing && target === input.trainingRun
      : source === input.trainingRun && target === expectedArtifactId;
    if (!valid) fail(`Provenance relationship at index ${index} conflicts with lineage roles or direction.`);
    if (relationships.some(r => r.from === source && r.to === target && r.relationship === relationship)) fail(`Duplicate provenance relationship at index ${index}.`);
    relationships.push({ from: source, to: target, relationship });
  }
  if (input.parent && existingArtifactIds && !existingArtifactIds.has(input.parent as string)) fail(`Provenance parent references an unknown artifact ID: ${String(input.parent)}.`);
  return {
    artifact: expectedArtifactId, artifactType: resolvedType.trim(), version: resolvedVersion.trim(),
    parent: input.parent as string | null | undefined,
    dataset: input.dataset as string | null | undefined, datasets: inputDatasets,
    preprocessing: input.preprocessing as string | null | undefined, trainingRun: input.trainingRun as string | null | undefined,
    metadata: input.metadata as Record<string, unknown> | null | undefined,
    timestamp: input.timestamp as number | string | null | undefined, relationships
  };
}

const addIssue = (issues: ProvenanceIssue[], code: ProvenanceIssueCode, severity: ProvenanceSeverity, message: string, affectedField: string, nodeId: string | null = null) => issues.push({ code, severity, message, affectedField, affectedNodeId: nodeId });
const version = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = /^(?:v)?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/.exec(value);
  return match ? Number(match[1]) * 1_000_000 + Number(match[2] ?? 0) * 1_000 + Number(match[3] ?? 0) : null;
};
const isInitialVersion = (value: string): boolean => {
  const match = /^(?:v)?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/.exec(value);
  return Boolean(match && Number(match[1]) === 1);
};

export async function analyzeProvenance(record: ProvenanceRecord | null | undefined, metadataLookup?: Pick<MetadataRepository, "get">): Promise<ProvenanceAnalysis> {
  const issues: ProvenanceIssue[] = [];
  if (!record) addIssue(issues, "MISSING_PROVENANCE", "HIGH", "No provenance record is stored for this artifact.", "provenance");
  else {
    const datasets = [...(record.dataset ? [record.dataset] : []), ...(record.datasets ?? [])];
    if (datasets.length === 0) addIssue(issues, "MISSING_DATASET", "HIGH", "No dataset reference was supplied.", "dataset", record.artifact);
    if (!record.preprocessing) addIssue(issues, "MISSING_PREPROCESSING", "MEDIUM", "No preprocessing stage was supplied.", "preprocessing", record.artifact);
    if (!record.trainingRun) addIssue(issues, "MISSING_TRAINING_RUN", "HIGH", "No training run was supplied.", "trainingRun", record.artifact);
    if (!record.parent && !isInitialVersion(record.version)) addIssue(issues, "MISSING_PARENT", "MEDIUM", "No parent artifact reference was supplied.", "parent", record.artifact);
    const declared = new Set([record.artifact, ...datasets, record.preprocessing, record.trainingRun, record.parent].filter((id): id is string => Boolean(id)));
    for (const relation of record.relationships ?? []) if (!declared.has(relation.from) || !declared.has(relation.to)) addIssue(issues, "BROKEN_PARENT_RELATIONSHIP", "HIGH", "A lineage relationship references an undeclared node.", "relationships");
    // Scalar lineage references are authoritative edges when explicit relationship entries are omitted.
    if (record.parent && metadataLookup) {
      const parent = await metadataLookup.get(record.parent) as OnChainArtifact | null;
      if (!parent) addIssue(issues, "UNKNOWN_PARENT", "MEDIUM", `Parent artifact ${record.parent} is not available in the metadata repository.`, "parent", record.parent);
      else {
        const parentVersion = version(parent.version), current = version(record.version);
        if (parentVersion === null || current === null) addIssue(issues, "UNSUPPORTED_VERSION_FORMAT", "LOW", "A version value uses an unsupported format; version ordering could not be checked.", "version", record.artifact);
        else if (parentVersion > current) addIssue(issues, "BROKEN_PARENT_RELATIONSHIP", "HIGH", "Parent version is newer than the registered artifact version.", "parent", record.parent);
        else if (current - parentVersion > 1_000_000) addIssue(issues, "UNEXPECTED_VERSION_JUMP", "MEDIUM", "Parent and artifact versions differ by more than one major version step.", "version", record.artifact);
      }
    }
    const meta = record.metadata ?? {};
    for (const key of ["version", "artifactVersion"] as const) if (meta[key] !== undefined && meta[key] !== record.version) addIssue(issues, "INCONSISTENT_METADATA", "HIGH", `Metadata field ${key} conflicts with the registered artifact version.`, `metadata.${key}`, record.artifact);
    if (meta.dataset !== undefined && !datasets.includes(String(meta.dataset))) addIssue(issues, "INCONSISTENT_METADATA", "MEDIUM", "Metadata dataset conflicts with the declared dataset references.", "metadata.dataset", record.artifact);
    if (version(record.version) === null) addIssue(issues, "UNSUPPORTED_VERSION_FORMAT", "LOW", "The artifact version format is unsupported for ordering checks.", "version", record.artifact);
  }
  const unique = issues.filter((issue, i, all) => all.findIndex(other => other.code === issue.code && other.affectedField === issue.affectedField && other.affectedNodeId === issue.affectedNodeId) === i);
  const riskScore = Math.min(100, unique.reduce((sum, issue) => sum + ({ HIGH: 40, MEDIUM: 20, LOW: 5 }[issue.severity]), 0));
  const riskLevel: ProvenanceRiskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : riskScore > 0 ? "LOW" : "NONE";
  const severity: ProvenanceSeverity = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";
  return { riskLevel, riskScore, severity, issues: unique, explanation: unique.length ? `${unique.length} provenance issue(s) were detected by deterministic metadata rules; this is not a trained model or proof of factual history.` : "No configured provenance consistency issues were detected; this does not independently prove the supplied history is factual." };
}

export function createGraphFromRecord(record: ProvenanceRecord): ProvenanceGraph {
  const nodes = new Map<string, ProvenanceGraphNode>();
  const edges = new Map<string, ProvenanceGraph["edges"][number]>();
  const addNode = (id: string | null | undefined, type: ProvenanceGraphNode["type"], metadata: Record<string, unknown> = {}, nodeVersion?: string) => {
    if (!id) return;
    const label = typeof metadata.name === "string" ? metadata.name : id;
    nodes.set(id, { id, type, label, metadata, ...(nodeVersion ? { version: nodeVersion } : {}) });
  };
  const meta = record.metadata ?? {};
  const datasets = [...(record.dataset ? [record.dataset] : []), ...(record.datasets ?? [])];
  datasets.forEach((id, i) => addNode(id, "dataset", (meta.datasets as Record<string, unknown>[] | undefined)?.[i] ?? (id === record.dataset ? (meta.datasetMetadata as Record<string, unknown> | undefined) ?? {} : {})));
  addNode(record.preprocessing, "preprocessing", (meta.preprocessing as Record<string, unknown> | undefined) ?? {});
  addNode(record.trainingRun, "training", (meta.training as Record<string, unknown> | undefined) ?? {});
  addNode(record.artifact, record.artifactType.toLowerCase().includes("model") ? "model" : "artifact", meta, record.version);
  addNode(record.parent, "artifact", {});
  const putEdge = (source: string | undefined, target: string | undefined, type: ProvenanceGraphEdgeType) => {
    if (!source || !target || !nodes.has(source) || !nodes.has(target)) return;
    const id = `${type}:${source}->${target}`;
    edges.set(id, { id, source, target, type });
  };
  for (const dataset of datasets) {
    if (record.preprocessing) putEdge(dataset, record.preprocessing, "processed_by");
    else if (record.trainingRun) putEdge(dataset, record.trainingRun, "dataset_for_training");
  }
  if (record.preprocessing && record.trainingRun) putEdge(record.preprocessing, record.trainingRun, "preprocessing_for");
  if (record.trainingRun) putEdge(record.trainingRun, record.artifact, "trained_to_create");
  if (record.parent) putEdge(record.parent, record.artifact, "derived_from");
  for (const rel of record.relationships ?? []) {
    const type = ({ DERIVED_FROM: "derived_from", PROCESSED_BY: "processed_by", TRAINED_TO_CREATE: "trained_to_create", DATASET_FOR_TRAINING: "dataset_for_training", PREPROCESSING_FOR_TRAINING: "preprocessing_for" } as Record<ProvenanceRelationType, ProvenanceGraphEdgeType>)[rel.relationship];
    putEdge(rel.from, rel.to, type);
  }
  const edgeList = [...edges.values()];
  const legacyType: Record<ProvenanceGraphEdgeType, string> = { processed_by: "PROCESSED_BY", preprocessing_for: "PREPROCESSING_FOR_TRAINING", dataset_for_training: "DATASET_FOR_TRAINING", trained_to_create: "TRAINED_TO_CREATE", derived_from: "DERIVED_FROM" };
  return { nodes: [...nodes.values()], edges: edgeList, relationships: edgeList.map(e => ({ from: e.source, to: e.target, relationship: legacyType[e.type] })) };
}
