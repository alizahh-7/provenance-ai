import { describe, expect, it } from "vitest";
import { analyzeProvenance, createGraphFromRecord, validateProvenanceInput } from "../src/services/provenanceAnalyzer.js";

const registeredId = "art_0123456789012345678901234567";
const parse = (data: Record<string, unknown>) => validateProvenanceInput(JSON.stringify(data), registeredId, "model", String(data.version ?? "v1"))!;

describe("provenance validation and graph", () => {
  it("uses each supplied dataset ID and emits the complete source-to-model pipeline", () => {
    const first = parse({ artifactType: "model", version: "v1", dataset: "corpus-a", preprocessing: "prep-a", trainingRun: "train-a", relationships: [] });
    const second = parse({ artifactType: "model", version: "v1", dataset: "corpus-b", preprocessing: "prep-b", trainingRun: "train-b", relationships: [] });
    const firstGraph = createGraphFromRecord(first), secondGraph = createGraphFromRecord(second);
    expect(firstGraph.nodes.map(node => node.id)).toContain("corpus-a");
    expect(firstGraph.nodes.map(node => node.id)).not.toContain("corpus-b");
    expect(secondGraph.nodes.map(node => node.id)).toContain("corpus-b");
    expect(firstGraph.edges.map(edge => [edge.source, edge.target, edge.type])).toEqual([
      ["corpus-a", "prep-a", "processed_by"], ["prep-a", "train-a", "preprocessing_for"], ["train-a", registeredId, "trained_to_create"]
    ]);
    expect(firstGraph.edges.every(edge => firstGraph.nodes.some(n => n.id === edge.source) && firstGraph.nodes.some(n => n.id === edge.target))).toBe(true);
  });

  it("supports multiple datasets and deterministic complete-lineage analysis", async () => {
    const record = parse({ artifactType: "model", version: "v1", datasets: ["corpus-a", "corpus-b"], preprocessing: "prep", trainingRun: "train", relationships: [] });
    const graph = createGraphFromRecord(record);
    expect(graph.nodes.filter(node => node.type === "dataset").map(node => node.id)).toEqual(["corpus-a", "corpus-b"]);
    const a = await analyzeProvenance(record), b = await analyzeProvenance(record);
    expect(a).toEqual(b);
    expect(a.issues).toEqual([]);
    expect(a.riskLevel).toBe("NONE");
    expect(a.riskScore).toBe(0);
  });

  it("rejects malformed, oversized, deeply nested, mistyped, duplicate, and unsupported lineage input", () => {
    expect(() => validateProvenanceInput("{", registeredId, "model", "v1")).toThrow(/Malformed provenance/);
    expect(() => validateProvenanceInput(" ", registeredId, "model", "v1")).toThrow(/empty/);
    expect(() => validateProvenanceInput(JSON.stringify({ relationships: {} }), registeredId, "model", "v1")).toThrow(/array/);
    expect(() => validateProvenanceInput(JSON.stringify({ datasets: ["same", "same"] }), registeredId, "model", "v1")).toThrow(/duplicate/);
    expect(() => validateProvenanceInput(JSON.stringify({ dataset: "same", preprocessing: "same" }), registeredId, "model", "v1")).toThrow(/unique/);
    expect(() => validateProvenanceInput(JSON.stringify({ relationships: [{ from: "dataset", to: "$CURRENT_ARTIFACT", type: "MAGIC" }] }), registeredId, "model", "v1")).toThrow(/Unsupported/);
    expect(() => validateProvenanceInput(JSON.stringify({ relationships: [{ from: "dataset", to: "$CURRENT_ARTIFACT", type: "TRAINED_TO_CREATE" }] }), registeredId, "model", "v1")).toThrow(/undeclared|conflicts/);
    let nested: Record<string, unknown> = { end: true };
    for (let depth = 0; depth < 10; depth++) nested = { child: nested };
    expect(() => validateProvenanceInput(JSON.stringify(nested), registeredId, "model", "v1")).toThrow(/nesting/);
    expect(() => validateProvenanceInput("x".repeat(65_537), registeredId, "model", "v1")).toThrow(/65536/);
  });

  it("scores several independent missing lineage issues deterministically", async () => {
    const record = parse({ artifactType: "model", version: "v2", metadata: { version: "v9" } });
    const result = await analyzeProvenance(record);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["MISSING_DATASET", "MISSING_PREPROCESSING", "MISSING_TRAINING_RUN", "MISSING_PARENT", "INCONSISTENT_METADATA"]));
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe("HIGH");
    expect(result.severity).toBe("HIGH");
  });

  it("classifies unsupported version formats without extracting arbitrary integers", async () => {
    const record = parse({ artifactType: "model", version: "release-2026" });
    const result = await analyzeProvenance(record);
    expect(result.issues.some(issue => issue.code === "UNSUPPORTED_VERSION_FORMAT")).toBe(true);
    expect(result.issues.some(issue => issue.code === "UNEXPECTED_VERSION_JUMP")).toBe(false);
  });
});
