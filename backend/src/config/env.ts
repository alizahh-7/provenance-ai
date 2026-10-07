import "dotenv/config";

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
  return { rpcUrl: config.rpcUrl!, privateKey: config.privateKey!, contractAddress: config.contractAddress!, chainId: config.chainId };
}
