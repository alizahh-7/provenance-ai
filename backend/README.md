# ProvenanceAI backend

The API hashes opaque uploaded bytes with SHA-256, registers the 32-byte digest through `ArtifactProvenance`, and later compares a newly uploaded artifact against the on-chain digest. This demonstrates integrity relative to a registered fingerprint; it does not establish who originally created an artifact.

## Setup

From the repository root, run `npm install`. Copy the root `.env.example` to `backend/.env`, then set `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`, and `CHAIN_ID` to a deployed testnet contract. `PRIVATE_KEY` is used only server-side and must never be sent to a browser.

Run `npm run dev -w backend`; the API listens on `PORT` (default 3001). Development uploads are randomized temporary files and are deleted after each request. `MAX_FILE_SIZE_BYTES` defaults to 50 MiB.

## API

`GET /api/health` returns `{ "success": true, "status": "ok" }`.

`POST /api/artifacts/register` is multipart with `artifact` (file), `artifactType`, `version`, and optional `metadataUri`. It returns the generated ID, SHA-256, transaction hash, contract/network data, and registration metadata.

`POST /api/artifacts/verify` is multipart with `artifact` and `artifactId`. It returns `PASS` only when the uploaded file's actual SHA-256 exactly equals the fingerprint read from the configured contract; otherwise it returns `FAIL`.

`GET /api/artifacts/:id` fetches the blockchain-backed record. `GET /api/provenance/:id` returns a frontend-friendly `{ nodes, relationships }` shape from the searchable metadata layer.

Example:

```bash
curl -F "artifact=@./model.bin" -F "artifactType=model" -F "version=v1" http://localhost:3001/api/artifacts/register
curl -F "artifact=@./model.bin" -F "artifactId=art_..." http://localhost:3001/api/artifacts/verify
```

## Tests and production notes

`npm run test -w backend` tests health, request validation, byte hashing, registration/retrieval, and real PASS/FAIL comparisons. The in-memory repository is intentionally only a searchable metadata/provenance convenience fallback. It is not used as integrity proof; the production service reads verification evidence from the contract.
