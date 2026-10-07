import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
const config: HardhatUserConfig = { solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } }, networks: { sepolia: { url: process.env.RPC_URL || "", accounts, chainId: Number(process.env.CHAIN_ID || 11155111) } } };
export default config;
