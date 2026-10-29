import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { ArtifactService } from "../src/services/artifactService.js";
import { InMemoryMetadataRepository } from "../src/services/metadataRepository.js";
import type { ArtifactInput, OnChainArtifact } from "../src/models/artifact.js";
import type { BlockchainGateway } from "../src/services/blockchainService.js";
import { BlockchainServiceError } from "../src/utils/errors.js";

class TestChain implements BlockchainGateway { private items = new Map<string, OnChainArtifact>(); async register(input: ArtifactInput) { const output = { ...input, registeredAt: 1, registrant: "0x0000000000000000000000000000000000000001", transactionHash: "0xtest", chainId: "31337" }; if (this.items.has(input.artifactId)) throw new Error("duplicate"); this.items.set(input.artifactId, output); return output; } async get(id: string) { return this.items.get(id) || null; } }
const app = createApp(new ArtifactService(new TestChain(), new InMemoryMetadataRepository()));

describe("artifact API", () => {
  it("returns health", async () => { expect((await request(app).get("/api/health")).body).toEqual({ success: true, status: "ok" }); });
  it("validates a registration request", async () => { const res = await request(app).post("/api/artifacts/register").attach("artifact", Buffer.from("x"), "model.bin"); expect(res.status).toBe(400); expect(res.body.error).toContain("artifactType"); });
  it("registers, retrieves, and verifies a real file hash as PASS then FAIL", async () => {
    const registered = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").field("metadataUri", "ipfs://metadata").attach("artifact", Buffer.from("original bytes"), "model.bin");
    expect(registered.status).toBe(201); expect(registered.body.registrationStatus).toBe("CONFIRMED"); expect(registered.body.artifact.fingerprint).toMatch(/^[a-f0-9]{64}$/); expect(registered.body.artifact.transactionHash).toBe("0xtest"); const id = registered.body.artifact.artifactId;
    expect((await request(app).get(`/api/artifacts/${id}`)).body.artifact.fingerprint).toBe(registered.body.artifact.fingerprint);
    const pass = await request(app).post("/api/artifacts/verify").field("artifactId", id).attach("artifact", Buffer.from("original bytes"), "copy.bin"); expect(pass.body.status).toBe("PASS"); expect(pass.body.verified).toBe(true);
    const fail = await request(app).post("/api/artifacts/verify").field("artifactId", id).attach("artifact", Buffer.from("altered bytes"), "copy.bin"); expect(fail.body.status).toBe("FAIL"); expect(fail.body.verified).toBe(false);
  });
  it("rejects verification with a missing artifact file", async () => { expect((await request(app).post("/api/artifacts/verify").field("artifactId", "anything")).status).toBe(400); });
  it("rejects an invalid artifact identifier cleanly", async () => { const res = await request(app).post("/api/artifacts/verify").field("artifactId", "x".repeat(33)).attach("artifact", Buffer.from("bytes"), "artifact.bin"); expect(res.status).toBe(400); });
  it("rejects malformed registration metadata", async () => {
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").field("metadataUri", "file:///local-secret").attach("artifact", Buffer.from("bytes"), "model.bin");
    expect(res.status).toBe(400); expect(res.body.code).toBe("INVALID_METADATA_URI");
  });
  it("rejects malformed provenance JSON on registration", async () => {
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v2").field("provenance", "{not valid json").attach("artifact", Buffer.from("artifact bytes"), "artifact.bin");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("provenance");
  });
  it("rejects provenance whose declared version differs from the registration version before chain registration", async () => {
    const res = await request(app).post("/api/artifacts/register")
      .field("artifactType", "model").field("version", "v1")
      .field("provenance", JSON.stringify({ artifactType: "model", version: "v1.0.0", dataset: "fixture-dataset", preprocessing: "fixture-prep", trainingRun: "fixture-training" }))
      .attach("artifact", Buffer.from("version mismatch"), "model.bin");
    expect(res.status).toBe(400); expect(res.body.error).toContain("version must match");
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
  it("returns each artifact's submitted dataset and reports missing provenance without inventing lineage", async () => {
    const register = (dataset: string) => request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").field("provenance", JSON.stringify({ artifactType: "model", version: "v1", dataset, preprocessing: `prep-${dataset}`, trainingRun: `train-${dataset}` })).attach("artifact", Buffer.from(`artifact ${dataset}`), "model.bin");
    const [a, b] = await Promise.all([register("actual-dataset-a"), register("actual-dataset-b")]);
    const [graphA, graphB] = await Promise.all([request(app).get(`/api/provenance/${a.body.artifact.artifactId}`), request(app).get(`/api/provenance/${b.body.artifact.artifactId}`)]);
    expect(graphA.body.nodes.some((node: { id: string }) => node.id === "actual-dataset-a")).toBe(true);
    expect(graphA.body.nodes.some((node: { id: string }) => node.id === "actual-dataset-b")).toBe(false);
    expect(graphB.body.nodes.some((node: { id: string }) => node.id === "actual-dataset-b")).toBe(true);
    const noProvenance = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").attach("artifact", Buffer.from("no provenance"), "model.bin");
    const missingGraph = await request(app).get(`/api/provenance/${noProvenance.body.artifact.artifactId}`);
    expect(missingGraph.body.analysis.issues[0].code).toBe("MISSING_PROVENANCE");
    expect(missingGraph.body.nodes).toHaveLength(1);
  });
  it("returns not found for an unknown artifact provenance request", async () => {
    const response = await request(app).get("/api/provenance/art_unknown");
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ARTIFACT_NOT_FOUND");
  });
  it("rejects malformed artifact identifiers on the provenance endpoint", async () => {
    const response = await request(app).get("/api/provenance/bad%20id");
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_ARTIFACT_ID");
  });
});

describe("blockchain failure handling", () => {
  const artifact = Buffer.from("artifact content");
  const appWith = (chain: BlockchainGateway) => createApp(new ArtifactService(chain, new InMemoryMetadataRepository()));
  const errorChain = (registerError?: Error, readError?: Error): BlockchainGateway => ({
    register: async () => { throw registerError ?? new Error("unexpected"); },
    get: async () => { if (readError) throw readError; return null; }
  });

  it("does not report success when blockchain registration fails", async () => {
    const app = appWith(errorChain(new BlockchainServiceError("Blockchain transaction failed or was reverted", "TRANSACTION_FAILED")));
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(502); expect(res.body).toMatchObject({ success: false, code: "TRANSACTION_FAILED" });
  });
  it("reports duplicate blockchain registration distinctly", async () => {
    const app = appWith(errorChain(new BlockchainServiceError("Artifact ID is already registered on the blockchain", "DUPLICATE_ARTIFACT", 409)));
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(409); expect(res.body.code).toBe("DUPLICATE_ARTIFACT");
  });
  it("does not turn an unavailable RPC into a verification FAIL", async () => {
    const app = appWith(errorChain(undefined, new BlockchainServiceError("Unable to connect to the configured blockchain RPC", "RPC_UNAVAILABLE")));
    const res = await request(app).post("/api/artifacts/verify").field("artifactId", "art_rpc_failure").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(502); expect(res.body.code).toBe("RPC_UNAVAILABLE"); expect(res.body.status).toBeUndefined();
  });
  it("distinguishes an unknown artifact from a hash mismatch", async () => {
    const app = appWith(errorChain());
    const res = await request(app).post("/api/artifacts/verify").field("artifactId", "art_unknown").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(404); expect(res.body.code).toBe("ARTIFACT_NOT_FOUND");
  });
  it("reports a contract read failure without a PASS or FAIL", async () => {
    const app = appWith(errorChain(undefined, new BlockchainServiceError("Unable to read artifact evidence from the blockchain", "CONTRACT_READ_FAILED")));
    const res = await request(app).post("/api/artifacts/verify").field("artifactId", "art_read_failure").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(502); expect(res.body.code).toBe("CONTRACT_READ_FAILED"); expect(res.body.status).toBeUndefined();
  });
  it("reports recovery guidance when confirmed blockchain registration cannot persist metadata", async () => {
    const repository = new InMemoryMetadataRepository();
    repository.save = async () => { throw new Error("Firestore unavailable"); };
    const appWithStorageFailure = createApp(new ArtifactService(new TestChain(), repository));
    const res = await request(appWithStorageFailure).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").attach("artifact", artifact, "model.bin");
    expect(res.status).toBe(502); expect(res.body.code).toBe("METADATA_PERSISTENCE_FAILED"); expect(res.body.error).toContain("Do not retry registration");
  });
  it("does not present in-memory records as durable recent activity", async () => {
    const res = await request(app).get("/api/artifacts");
    expect(res.status).toBe(503); expect(res.body.code).toBe("PERSISTENCE_UNAVAILABLE");
  });
  it("enforces the configured multipart file-size limit", async () => {
    const res = await request(app).post("/api/artifacts/register").field("artifactType", "model").field("version", "v1").attach("artifact", Buffer.alloc(50 * 1024 * 1024 + 1), "large.bin");
    expect(res.status).toBe(413); expect(res.body.code).toBe("FILE_TOO_LARGE");
  });
});

describe("Sepolia registration regression", () => {
  const registeredId = "art_568d226bdb21417583675c3ce967";
  const registeredHash = "157b67ceb644670988f1ac98eeba746366253976b303bf4e8c8c9cf7069c1e51";
  const registeredArtifact: OnChainArtifact = { artifactId: registeredId, fingerprint: registeredHash, artifactType: "model", version: "v1", metadataUri: "ipfs://provenanceai/demo-v1", registeredAt: 1_735_000_000, registrant: "0x0000000000000000000000000000000000000001", transactionHash: "0x6163668ea550e57666a6bddfb73689067be064a4f4b2d133e4340e097694c499", chainId: "11155111", contractAddress: "0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431" };
  const chain: BlockchainGateway = { register: async () => { throw new Error("not used by verification"); }, get: async (id) => id === registeredId ? registeredArtifact : null };
  const app = createApp(new ArtifactService(chain, new InMemoryMetadataRepository()));

  it("verifies the exact successful Sepolia registration as PASS and a changed copy as FAIL", async () => {
    const original = await request(app).post("/api/artifacts/verify").field("artifactId", registeredId).attach("artifact", Buffer.from("ProvenanceAI Sepolia demo artifact"), "demo-original.txt");
    expect(original.body).toMatchObject({ verified: true, status: "PASS", uploadedHash: registeredHash, registeredHash, contractAddress: registeredArtifact.contractAddress, chainId: "11155111" });
    const changed = await request(app).post("/api/artifacts/verify").field("artifactId", registeredId).attach("artifact", Buffer.from("ProvenanceAI Sepolia demo artifact modified"), "demo-tampered.txt");
    expect(changed.body).toMatchObject({ verified: false, status: "FAIL", registeredHash });
  });
});
