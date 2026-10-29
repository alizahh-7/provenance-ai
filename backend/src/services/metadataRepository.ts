import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { OnChainArtifact, ProvenanceRecord } from "../models/artifact.js";
import { createGraphFromRecord } from "./provenanceAnalyzer.js";

export type MetadataGraph = ReturnType<typeof createGraphFromRecord>;
export interface MetadataRepository {
  readonly isPersistent: boolean;
  save(artifact: OnChainArtifact): Promise<void>; saveProvenance(record: ProvenanceRecord): Promise<void>;
  artifactIds(): Promise<string[]>; hasArtifact(id: string): Promise<boolean>;
  get(id: string): Promise<OnChainArtifact | null>; getProvenance(id: string): Promise<ProvenanceRecord | null>;
  graph(id: string, knownArtifact?: OnChainArtifact | null): Promise<MetadataGraph>; recent(limit: number): Promise<OnChainArtifact[]>;
}
async function buildGraph(id: string, artifact: OnChainArtifact | null, record: ProvenanceRecord | null, known?: OnChainArtifact | null): Promise<MetadataGraph> {
  if (!artifact && !record) return { nodes: [], edges: [], relationships: [] };
  if (record) return createGraphFromRecord(record);
  const found = artifact ?? known;
  return { nodes: [{ id, type: found?.artifactType.toLowerCase().includes("model") ? "model" : "artifact", label: found?.artifactType ?? id, metadata: {}, version: found?.version }], edges: [], relationships: [] };
}
export class InMemoryMetadataRepository implements MetadataRepository {
  readonly isPersistent = false; private artifacts = new Map<string, OnChainArtifact>(); private provenance = new Map<string, ProvenanceRecord>();
  async save(artifact: OnChainArtifact) { this.artifacts.set(artifact.artifactId, artifact); }
  async saveProvenance(record: ProvenanceRecord) { this.provenance.set(record.artifact, record); }
  async artifactIds() { return [...this.artifacts.keys()]; } async hasArtifact(id: string) { return this.artifacts.has(id); }
  async get(id: string) { return this.artifacts.get(id) ?? null; } async getProvenance(id: string) { return this.provenance.get(id) ?? null; }
  async recent(limit: number) { return [...this.artifacts.values()].sort((a, b) => b.registeredAt - a.registeredAt).slice(0, limit); }
  async graph(id: string, known?: OnChainArtifact | null) { return buildGraph(id, await this.get(id), await this.getProvenance(id), known); }
}
export class FirestoreMetadataRepository implements MetadataRepository {
  readonly isPersistent = true; private readonly db = getFirestore(); private readonly artifacts = this.db.collection("artifacts"); private readonly provenance = this.db.collection("provenance");
  async save(artifact: OnChainArtifact) { await this.artifacts.doc(artifact.artifactId).set(artifact); }
  async saveProvenance(record: ProvenanceRecord) { await this.provenance.doc(record.artifact).set(record); }
  async artifactIds() { return (await this.artifacts.select().get()).docs.map(doc => doc.id); } async hasArtifact(id: string) { return (await this.artifacts.doc(id).get()).exists; }
  async get(id: string) { const doc = await this.artifacts.doc(id).get(); return doc.exists ? doc.data() as OnChainArtifact : null; }
  async getProvenance(id: string) { const doc = await this.provenance.doc(id).get(); return doc.exists ? doc.data() as ProvenanceRecord : null; }
  async recent(limit: number) { return (await this.artifacts.orderBy("registeredAt", "desc").limit(limit).get()).docs.map(doc => doc.data() as OnChainArtifact); }
  async graph(id: string, known?: OnChainArtifact | null) { return buildGraph(id, await this.get(id), await this.getProvenance(id), known); }
}
function initializeFirebaseAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID, clientEmail = process.env.FIREBASE_CLIENT_EMAIL, privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) { initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }); return; }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || projectId) { initializeApp({ credential: applicationDefault(), projectId }); return; }
  throw new Error("Firestore persistence requires FIREBASE_PROJECT_ID with either FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.");
}
export function createMetadataRepository(storage = process.env.METADATA_STORAGE ?? "memory"): MetadataRepository {
  if (storage === "memory") return new InMemoryMetadataRepository();
  if (storage !== "firestore") throw new Error("METADATA_STORAGE must be either 'memory' or 'firestore'.");
  initializeFirebaseAdmin(); return new FirestoreMetadataRepository();
}
