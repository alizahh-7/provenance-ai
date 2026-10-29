import type { ProvenanceInput } from "../types/artifact";

export function validateRegistrationProvenance(
  raw: string,
  artifactType: string,
  version: string,
  metadataUri: string
): ProvenanceInput | undefined {
  const uri = metadataUri.trim();
  if (uri && !/^(https?:\/\/|ipfs:\/\/)/i.test(uri))
    throw new Error(
      "Metadata URI must begin with https://, http://, or ipfs://."
    );
  if (!raw.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Provenance must be valid JSON before registration.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Provenance must be a JSON object.");
  const provenance = parsed as ProvenanceInput;
  if (provenance.version !== undefined && provenance.version !== version.trim())
    throw new Error(
      `Provenance version "${
        provenance.version
      }" must match registration version "${version.trim()}". Use v1.0.0 for the complete-lineage fixture.`
    );
  if (
    provenance.artifactType !== undefined &&
    provenance.artifactType !== artifactType.trim()
  )
    throw new Error(
      `Provenance artifact type "${
        provenance.artifactType
      }" must match registration type "${artifactType.trim()}".`
    );
  return provenance;
}
