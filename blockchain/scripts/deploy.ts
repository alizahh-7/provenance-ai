import { ethers } from "hardhat";
async function main() { const Factory = await ethers.getContractFactory("ArtifactProvenance"); const contract = await Factory.deploy(); await contract.waitForDeployment(); console.log(`ArtifactProvenance deployed to ${await contract.getAddress()}`); }
main().catch(error => { console.error(error); process.exitCode = 1; });
