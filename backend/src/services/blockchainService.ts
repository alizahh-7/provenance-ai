import { Contract, JsonRpcProvider, Wallet, hexlify, toUtf8Bytes } from "ethers";
import { blockchainConfig } from "../config/env.js";
import type { ArtifactInput, OnChainArtifact } from "../models/artifact.js";

const ABI = [
  "function registerArtifact(bytes32 artifactId, bytes32 fingerprint, string artifactType, string version, string metadataUri)",
  "function getArtifact(bytes32 artifactId) view returns (bytes32 fingerprint, string artifactType, string version, uint256 registeredAt, string metadataUri, address registrant)",
  "function artifactExists(bytes32 artifactId) view returns (bool)",
  "event ArtifactRegistered(bytes32 indexed artifactId, bytes32 indexed fingerprint, address indexed registrant, string artifactType, string version, string metadataUri, uint256 timestamp)"
];
const asBytes32 = (value: string, label: string) => { if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error(`${label} must be a 32-byte hexadecimal value`); return `0x${value}`; };
const idBytes32 = (id: string) => {
  const bytes = toUtf8Bytes(id);
  if (!id || bytes.length > 32) throw Object.assign(new Error("artifactId must be a non-empty UTF-8 value no longer than 32 bytes"), { statusCode: 400 });
  return hexlify(bytes).padEnd(66, "0");
};

export interface BlockchainGateway { register(input: ArtifactInput): Promise<OnChainArtifact>; get(artifactId: string): Promise<OnChainArtifact | null>; }
export class EthersBlockchainService implements BlockchainGateway {
  private connection() { const env = blockchainConfig(); const provider = new JsonRpcProvider(env.rpcUrl); const signer = new Wallet(env.privateKey, provider); return { env, provider, signer, contract: new Contract(env.contractAddress, ABI, signer) }; }
  async register(input: ArtifactInput): Promise<OnChainArtifact> {
    const { contract, signer, env, provider } = this.connection(); const tx = await contract.registerArtifact(idBytes32(input.artifactId), asBytes32(input.fingerprint, "fingerprint"), input.artifactType, input.version, input.metadataUri); const receipt = await tx.wait(); const block = await provider.getBlock(receipt.blockNumber);
    return { ...input, registeredAt: Number(block?.timestamp ?? Math.floor(Date.now() / 1000)), registrant: await signer.getAddress(), transactionHash: receipt.hash, chainId: env.chainId, contractAddress: env.contractAddress };
  }
  async get(artifactId: string): Promise<OnChainArtifact | null> {
    const { contract, env } = this.connection(); if (!(await contract.artifactExists(idBytes32(artifactId)))) return null;
    const record = await contract.getArtifact(idBytes32(artifactId));
    return { artifactId, fingerprint: record.fingerprint.slice(2), artifactType: record.artifactType, version: record.version, registeredAt: Number(record.registeredAt), metadataUri: record.metadataUri, registrant: record.registrant, chainId: env.chainId, contractAddress: env.contractAddress };
  }
}
