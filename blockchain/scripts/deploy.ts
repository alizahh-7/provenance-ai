import { ethers } from "hardhat";
const SEPOLIA_CHAIN_ID = 11155111n;

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) throw new Error("Refusing deployment: configured RPC is not Ethereum Sepolia (11155111)");

  const Factory = await ethers.getContractFactory("ArtifactProvenance");
  const contract = await Factory.deploy();
  const transaction = contract.deploymentTransaction();
  if (!transaction) throw new Error("Deployment transaction was not created");
  await contract.waitForDeployment();

  console.log(`Network name: sepolia`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Contract address: ${await contract.getAddress()}`);
  console.log(`Deployment transaction hash: ${transaction.hash}`);
  console.log(`Sepolia Etherscan: https://sepolia.etherscan.io/tx/${transaction.hash}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
