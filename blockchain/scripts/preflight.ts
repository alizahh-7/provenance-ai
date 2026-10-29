import { ethers } from "hardhat";

const SEPOLIA_CHAIN_ID = 11155111n;
const normalizePrivateKey = (value?: string) => {
  if (!value?.trim()) throw new Error("PRIVATE_KEY is required for deployment preflight");
  const key = value.trim();
  return key.startsWith("0x") ? key : `0x${key}`;
};

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) throw new Error("Configured RPC is not Ethereum Sepolia (11155111)");

  const wallet = new ethers.Wallet(normalizePrivateKey(process.env.PRIVATE_KEY), ethers.provider);
  const address = await wallet.getAddress();
  const balance = await ethers.provider.getBalance(address);
  const factory = await ethers.getContractFactory("ArtifactProvenance", wallet);
  const deployment = await factory.getDeployTransaction();
  const gasEstimate = await ethers.provider.estimateGas({ from: address, data: deployment.data });
  const fees = await ethers.provider.getFeeData();
  const feePerGas = fees.maxFeePerGas ?? fees.gasPrice;
  if (feePerGas === null) throw new Error("Unable to determine network fee data");
  const estimatedCost = gasEstimate * feePerGas;

  console.log("Network name: sepolia");
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployment wallet: ${address}`);
  console.log(`Sepolia balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Estimated deployment gas: ${gasEstimate}`);
  console.log(`Estimated maximum deployment cost: ${ethers.formatEther(estimatedCost)} ETH`);
  console.log(`Estimated balance sufficient: ${balance >= estimatedCost ? "YES" : "NO"}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Deployment preflight failed"); process.exitCode = 1; });
