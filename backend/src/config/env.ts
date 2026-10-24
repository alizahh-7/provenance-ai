import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Always use the one private configuration file at the repository root.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

export const config = {
  port: Number(process.env.PORT || 3001),
  uploadsDir: process.env.UPLOADS_DIR || "uploads",
  maxFileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024),
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  contractAddress: process.env.CONTRACT_ADDRESS,
  chainId: process.env.CHAIN_ID
};

export function blockchainConfig(): { rpcUrl: string; privateKey: string; contractAddress: string; chainId?: string } {
  for (const key of ["rpcUrl", "privateKey", "contractAddress"] as const) if (!config[key]) throw new Error(`Missing required blockchain environment variable: ${key === "rpcUrl" ? "RPC_URL" : key === "privateKey" ? "PRIVATE_KEY" : "CONTRACT_ADDRESS"}`);
  const privateKey = config.privateKey!.trim();
  return { rpcUrl: config.rpcUrl!.trim(), privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`, contractAddress: config.contractAddress!.trim(), chainId: config.chainId };
}
