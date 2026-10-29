import { describe, expect, it } from "vitest";
import { Interface } from "ethers";
import { ARTIFACT_PROVENANCE_ABI, artifactIdToBytes32 } from "../src/services/blockchainService.js";

describe("ArtifactProvenance ABI compatibility", () => {
  const artifactId = "art_568d226bdb21417583675c3ce967";
  const fingerprint = "0x157b67ceb644670988f1ac98eeba746366253976b303bf4e8c8c9cf7069c1e51";

  it("preserves the exact 32-byte public identifier registered on Sepolia", () => {
    expect(artifactId.length).toBe(32);
    expect(artifactIdToBytes32(artifactId)).toBe("0x6172745f35363864323236626462323134313735383336373563336365393637");
  });

  it("decodes getArtifact as the Solidity Artifact tuple used by the deployed contract", () => {
    const iface = new Interface(ARTIFACT_PROVENANCE_ABI);
    const encoded = iface.encodeFunctionResult("getArtifact", [[fingerprint, "model", "v1", 1_735_000_000n, "ipfs://provenanceai/demo-v1", "0x0000000000000000000000000000000000000001"]]);
    const [record] = iface.decodeFunctionResult("getArtifact", encoded);
    expect(record.fingerprint).toBe(fingerprint);
    expect(record.artifactType).toBe("model");
    expect(record.version).toBe("v1");
    expect(record.registeredAt).toBe(1_735_000_000n);
    expect(record.metadataUri).toBe("ipfs://provenanceai/demo-v1");
  });
});
