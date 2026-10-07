# ProvenanceAI smart contract

`ArtifactProvenance` stores only a compact `bytes32` SHA-256 fingerprint and essential metadata. Artifact bytes never reach the contract. Each artifact ID can be registered once, so records are immutable evidence; a revised artifact should be assigned a new ID/version and linked by provenance metadata.

## Setup and deployment

Copy the root `.env.example` to `blockchain/.env`, set a public testnet RPC and a funded deployer `PRIVATE_KEY`, then run:

```bash
npm install
npm run compile -w blockchain
npm run test -w blockchain
npm run deploy -w blockchain
```

The deploy script targets Sepolia by default. Put the printed contract address in `backend/.env` as `CONTRACT_ADDRESS`, and use the same RPC/chain ID. Contract tests run against Hardhat's local in-process network and cover registration, retrieval, event emission, duplicate rejection, and invalid/not-found behavior.
