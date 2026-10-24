import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { resolve } from "node:path";
import type { HardhatUserConfig } from "hardhat/config";
// Hardhat may be run from either this workspace or the repository root.
dotenv.config({ path: resolve(__dirname, "../.env") });
const privateKey = process.env.PRIVATE_KEY?.trim();
const accounts = privateKey ? [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`] : [];
const config: HardhatUserConfig = { solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } }, networks: { sepolia: { url: process.env.RPC_URL || "", accounts, chainId: Number(process.env.CHAIN_ID || 11155111) } } };
export default config;
