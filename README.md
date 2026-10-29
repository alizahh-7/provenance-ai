# ProvenanceAI

### Proof Beyond Trust. A Verifiable Chain of Trust for AI.

**TechnoDivas | HACKSPHERE 2026 — COMPSPHERE 12**

ProvenanceAI is a Web3-powered AI provenance and integrity verification platform that enables independent verification of AI artifacts through cryptographic fingerprints, blockchain-backed registration, traceable lineage, and deterministic risk analysis.

Instead of asking users to trust an AI developer's internal records, ProvenanceAI provides independently checkable evidence that a submitted artifact matches its registered version.

**Register. Trace. Verify. Analyze.**

---

## The Problem

AI systems are increasingly built on complex pipelines involving datasets, preprocessing, training runs, and multiple model versions.

But when an organization claims:

- “This model was trained using a particular dataset.”
- “This dataset has not changed since registration.”
- “This is the same model version that was previously audited.”

How can an independent party verify those claims?

Traditional lineage and experiment-tracking tools are useful for internal recordkeeping, but their records generally remain within the organization's own infrastructure.

This creates a trust asymmetry: the party making the claim also controls the supporting records.

ProvenanceAI addresses this by anchoring artifact fingerprints to a public blockchain, allowing third parties to verify file integrity independently.

## Our Solution

ProvenanceAI introduces a verifiable trust layer for AI development.

When a dataset or model is registered, the backend calculates its SHA-256 fingerprint and submits registration evidence to a Solidity smart contract deployed on Ethereum Sepolia.

Users can subsequently upload a file and verify whether its calculated fingerprint matches the registered blockchain record.

Alongside cryptographic verification, ProvenanceAI supports structured provenance metadata and a deterministic analysis engine that identifies configured lineage inconsistencies.

The result is a platform connecting artifact integrity, traceability, and explainable risk signals in one workflow.

### What makes ProvenanceAI different?

**Internal tracking tells you what happened. ProvenanceAI provides independently checkable evidence of what was registered.**

The platform does not require a verifier to blindly accept an organization's internal logs.

It also makes an important distinction: a matching cryptographic fingerprint proves that a file matches its registered fingerprint. It does not, by itself, prove that every statement in the supplied provenance metadata is factually true.

---

## Key Features

### 1. Blockchain-backed artifact registration

Register a dataset, model, or other supported digital artifact.

The system:

- Accepts the selected artifact.
- Calculates its SHA-256 fingerprint.
- Associates it with an artifact type and version.
- Accepts optional metadata and structured provenance information.
- Submits registration evidence through the backend to the deployed smart contract.
- Returns the generated artifact ID and blockchain transaction details.

Raw artifact files remain off-chain.

### 2. Independent integrity verification

Verify whether a file matches an existing registration.

Upload the artifact and provide its registered artifact ID. The backend recalculates its fingerprint and compares it with the registered evidence.

Possible outcomes include:

**VERIFIED:** The submitted file matches the registered fingerprint.

**NOT VERIFIED:** The submitted file differs from the registered artifact.

Even a small modification changes the file's cryptographic fingerprint.

### 3. Visual provenance explorer

Explore the history associated with an artifact through an interactive lineage graph.

The complete demo fixture represents:

```text
Dataset
   |
   v
Preprocessing
   |
   v
Training
   |
   v
Model
```

Users can inspect individual nodes and view the metadata returned by the provenance API.

The graph represents submitted provenance records; missing details are not fabricated.

### 4. Deterministic integrity analysis

ProvenanceAI analyzes structured lineage metadata using backend consistency rules.

The current implementation provides:

- Risk levels and numerical scores.
- Detection of configured provenance inconsistencies.
- Missing-lineage indicators.
- Plain-language explanations.
- Results connected to the selected artifact.

For a complete, internally consistent demo lineage, the expected result is:

```text
Risk level: NONE
Risk score: 0
Recorded nodes: 4
Recorded connections: 3
```

The analysis is deterministic in the current MVP. LLM-assisted interpretation is a potential future extension, not a dependency of the existing verification workflow.

### 5. Artifact registry and evidence viewer

Retrieve a registered artifact using its unique artifact ID.

The artifact detail page displays available information, including:

- Artifact type and version.
- SHA-256 fingerprint.
- Registration timestamp.
- Registrant address.
- Metadata URI.
- Blockchain network and contract information.
- Associated provenance records.
- Navigation to verification and analysis.

### 6. User-facing verification workflow

The application provides dedicated interfaces for:

- Overview
- Register
- Verify
- Artifacts
- Provenance
- AI Analysis

Users interact with these workflows without needing to manually calculate hashes or execute smart contract functions.

---

## How ProvenanceAI Works

### Registration

```text
User uploads an artifact
          |
          v
Backend receives the file
          |
          v
SHA-256 fingerprint generated
          |
          v
Artifact metadata validated
          |
          v
Registration submitted to smart contract
          |
          v
Blockchain evidence returned
          |
          v
Artifact ID generated
          |
          v
Artifact available for future verification
```

### Verification

```text
User supplies artifact ID + file
                |
                v
       File fingerprint calculated
                |
                v
       Registered evidence retrieved
                |
                v
         Fingerprints compared
                |
         +------+------+
         |             |
       MATCH        MISMATCH
         |             |
         v             v
      VERIFIED     NOT VERIFIED
```

### Provenance analysis

```text
Registered artifact
        |
        v
Provenance metadata retrieved
        |
        v
Lineage graph constructed
        |
        v
Consistency rules evaluated
        |
        v
Risk score + findings returned
```

---

## System Architecture

ProvenanceAI separates the user interface, application logic, off-chain metadata, and blockchain evidence.

```text
+----------------------------------------+
|             React Frontend             |
|                                        |
|  Register | Verify | Artifacts          |
|  Provenance | AI Analysis | Overview    |
+-------------------+--------------------+
                    |
                    | REST API
                    v
+----------------------------------------+
|           Node.js / Express            |
|                                        |
|  Upload handling                       |
|  SHA-256 hashing                       |
|  Input validation                      |
|  Artifact registration                 |
|  Integrity verification                |
|  Provenance analysis                   |
|  Metadata repository                   |
+-------------+-------------+------------+
              |             |
              v             v
+-------------------+  +------------------+
| Metadata Storage  |  | Ethereum Sepolia |
|                   |  |                  |
| Memory / Optional |  | Solidity Smart   |
| Firestore         |  | Contract         |
|                   |  |                  |
| Artifact metadata |  | Registration     |
| Provenance data   |  | evidence         |
+-------------------+  +------------------+
```

### Evidence storage model

ProvenanceAI separates information according to its purpose.

| Information | Storage |
|---|---|
| Original uploaded artifact | Processed off-chain; not stored on-chain |
| Cryptographic registration evidence | Smart contract |
| Artifact metadata | Backend metadata repository |
| Structured provenance | Backend metadata repository |
| Transaction evidence | Ethereum Sepolia |

The blockchain serves as the independent integrity anchor, while off-chain storage supports richer application functionality.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Blockchain | Ethereum Sepolia |
| Smart contract | Solidity |
| Cryptographic hashing | SHA-256 |
| Web3 integration | Backend-to-contract interaction |
| Metadata persistence | Repository abstraction with in-memory and optional Firebase Firestore implementations |
| Integrity analysis | Deterministic, rule-based provenance analyzer |
| Backend testing | Vitest |
| Version control | Git and GitHub |

---

## Blockchain Deployment

The existing smart contract is deployed on the Ethereum Sepolia test network.

| Parameter | Value |
|---|---|
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract address | `0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431` |
| Environment | Testnet |

**Contract:** [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431)

The application uses a backend-managed blockchain integration. Users do not need to enter wallet private keys into the website.

Never commit private keys, RPC credentials, or production secrets to this repository.

---

## Live Registration and Verification Demo

The following artifact was registered through the application's live registration interface during integration testing.

**Artifact ID**

```text
art_e4e1b63ff7674f988260822cf3f5
```

**Artifact details**

| Field | Value |
|---|---|
| File | `qa-model-v1.txt` |
| Type | `model` |
| Version | `v1.0.0` |
| Network | Sepolia |
| Chain ID | `11155111` |

**Registered SHA-256 fingerprint**

```text
508edddc75104a57bf480d481e0b2775a2be3d87d40a62358c356ee5516a3d6c
```

**Registration transaction**

[View transaction on Sepolia Etherscan](https://sepolia.etherscan.io/tx/0xf86262eff7243f35128f6c706341181c8e56bd6739685fb74bea5a844cbea17d)

### Observed integration results

| Test | Result |
|---|---|
| Live artifact registration | Successful API registration response |
| Artifact ID generation | PASS |
| Fingerprint generation | PASS |
| Artifact detail lookup | PASS |
| Original-file verification | VERIFIED |
| Complete provenance retrieval | PASS |
| Four-node lineage display | PASS |
| Deterministic provenance analysis | NONE risk / score 0 |

The UI returned the registration transaction hash. Its independent confirmation status can be checked using the Etherscan link above.

---

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- Git
- An Ethereum Sepolia RPC endpoint
- A configured testnet wallet for backend-managed registrations
- Optional: Firebase project for durable metadata persistence

Sepolia test ETH is required for transactions that write to the blockchain.

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd provenance-ai
```

Replace `<YOUR_REPOSITORY_URL>` with the actual GitHub repository URL.

### 2. Install dependencies

From the project root:

```bash
npm install
```

### 3. Configure the backend

Use the repository's `.env.example` as the reference for supported configuration.

Create a private `.env` file and supply the required blockchain configuration, including:

```dotenv
RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=0x1361CCbaB258e2cBb7Cb2dF7Efa03b2F06d8d431

METADATA_STORAGE=memory
```

Use the exact additional variables documented in `.env.example` for your installed version.

**Important:** Never commit `.env`, wallet private keys, service-account credentials, or other secrets.

### 4. Configure the frontend

Create or update `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api
VITE_USE_MOCK_API=false
```

Setting `VITE_USE_MOCK_API=false` enables the real backend integration.

### 5. Start the backend

Open a terminal in the project root:

```bash
npm run dev -w backend
```

Expected startup message:

```text
ProvenanceAI API listening on port 3001
```

### 6. Start the frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:5173
```

Keep both terminals running.

### 7. Check backend connectivity

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok"
}
```

### 8. Verify blockchain configuration

From the project root:

```bash
npm run config:check
```

The configured network should report chain ID `11155111`.

---

## API Reference

The frontend communicates with the backend through the `/api` prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/artifacts/register` | Register a new artifact |
| POST | `/api/artifacts/verify` | Verify a file against a registered artifact |
| GET | `/api/artifacts/:id` | Retrieve an artifact record |
| GET | `/api/provenance/:id` | Retrieve provenance and analysis |
| GET | `/api/artifacts` | Retrieve recent activity when supported by persistent storage |

### Registration request

`POST /api/artifacts/register`

Uses `multipart/form-data`.

| Field | Description |
|---|---|
| `artifact` | Uploaded file |
| `artifactType` | Artifact category |
| `version` | Version identifier |
| `metadataUri` | Optional metadata reference |
| `provenance` | Optional serialized provenance JSON |

The backend performs authoritative validation and blockchain registration.

### Verification request

`POST /api/artifacts/verify`

Uses `multipart/form-data`.

| Field | Description |
|---|---|
| `artifact` | File being verified |
| `artifactId` | Existing registered artifact ID |

The backend recalculates the submitted file's fingerprint and checks it against the registered evidence.

### Metadata persistence

The application supports two metadata repository configurations.

**Memory mode**

```dotenv
METADATA_STORAGE=memory
```

Suitable for local development and isolated testing.

Memory-backed metadata is not durable across backend restarts. The recent-activity endpoint can return:

```text
503 PERSISTENCE_UNAVAILABLE
```

This is an intentional capability response, not a successful history listing.

**Firestore mode**

```dotenv
METADATA_STORAGE=firestore
```

Configure the Firebase Admin credentials using the supported variables documented in `.env.example`.

Firestore enables durable off-chain metadata and activity history.

The blockchain registration and the off-chain metadata repository are separate systems. If a blockchain transaction succeeds but metadata persistence fails, do not blindly retry registration; first recover the existing registration.

---

## Using the Application

### Register an artifact

1. Open **Register**.
2. Upload a supported file.
3. Select its artifact type.
4. Enter its version.
5. Optionally provide a metadata URI and provenance JSON.
6. Review the details.
7. Submit the registration once.
8. Save the returned artifact ID and transaction information.

The frontend includes validation for malformed provenance JSON, incompatible version/type information, and the configured upload-size limit.

**Registration sends a real Sepolia transaction when the application is running in live API mode.**

### Verify an artifact

1. Open **Verify**.
2. Enter the registered artifact ID.
3. Upload the file to be checked.
4. Select **Verify Integrity**.
5. Inspect the calculated and expected fingerprints.

A matching fingerprint returns VERIFIED. A modified file should return a failed verification result.

### Explore provenance

1. Open **Provenance**.
2. Enter an existing artifact ID.
3. Load the provenance record.
4. Explore the returned lineage nodes.
5. Inspect the selected node's metadata and analysis results.

### Analyze integrity

Open **AI Analysis** and load an existing artifact to inspect the backend's deterministic risk assessment.

---

## Demo Provenance Fixture

The repository includes:

```text
docs/demo/complete-lineage-provenance.json
```

This fictional fixture demonstrates a complete AI development lineage:

```text
dataset-climate-2025
        |
        v
prep-normalize-07
        |
        v
train-xgb-2025-04-18
        |
        v
Regional Forecast Model
```

The registration form should use:

```text
Artifact type: model
Version: v1.0.0
```

The selected version must match the corresponding version declared in the provenance metadata.

For a valid complete-lineage registration, the expected analysis is:

- Four recorded nodes.
- Three recorded connections.
- No configured consistency issues.
- Risk score 0.

This is fictional demonstration metadata. It does not represent a real audited climate model or independently verified training dataset.

---

## Testing and Validation

The project includes automated backend and blockchain tests.

The latest reported integration verification produced:

| Test | Result |
|---|---|
| Frontend production build | PASS |
| Backend TypeScript build | PASS |
| Backend automated tests | 30/30 PASS |
| Blockchain tests | 2/2 PASS |
| Git diff whitespace check | PASS |
| Frontend route availability | PASS |
| Backend health | HTTP 200 |
| Existing Sepolia artifact lookup | HTTP 200 |
| Original demo-file verification | PASS |
| Tampered demo-file verification | FAIL, as expected |
| Provenance API integration | PASS |

These are recorded development test results, not a claim that every possible browser interaction has been exhaustively tested.

### Run the tests

From the project root:

```bash
npm run build -w backend
npm run test -w backend
npm run test -w blockchain
```

Build the frontend:

```bash
npm run build -w frontend
```

Check blockchain connectivity:

```bash
npm run config:check
```

### Manual QA coverage

Manual testing has additionally exercised the live registration success flow, artifact detail lookup, original-file verification, and complete-lineage provenance display.

---

## Security and Design Considerations

ProvenanceAI follows several important design principles.

**1. Raw files remain off-chain.**

The blockchain is used for registration evidence, not as general-purpose file storage.

**2. Verification is fingerprint-based.**

The system compares cryptographic fingerprints instead of relying on filenames or user assertions.

**3. Wallet credentials stay server-side.**

Private keys must never be entered into frontend forms or exposed through client-side environment variables.

**4. Blockchain evidence and metadata have different trust properties.**

The blockchain provides tamper-evident registration evidence. Submitted descriptive metadata must still be assessed on its own merits.

**5. Risk scores are explainable signals, not absolute guarantees.**

A score of zero indicates that no configured consistency rules were violated. It does not establish that every supplied provenance claim is truthful.

**6. Failed responses require careful transaction handling.**

An interrupted API response does not necessarily mean that a blockchain transaction failed. Transaction status should be checked before retrying.

---

## Target Users

ProvenanceAI is designed for people and organizations that need independently checkable evidence about digital artifacts.

**Primary users**

- Open-source AI model maintainers.
- AI startups publishing datasets and model versions.
- Teams requiring reproducible artifact records.

**Secondary users**

- AI auditors and compliance teams.
- Researchers investigating model provenance.
- Journalists examining public AI development claims.
- Downstream users verifying distributed AI artifacts.

The broader objective is to make AI integrity evidence accessible without requiring every verifier to have access to an organization's internal infrastructure.

---

## Current MVP and Future Scope

### Implemented MVP

- React-based multi-page application.
- Backend-managed artifact registration.
- SHA-256 fingerprinting.
- Ethereum Sepolia smart contract integration.
- Independent file verification.
- Artifact lookup.
- Structured provenance metadata.
- Interactive provenance visualization.
- Deterministic integrity analysis.
- Optional Firestore metadata persistence.
- Automated backend and blockchain testing.

### Future enhancements

The following are potential extensions, not claims about the current implementation:

- More accessible, guided onboarding for non-technical users.
- Expanded lineage consistency checks.
- LLM-assisted explanations of provenance findings.
- Independent validation of supporting provenance documents.
- Richer metadata and evidence attachments.
- Persistent activity dashboards.
- Support for additional blockchain networks.
- Software supply-chain artifact verification.
- Academic research-data integrity verification.
- Improved audit-report generation and export.

Our long-term vision is to make independently verifiable provenance a practical component of trustworthy AI infrastructure.

---

## Team TechnoDivas

Developed for **HACKSPHERE 2026 — COMPSPHERE 12**, International Team Category.

| Team member | Responsibility |
|---|---|
| **Syeda Alizah** — Team Lead | Backend, Web3 integration, final integration and testing |
| **Sarah Aejaz** | AI analysis and provenance |
| **Marzia Tasneem** | Frontend development |

The project brings together Web3, software engineering, and AI provenance to address the challenge of independently verifiable AI artifacts.

---

## Project Status

**Working MVP — Integration and UX refinement phase**

The core registration, verification, artifact lookup, provenance visualization, and deterministic analysis workflows have been implemented and tested.

The team is continuing to refine the user experience and prepare for the next hackathon phase.

---

## Closing Note

AI accountability should not depend entirely on trusting the organization making the claim.

ProvenanceAI takes a practical step toward independent verification by combining cryptographic fingerprints, blockchain registration evidence, structured lineage, and explainable integrity analysis.

**Don't just trust the artifact. Verify its evidence.**
