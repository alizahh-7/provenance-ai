import { ethers } from "hardhat";

const SEPOLIA_CHAIN_ID = 11155111n;

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) throw new Error("Configured RPC is not Ethereum Sepolia (11155111)");
  const address = process.env.CONTRACT_ADDRESS?.trim();
  if (!address || !ethers.isAddress(address)) throw new Error("CONTRACT_ADDRESS must be a valid deployed contract address");
  const code = await ethers.provider.getCode(address);
  if (code === "0x") throw new Error("No contract bytecode exists at CONTRACT_ADDRESS");

  const contract = await ethers.getContractAt("ArtifactProvenance", address);
  const exists = await contract.artifactExists(ethers.ZeroHash);
  if (exists !== false) throw new Error("Unexpected artifactExists result for the zero artifact ID");
  try {
    await contract.getArtifact(ethers.ZeroHash);
    throw new Error("getArtifact unexpectedly resolved for an unregistered artifact");
  } catch (error) {
    if (error instanceof Error && error.message.includes("unexpectedly resolved")) throw error;
  }

  console.log(`Smoke test PASS: bytecode exists and ArtifactProvenance read methods responded at ${address}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Smoke test failed"); process.exitCode = 1; });
