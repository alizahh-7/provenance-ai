import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { ArtifactService } from "../src/services/artifactService.js";
import { MetadataRepository } from "../src/services/metadataRepository.js";
import type { ArtifactInput, OnChainArtifact } from "../src/models/artifact.js";
import type { BlockchainGateway } from "../src/services/blockchainService.js";

class TestChain implements BlockchainGateway { private items = new Map<string, OnChainArtifact>(); async register(input: ArtifactInput) { const output = { ...input, registeredAt: 1, registrant: "0x0000000000000000000000000000000000000001", transactionHash: "0xtest", chainId: "31337" }; if (this.items.has(input.artifactId)) throw new Error("duplicate"); this.items.set(input.artifactId, output); return output; } async get(id: string) { return this.items.get(id) || null; } }
const app = createApp(new ArtifactService(new TestChain(), new MetadataRepository()));

describe("artifact API", () => {
  it("returns health", async () => { expect((await request(app).get("/api/health")).body).toEqual({ success: true, status: "ok" }); });
  it("validates a registration request", async () => { const res = await request(app).post("/api/artifacts/register").attach("artifact", Buffer.from("x"), "model.bin"); expect(res.status).toBe(400); expect(res.body.error).toContain("artifactType"); });
  it("registers, retrieves, and verifies a real file hash as PASS then FAIL", async () => {
    const registered = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").field("metadataUri", "ipfs://metadata").attach("artifact", Buffer.from("original bytes"), "model.bin");
    expect(registered.status).toBe(201); expect(registered.body.artifact.fingerprint).toMatch(/^[a-f0-9]{64}$/); const id = registered.body.artifact.artifactId;
    expect((await request(app).get(`/api/artifacts/${id}`)).body.artifact.fingerprint).toBe(registered.body.artifact.fingerprint);
    const pass = await request(app).post("/api/artifacts/verify").field("artifactId", id).attach("artifact", Buffer.from("original bytes"), "copy.bin"); expect(pass.body.status).toBe("PASS"); expect(pass.body.verified).toBe(true);
    const fail = await request(app).post("/api/artifacts/verify").field("artifactId", id).attach("artifact", Buffer.from("altered bytes"), "copy.bin"); expect(fail.body.status).toBe("FAIL"); expect(fail.body.verified).toBe(false);
  });
  it("rejects verification with a missing artifact file", async () => { expect((await request(app).post("/api/artifacts/verify").field("artifactId", "anything")).status).toBe(400); });
  it("rejects an invalid artifact identifier cleanly", async () => { const res = await request(app).post("/api/artifacts/verify").field("artifactId", "x".repeat(33)).attach("artifact", Buffer.from("bytes"), "artifact.bin"); expect(res.status).toBe(400); });
  it("rejects malformed provenance JSON on registration", async () => {
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v2").field("provenance", "{not valid json").attach("artifact", Buffer.from("artifact bytes"), "artifact.bin");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("provenance");
  });
  it("stores provenance and returns a deterministic analysis", async () => {
    const provenance = {
      artifactType: "model",
      version: "v1",
      dataset: "dataset-v1",
      trainingRun: "training-run-42",
      metadata: { version: "v1" },
      relationships: [
        { from: "dataset-v1", to: "training-run-42", type: "DATASET_FOR_TRAINING" },
        { from: "training-run-42", to: "$CURRENT_ARTIFACT", type: "TRAINED_TO_CREATE" }
      ]
    };
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").field("metadataUri", "ipfs://metadata").field("provenance", JSON.stringify(provenance)).attach("artifact", Buffer.from("artifact bytes"), "model.bin");
    expect(res.status).toBe(201);
    const id = res.body.artifact.artifactId;
    const graph = await request(app).get(`/api/provenance/${id}`);
    expect(graph.status).toBe(200);
    expect(graph.body.success).toBe(true);
    expect(graph.body.analysis).toBeDefined();
    expect(graph.body.analysis.issues.some((issue: { code: string }) => issue.code === "MISSING_PARENT")).toBe(false);
  });
  it("flags a missing dataset as a provenance issue", async () => {
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v2").field("metadataUri", "ipfs://metadata").field("provenance", JSON.stringify({
      artifactType: "model",
      version: "v2",
      trainingRun: "training-run-42",
      metadata: { version: "v2" },
      relationships: [
        { from: "training-run-42", to: "$CURRENT_ARTIFACT", type: "TRAINED_TO_CREATE" }
      ]
    })).attach("artifact", Buffer.from("artifact bytes"), "model.bin");
    expect(res.status).toBe(201);
    const graph = await request(app).get(`/api/provenance/${res.body.artifact.artifactId}`);
    expect(graph.status).toBe(200);
    expect(graph.body.analysis.issues.some((issue: { code: string }) => issue.code === "MISSING_DATASET")).toBe(true);
  });
});
