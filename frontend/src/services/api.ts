import type {
  Artifact,
  Verification,
  Provenance,
  ProvenanceEdge,
  ProvenanceInput,
} from "../types/artifact";
const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
).replace(/\/$/, "");
const headers = { "Content-Type": "application/json" };
type ApiErrorBody = { message?: unknown; error?: unknown; code?: unknown };
function apiErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const details = body as ApiErrorBody;
    const message =
      typeof details.message === "string"
        ? details.message
        : typeof details.error === "string"
        ? details.error
        : undefined;
    const code = typeof details.code === "string" ? details.code : undefined;
    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return `The API returned an error (${code}).`;
  }
  return `Request failed (${status}).`;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, init);
  } catch {
    throw new Error(
      "Could not reach the ProvenanceAI API. Check that the backend is running and the API URL is correct."
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(body, response.status));
  if (!body || typeof body !== "object")
    throw new Error("The API returned an invalid response.");
  return body as T;
}
export const realApi = {
  async registerArtifact(
    file: File,
    data: {
      artifactType: string;
      version: string;
      metadataUri: string;
      provenance?: ProvenanceInput;
    }
  ) {
    const form = new FormData();
    form.append("artifact", file);
    form.append("artifactType", data.artifactType);
    form.append("version", data.version);
    if (data.metadataUri.trim())
      form.append("metadataUri", data.metadataUri.trim());
    if (data.provenance)
      form.append("provenance", JSON.stringify(data.provenance));
    const result = await request<{
      success?: boolean;
      registrationStatus?: string;
      artifact?: Artifact;
    }>("/artifacts/register", { method: "POST", body: form });
    if (result.success === false)
      throw new Error("The API did not confirm artifact registration.");
    if (result.registrationStatus && result.registrationStatus !== "CONFIRMED")
      throw new Error(
        `Registration was not confirmed by the backend (${result.registrationStatus}).`
      );
    if (!result.artifact?.artifactId)
      throw new Error("The API response did not include an artifact ID.");
    return result.artifact;
  },
  async verifyArtifact(file: File, artifactId: string) {
    const form = new FormData();
    form.append("artifact", file);
    form.append("artifactId", artifactId);
    const result = await request<Verification>("/artifacts/verify", {
      method: "POST",
      body: form,
    });
    if (
      typeof result.verified !== "boolean" &&
      result.status !== "PASS" &&
      result.status !== "FAIL"
    )
      throw new Error(
        "The API response did not include a verification result."
      );
    if (
      result.status &&
      typeof result.verified === "boolean" &&
      (result.status === "PASS") !== result.verified
    )
      throw new Error(
        "The API returned conflicting verification status fields."
      );
    return {
      ...result,
      verified: result.verified ?? result.status === "PASS",
      status: result.status ?? (result.verified ? "PASS" : "FAIL"),
    };
  },
  async getArtifact(id: string) {
    const r = await request<{ artifact?: Artifact } & Artifact>(
      `/artifacts/${encodeURIComponent(id)}`,
      { headers }
    );
    const a = r.artifact ?? r;
    if (!a.artifactId)
      throw new Error("Artifact details were not found in the API response.");
    return a;
  },
  async getProvenance(id: string) {
    const r = await request<{
      nodes?: Provenance["nodes"];
      edges?: ProvenanceEdge[];
      relationships?: Provenance["relationships"];
      analysis?: Provenance["analysis"];
      graph?: Pick<Provenance, "nodes" | "edges" | "relationships">;
    }>(`/provenance/${encodeURIComponent(id)}`, { headers });
    const nodes = r.nodes ?? r.graph?.nodes;
    if (!Array.isArray(nodes))
      throw new Error("Provenance data is unavailable or malformed.");
    const edges = r.edges ?? r.graph?.edges ?? [];
    const relationships =
      r.relationships ??
      r.graph?.relationships ??
      edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        relationship: edge.type,
      }));
    return { nodes, edges, relationships, analysis: r.analysis };
  },
  async getRecentArtifacts() {
    const r = await request<{ artifacts?: Artifact[] }>("/artifacts?limit=5", {
      headers,
    });
    return Array.isArray(r.artifacts) ? r.artifacts : [];
  },
};
