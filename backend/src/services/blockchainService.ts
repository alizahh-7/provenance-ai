import { Contract, JsonRpcProvider, Wallet, hexlify, toUtf8Bytes } from "ethers";
import { blockchainConfig } from "../config/env.js";
import type { ArtifactInput, OnChainArtifact } from "../models/artifact.js";
import { BlockchainServiceError } from "../utils/errors.js";

export const ARTIFACT_PROVENANCE_ABI = [
  "function registerArtifact(bytes32 artifactId, bytes32 fingerprint, string artifactType, string version, string metadataUri)",
  "function getArtifact(bytes32 artifactId) view returns ((bytes32 fingerprint, string artifactType, string version, uint256 registeredAt, string metadataUri, address registrant))",
  "function artifactExists(bytes32 artifactId) view returns (bool)",
  "event ArtifactRegistered(bytes32 indexed artifactId, bytes32 indexed fingerprint, address indexed registrant, string artifactType, string version, string metadataUri, uint256 timestamp)"
];
const SEPOLIA_CHAIN_ID = 11155111n;
const asBytes32 = (value: string, label: string) => { if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error(`${label} must be a 32-byte hexadecimal value`); return `0x${value}`; };
export const artifactIdToBytes32 = (id: string) => {
  const bytes = toUtf8Bytes(id);
  if (!id || bytes.length > 32) throw Object.assign(new Error("artifactId must be a non-empty UTF-8 value no longer than 32 bytes"), { statusCode: 400 });
  return hexlify(bytes).padEnd(66, "0");
};

export interface BlockchainGateway { register(input: ArtifactInput): Promise<OnChainArtifact>; get(artifactId: string): Promise<OnChainArtifact | null>; }
export class EthersBlockchainService implements BlockchainGateway {
  private connection() { const env = blockchainConfig(); const provider = new JsonRpcProvider(env.rpcUrl); const signer = new Wallet(env.privateKey, provider); return { env, provider, signer, contract: new Contract(env.contractAddress, ARTIFACT_PROVENANCE_ABI, signer) }; }
  private async assertSepolia(provider: JsonRpcProvider, configuredChainId?: string) {
    try {
      if (configuredChainId && BigInt(configuredChainId) !== SEPOLIA_CHAIN_ID) throw new BlockchainServiceError("CHAIN_ID must be 11155111 for the deployed Sepolia contract", "CHAIN_ID_MISMATCH", 500);
      const network = await provider.getNetwork();
      if (network.chainId !== SEPOLIA_CHAIN_ID) throw new BlockchainServiceError("Configured RPC is not connected to Ethereum Sepolia", "RPC_NETWORK_MISMATCH");
    } catch (error) {
      if (error instanceof BlockchainServiceError) throw error;
      throw new BlockchainServiceError("Unable to connect to the configured blockchain RPC", "RPC_UNAVAILABLE");
    }
  }
  private chainError(error: unknown): BlockchainServiceError {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("already registered")) return new BlockchainServiceError("Artifact ID is already registered on the blockchain", "DUPLICATE_ARTIFACT", 409);
    if (message.includes("insufficient funds")) return new BlockchainServiceError("Deployment wallet has insufficient funds for this transaction", "INSUFFICIENT_GAS", 402);
    return new BlockchainServiceError("Blockchain transaction failed or was reverted", "TRANSACTION_FAILED");
  }
  async register(input: ArtifactInput): Promise<OnChainArtifact> {
    const { contract, signer, env, provider } = this.connection(); await this.assertSepolia(provider, env.chainId);
    try {
      const tx = await contract.registerArtifact(artifactIdToBytes32(input.artifactId), asBytes32(input.fingerprint, "fingerprint"), input.artifactType, input.version, input.metadataUri);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new BlockchainServiceError("Blockchain transaction was not confirmed successfully", "TRANSACTION_FAILED");
      const block = await provider.getBlock(receipt.blockNumber);
      return { ...input, registeredAt: Number(block?.timestamp ?? Math.floor(Date.now() / 1000)), registrant: await signer.getAddress(), transactionHash: receipt.hash, chainId: env.chainId, contractAddress: env.contractAddress };
    } catch (error) { if (error instanceof BlockchainServiceError) throw error; throw this.chainError(error); }
  }
  async get(artifactId: string): Promise<OnChainArtifact | null> {
    const { contract, env, provider } = this.connection(); await this.assertSepolia(provider, env.chainId);
    try {
      if (!(await contract.artifactExists(artifactIdToBytes32(artifactId)))) return null;
      const record = await contract.getArtifact(artifactIdToBytes32(artifactId));
      return { artifactId, fingerprint: record.fingerprint.slice(2), artifactType: record.artifactType, version: record.version, registeredAt: Number(record.registeredAt), metadataUri: record.metadataUri, registrant: record.registrant, chainId: env.chainId, contractAddress: env.contractAddress };
    } catch (error) { if (error instanceof BlockchainServiceError) throw error; throw new BlockchainServiceError("Unable to read artifact evidence from the blockchain", "CONTRACT_READ_FAILED"); }
  }
}
