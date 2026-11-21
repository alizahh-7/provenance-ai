# ProvenanceAI

### Proof Beyond Trust. A Verifiable Chain of Trust for AI.

**TechnoDivas · HACKSPHERE 2026 — COMPSPHERE 12 · International Team Category**

ProvenanceAI is a Web3-powered AI artifact provenance and integrity verification platform. It combines SHA-256 fingerprints, blockchain-backed registration, structured artifact lineage, and deterministic consistency analysis to make registered AI artifacts independently checkable.

**Register. Trace. Verify. Analyze.**

> A fingerprint match proves that a submitted file matches the fingerprint registered for it. It does not, by itself, prove that every descriptive claim in the associated provenance metadata is factually true.

---

## The problem

AI development involves datasets, preprocessing steps, training runs, and multiple model versions. When a team claims that a model came from a particular dataset or that a file has not changed, an independent reviewer needs evidence that does not rely only on the team's private records.

Traditional experiment tracking is valuable, but its records are often controlled by the same organization making the claim. ProvenanceAI adds a public, independently inspectable integrity anchor: a cryptographic fingerprint registered through a smart contract.

## The solution

A user registers a dataset, model, or other supported artifact. The backend calculates its SHA-256 fingerprint and submits registration evidence to a Solidity smart contract deployed on Ethereum Sepolia. Later, a verifier can upload a file and compare its newly calculated fingerprint with the registered evidence.

The platform also stores structured provenance metadata off-chain, visualizes lineage, and evaluates configured consistency rules to surface explainable risk signals.

## Core capabilities

### 1. Blockchain-backed artifact registration
- Upload a supported artifact and select its type and version.
- Calculate a SHA-256 fingerprint on the backend.
- Associate optional metadata and structured provenance.
- Submit registration evidence to the deployed smart contract.
- Return an artifact ID and transaction details.

Original artifact files are not stored on-chain.

### 2. Independent file integrity verification
- Supply an artifact ID and a file to verify.
- Recalculate the file's SHA-256 fingerprint.
- Compare it with the registered fingerprint.
- Return a clear **VERIFIED** or **NOT VERIFIED** outcome.

Even a small file modification changes its cryptographic fingerprint.

### 3. Visual provenance explorer
Explore the submitted development lineage as a graph:

```text
Dataset → Preprocessing → Training → Model
```

The demo fixture contains four nodes and three connections. Users can inspect the graph and the metadata returned by the provenance API. The graph reflects submitted records; it does not invent missing lineage details.

### 4. Deterministic integrity analysis
The current MVP evaluates structured provenance metadata using backend consistency rules. It can report configured inconsistencies, missing-lineage indicators, risk levels, numerical scores, and plain-language findings.

For the complete, internally consistent demo fixture, the expected result is:
- Risk level: `NONE`
- Risk score: `0`
- Recorded nodes: `4`
- Recorded connections: `3`

**Important:** this is deterministic, rule-based analysis—not an LLM-based assessment. A score of zero means that no configured consistency rule was violated; it is not a guarantee that every provenance claim is true.

### 5. Artifact registry and evidence viewer
Look up an artifact by its unique ID and inspect available details, including artifact type, version, SHA-256 fingerprint, registration time, registrant address, metadata URI, network/contract information, and associated provenance records.

### 6. Application workflows
The frontend includes:
- Overview
- Register
- Verify
- Artifacts
- Provenance
- AI Analysis

---

## How it works

### Registration

```text
User uploads artifact
        ↓
Backend validates input and calculates SHA-256
        ↓
Registration evidence submitted to Sepolia smart contract
        ↓
Transaction details and artifact ID returned
        ↓
Off-chain metadata and provenance made available to the app
```

### Verification

```text
User supplies artifact ID + file
        ↓
Backend calculates submitted file's SHA-256
        ↓
Registered fingerprint is retrieved
        ↓
Fingerprints compared
        ↓
MATCH → VERIFIED     MISMATCH → NOT VERIFIED
```

### Provenance analysis

```text
Artifact provenance metadata
        ↓
Lineage graph constructed
        ↓
Configured consistency rules evaluated
        ↓
Risk level, score, and findings returned
```

---

## System architecture

```text
┌────────────────────────────────────────────┐
│             React + TypeScript             │
│  Overview · Register · Verify · Provenance  │
└──────────────────────┬─────────────────────┘
                       │ REST API (/api)
                       ▼
┌────────────────────────────────────────────┐
│          Node.js + Express + TypeScript     │
│ Uploads · Validation · SHA-256 · Web3       │
│ Registration · Verification · Analysis     │
└──────────────────┬─────────────────┬───────┘
                   │                 │
                   ▼                 ▼
┌────────────────────────┐  ┌──────────────────────┐
│ Off-chain metadata     │  │ Ethereum Sepolia     │
│ In-memory / Firestore  │  │ Solidity smart       │
│ Artifact + lineage     │  │ contract and evidence│
└────────────────────────┘  └──────────────────────┘
```

### Evidence and storage model

| Information | Where it is handled |
|---|---|
| Original uploaded artifact | Processed off-chain; not stored on-chain |
| Cryptographic registration evidence | Solidity smart contract on Sepolia |
| Artifact metadata | Backend metadata repository |
| Structured provenance | Backend metadata repository |
| Transaction evidence | Ethereum Sepolia |

The blockchain is the integrity anchor. The backend repository holds the richer application metadata needed for artifact details and lineage views.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Smart contract | Solidity |
| Blockchain network | Ethereum Sepolia |
| Hashing | SHA-256 |
| Web3 integration | Backend-managed contract interaction |
| Metadata | Repository abstraction; in-memory or optional Firebase Firestore |
| Integrity analysis | Deterministic, rule-based provenance analyzer |
| Backend tests | Vitest |
| Contract tests | Hardhat |
| Version control | Git, GitHub |

---

## Smart contract deployment

The current contract is deployed to the **Ethereum Sepolia testnet**.

| Parameter | Value |
|---|---|
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract | `0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431` |
| Environment | Testnet |

- [View the contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431)
- [View the recorded demo registration transaction](https://sepolia.etherscan.io/tx/0xf86262eff7243f35128f6c706341181c8e56bd6739685fb74bea5a844cbea17d)

The application uses a backend-managed wallet for contract interactions. A user's browser should never receive the backend private key.

---

## Recorded live integration demo

The repository documents an artifact registered through the application's live registration interface during integration testing.

| Field | Recorded value |
|---|---|
| Artifact ID | `art_e4e1b63ff7674f988260822cf3f5` |
| File | `qa-model-v1.txt` |
| Type / version | `model` / `v1.0.0` |
| Network | Sepolia |
| Chain ID | `11155111` |
| SHA-256 | `508edddc75104a57bf480d481e0b2775a2be3d87d40a62358c356ee5516a3d6c` |
| Transaction | [Open on Etherscan](https://sepolia.etherscan.io/tx/0xf86262eff7243f35128f6c706341181c8e56bd6739685fb74bea5a844cbea17d) |

### Observed integration checks

| Check | Recorded result |
|---|---|
| Registration API response and artifact ID generation | PASS |
| Fingerprint generation | PASS |
| Artifact detail lookup | PASS |
| Original-file verification | VERIFIED |
| Complete provenance retrieval | PASS |
| Four-node lineage display | PASS |
| Deterministic analysis for complete demo lineage | NONE risk / score 0 |

The transaction link allows the registration evidence to be independently inspected on the Sepolia explorer. Always check the explorer for current transaction confirmation details.

---

## Getting started locally

### Prerequisites
- Node.js and npm
- Git
- Ethereum Sepolia RPC endpoint
- A funded Sepolia test wallet for backend-managed registration transactions
- Optional Firebase project and credentials for durable metadata persistence

Sepolia test ETH is needed for transactions that write to the contract.

### 1. Clone the repository

```bash
git clone https://github.com/alizahh-7/provenance-ai.git
cd provenance-ai
```

### 2. Install root/backend dependencies

```bash
npm install
```

### 3. Configure the backend

Create a private `.env` file in the repository root. Use `.env.example` as the source of truth for supported variables.

At minimum, configure:

```dotenv
RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_backend_test_wallet_private_key
CONTRACT_ADDRESS=0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431
CHAIN_ID=11155111
PORT=3001
METADATA_STORAGE=memory
```

Never commit `.env`, wallet private keys, RPC credentials, Firebase service-account credentials, or other secrets.

### 4. Configure the frontend for local development

Create or update `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api
VITE_USE_MOCK_API=false
```

The frontend defaults to the same-origin `/api` path when `VITE_API_BASE_URL` is not set. Use the localhost URL above when running the Vite frontend and Express backend on separate local ports.

### 5. Start the backend

From the repository root:

```bash
npm run dev -w backend
```

### 6. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (typically [http://localhost:5173](http://localhost:5173)).

### 7. Check the API

```bash
curl http://localhost:3001/api/health
```

The health endpoint should return a successful status response.

### 8. Check blockchain configuration

From the repository root:

```bash
npm run config:check
```

The configured network should report chain ID `11155111` and a reachable RPC endpoint.

---

## Build and test

Run from the repository root:

```bash
npm run build -w backend
npm run test -w backend
npm run test -w blockchain
npm run build --prefix frontend
npm run compile -w blockchain
npm run config:check
```

### Latest recorded development verification

The integration work recorded on 21 November 2026 included:
- Backend automated tests: **30/30 passed**
- Solidity/Hardhat tests: **2/2 passed**
- Backend TypeScript build: passed
- Frontend production build: passed
- Hardhat contract compilation: passed
- Backend health endpoint: HTTP 200
- Sepolia configuration and RPC connectivity check: passed
- Original demo-file verification: passed
- Tampered demo-file verification: failed as expected

These are recorded development checks, not a claim of exhaustive testing across every browser, network, or production environment.

---

## Deployment notes

The Express application is configured to serve the built frontend from `frontend/dist` as well as expose the API under `/api`. This supports a **single Node.js web service** deployment with frontend and backend on the same origin.

For a Node host using the repository root as its working directory, the build and start commands are:

**Build command**

```bash
npm install && npm ci --prefix frontend && npm run build -w backend && npm run build --prefix frontend
```

**Start command**

```bash
npm start -w backend
```

Set the backend environment variables in the hosting provider's secret/environment settings. Use a persistent metadata store such as Firestore for production; in-memory metadata is lost when the process restarts.

**Netlify note:** Netlify can host the Vite frontend as a static site, but it does not run this Express server as a persistent Node service. For a separate Netlify frontend deployment, set `VITE_API_BASE_URL` to the public URL of a separately hosted backend and configure backend CORS to allow the Netlify site origin. Do not put backend secrets in `VITE_*` variables.

---

## Metadata persistence and limitations

The metadata repository supports two modes:

### In-memory mode

```dotenv
METADATA_STORAGE=memory
```

Useful for local development and short-lived demos. Metadata and activity history are not durable across backend restarts. A blockchain registration can remain on-chain even if the in-memory metadata record is lost.

### Firestore mode

```dotenv
METADATA_STORAGE=firestore
```

Requires Firebase Admin credentials configured using the supported variables in `.env.example`. Firestore provides durable off-chain artifact and provenance metadata.

Blockchain registration and off-chain metadata persistence are separate operations. If an API response is interrupted or metadata persistence fails after a transaction, check the transaction and existing artifact record before retrying; do not blindly submit duplicate registrations.

---

## Demo provenance fixture

The repository includes `docs/demo/complete-lineage-provenance.json`, a fictional example describing:

```text
dataset-climate-2025
        ↓
prep-normalize-07
        ↓
train-xgb-2025-04-18
        ↓
Regional Forecast Model
```

It describes a model with version `v1.0.0`, a dataset with 18,420 rows, z-score preprocessing, and an XGBoost training configuration with seed 42.

This is fictional demonstration metadata. It does not represent a real audited climate model or independently verified training dataset.

---

## API overview

The frontend uses the backend `/api` prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/artifacts/register` | Register an artifact |
| POST | `/api/artifacts/verify` | Verify an uploaded file |
| GET | `/api/artifacts/:id` | Retrieve artifact details |
| GET | `/api/provenance/:id` | Retrieve provenance and analysis |
| GET | `/api/artifacts` | Retrieve recent artifacts when persistent storage supports it |

Registration and verification use `multipart/form-data`. Registration accepts the uploaded artifact, artifact type, version, and optional metadata/provenance fields. Verification accepts the uploaded artifact and its registered artifact ID.

---

## Security and trust boundaries

1. **Raw files stay off-chain.** The smart contract stores registration evidence, not general-purpose file contents.
2. **Verification is fingerprint-based.** Filenames and user assertions are not substitutes for a cryptographic comparison.
3. **Private keys stay server-side.** Never expose wallet credentials in frontend code or client-side environment variables.
4. **On-chain evidence and metadata are different.** A blockchain record can make a fingerprint registration tamper-evident; it cannot independently validate the truth of descriptive metadata.
5. **Risk scores are bounded signals.** A zero score means no configured consistency checks failed, not proof of complete truth or safety.
6. **Handle uncertain transaction outcomes carefully.** Check transaction status before retrying after a timeout or interrupted response.

---

## Target users and potential impact

- AI model and dataset maintainers publishing versioned artifacts
- AI startups and engineering teams that need traceable artifact records
- Researchers working with reproducibility and data/model lineage
- Auditors and downstream users who need to compare a file against registered evidence

The goal is to make integrity evidence easier to inspect without requiring every verifier to access an organization's private development infrastructure.

## Current MVP and future scope

### Implemented in the current MVP
- React-based application workflows
- Backend-managed artifact registration
- SHA-256 fingerprinting
- Ethereum Sepolia smart contract integration
- File integrity verification
- Artifact lookup
- Structured provenance metadata
- Interactive provenance visualization
- Deterministic, rule-based integrity analysis
- In-memory and optional Firestore metadata repository
- Automated backend and smart-contract tests
- Express static serving for the built frontend

### Potential future extensions (not current MVP claims)
- Expanded lineage and consistency checks
- LLM-assisted explanations of findings
- Independent validation of supporting provenance documents
- Additional metadata/evidence attachments
- More blockchain networks
- Exportable audit reports
- Broader software supply-chain and research-data provenance support

---

## Team TechnoDivas

Developed for **HACKSPHERE 2026 — COMPSPHERE 12**, International Team Category.

| Team member | Project responsibility |
|---|---|
| Syeda Alizah — Team Lead | Backend, Web3 integration, final integration and testing |
| Sarah Aejaz | AI analysis and provenance |
| Marzia Tasneem | Frontend development |

## Project status

**Working MVP · Integration and UX refinement**

The core registration, verification, artifact lookup, provenance visualization, and deterministic analysis workflows have been implemented and exercised through automated and integration testing.

---

## Closing

AI accountability should not depend entirely on trusting the organization making the claim.

ProvenanceAI combines cryptographic fingerprints, blockchain registration evidence, structured lineage, and explainable consistency analysis to help people independently check digital AI artifacts.

**Don't just trust the artifact. Verify its evidence.**
