import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
describe("ArtifactProvenance", () => {
  const id = ethers.encodeBytes32String("artifact-001"); const fingerprint = `0x${"ab".repeat(32)}`;
  async function deployed() { return (await ethers.getContractFactory("ArtifactProvenance")).deploy(); }
  it("registers, retrieves, and emits immutable proof", async () => { const contract = await deployed(); const [owner] = await ethers.getSigners(); await expect(contract.registerArtifact(id, fingerprint, "dataset", "v1", "ipfs://metadata")).to.emit(contract, "ArtifactRegistered").withArgs(id, fingerprint, owner.address, "dataset", "v1", "ipfs://metadata", anyValue); const record = await contract.getArtifact(id); expect(record.fingerprint).to.equal(fingerprint); expect(record.artifactType).to.equal("dataset"); expect(record.version).to.equal("v1"); expect(record.registrant).to.equal(owner.address); expect(await contract.artifactExists(id)).to.equal(true); });
  it("rejects duplicate and invalid records", async () => { const contract = await deployed(); await contract.registerArtifact(id, fingerprint, "model", "v1", ""); await expect(contract.registerArtifact(id, fingerprint, "model", "v2", "")).to.be.revertedWith("artifact already registered"); await expect(contract.registerArtifact(ethers.ZeroHash, fingerprint, "model", "v1", "")).to.be.revertedWith("artifact ID required"); await expect(contract.getArtifact(ethers.encodeBytes32String("missing"))).to.be.revertedWith("artifact not found"); });
});
