import type { Artifact, Verification, Provenance } from '../types/artifact';
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const headers = { 'Content-Type': 'application/json' };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${base}${path}`, init); } catch { throw new Error('Could not reach the Provanance - AL API. Check that the backend is running and the API URL is correct.'); }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) { const message = typeof body === 'object' && body && 'message' in body ? String((body as {message:unknown}).message) : `Request failed (${response.status})`; throw new Error(message); }
  if (!body || typeof body !== 'object') throw new Error('The API returned an invalid response.');
  return body as T;
}
export const realApi = {
  async registerArtifact(file: File, data: {artifactType:string; version:string; metadataUri:string}) {
    const form = new FormData(); form.append('artifact', file); Object.entries(data).forEach(([k,v])=>form.append(k,v));
    const result = await request<{success?:boolean;artifact:Artifact}>('/artifacts/register',{method:'POST',body:form});
    if (!result.artifact?.artifactId) throw new Error('The API response did not include an artifact ID.'); return result.artifact;
  },
  async verifyArtifact(file:File, artifactId:string) {
    const form = new FormData(); form.append('artifact',file); form.append('artifactId',artifactId);
    const result = await request<Verification>('/artifacts/verify',{method:'POST',body:form});
    if (typeof result.verified !== 'boolean' && result.status !== 'PASS' && result.status !== 'FAIL') throw new Error('The API response did not include a verification result.'); return {...result, verified:result.verified ?? result.status==='PASS', status:result.status ?? (result.verified?'PASS':'FAIL')};
  },
  async getArtifact(id:string) { const r=await request<{artifact?:Artifact}&Artifact>(`/artifacts/${encodeURIComponent(id)}`,{headers}); const a=r.artifact ?? r; if(!a.artifactId) throw new Error('Artifact details were not found in the API response.'); return a; },
  async getProvenance(id:string) { const r=await request<{nodes?:Provenance['nodes'];relationships?:Provenance['relationships']}>(`/provenance/${encodeURIComponent(id)}`,{headers}); if(!Array.isArray(r.nodes)) throw new Error('Provenance data is unavailable or malformed.'); return {nodes:r.nodes, relationships:r.relationships ?? []}; }
};
