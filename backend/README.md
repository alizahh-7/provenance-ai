# ProvenanceAI backend

The API hashes uploaded bytes with SHA-256 and registers that fingerprint through `ArtifactProvenance`. A matching fingerprint establishes equality with the registered bytes; provenance analysis separately checks the supplied metadata and cannot establish that training history is factually true.

## Setup

From the repository root, run `npm install`. Copy the root `.env.example` to `.env` and configure the blockchain values there. `PRIVATE_KEY` is used only server-side and must never be sent to a browser. Run `npm run dev -w backend`; the API listens on `PORT` (default 3001). Uploaded files are temporary and deleted after each request.

## Artifact API

`POST /api/artifacts/register` accepts multipart `artifact`, `artifactType`, `version`, optional `metadataUri`, and optional JSON `provenance`. Registration returns HTTP 201 only after the existing blockchain registration succeeds. Provenance validation runs before submission and its record is associated with the generated artifact ID after successful registration; no Web3 behavior is changed.

`POST /api/artifacts/verify` accepts `artifact` and `artifactId`. It returns PASS only for a fingerprint match with the configured chain record. RPC and contract read failures are server errors, not FAIL results. `GET /api/artifacts/:id` reads the chain-backed artifact.

## Provenance input

The multipart `provenance` field is a JSON object, limited to 65,536 UTF-8 bytes and nesting depth 8. `artifactType` and `version` may be omitted and then inherit the submitted registration values; if present, they must match. The server supplies the generated `artifact` ID. A supplied provenance value may contain:

```ts
interface ProvenanceInput {
  artifact?: string; // if present, must match the generated registration ID
  artifactType?: string;
  version?: string;
  parent?: string | null; // earlier registered artifact ID
  dataset?: string | null; // one dataset (legacy-compatible)
  datasets?: string[]; // up to 32 additional dataset IDs; no duplicates
  preprocessing?: string | null;
  trainingRun?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp?: number | string | null;
  relationships?: Array<{ from: string; to: string; type: ProvenanceRelationType }>;
}
type ProvenanceRelationType = "DERIVED_FROM" | "PROCESSED_BY" | "TRAINED_TO_CREATE" | "DATASET_FOR_TRAINING" | "PREPROCESSING_FOR_TRAINING";
```

IDs are 1–128 characters matching `[A-Za-z0-9][A-Za-z0-9._:-]*`. Explicit relationship types are validated against declared roles and direction. `$CURRENT_ARTIFACT` is accepted as an endpoint alias in input. Relationship entries are optional: the scalar lineage references themselves define the pipeline, and graph edges are generated from those references. A malformed supplied JSON value, incorrect type, duplicate role ID, unknown parent, unsupported relation, undeclared endpoint, or inconsistent direction is rejected with HTTP 400 (`{ "success": false, "code": "VALIDATION_ERROR", "error": "..." }`). Missing provenance stages are valid but incomplete and appear as analysis issues; omitted provenance creates no synthetic lineage nodes.

## Graph and provenance response

`GET /api/provenance/:id` requires a valid artifact ID and checks the configured blockchain before returning data. An unknown artifact returns 404 `ARTIFACT_NOT_FOUND`; validation errors return 400; repository or infrastructure errors return a safe 500/502 response. A known artifact without provenance receives only its artifact node and a `MISSING_PROVENANCE` analysis issue. The current metadata repository is an in-memory convenience repository; production Firestore persistence requires an adapter implementing the repository operations used by `ArtifactService` (`save`, `get`, `artifactIds`, `hasArtifact`, `saveProvenance`, `getProvenance`, `graph`).

Response shape (legacy top-level `nodes` and `relationships` are retained; `graph` is the preferred grouped field):

```ts
type ProvenanceNodeType = "dataset" | "preprocessing" | "training" | "model" | "artifact";
type ProvenanceGraphEdgeType = "processed_by" | "preprocessing_for" | "dataset_for_training" | "trained_to_create" | "derived_from";
interface ProvenanceGraphNode { id: string; type: ProvenanceNodeType; label: string; metadata: Record<string, unknown>; version?: string; }
interface ProvenanceGraphEdge { id: string; source: string; target: string; type: ProvenanceGraphEdgeType; }
interface ProvenanceGraph { nodes: ProvenanceGraphNode[]; edges: ProvenanceGraphEdge[]; relationships: Array<{ from: string; to: string; relationship: string }>; }
type ProvenanceSeverity = "LOW" | "MEDIUM" | "HIGH";
type ProvenanceRiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";
interface ProvenanceIssue { code: string; severity: ProvenanceSeverity; message: string; affectedNodeId: string | null; affectedField?: string; }
interface ProvenanceAnalysis { riskLevel: ProvenanceRiskLevel; riskScore: number; severity: ProvenanceSeverity; issues: ProvenanceIssue[]; explanation: string; }
interface ProvenanceResponse { success: true; artifactId: string; graph: ProvenanceGraph; nodes: ProvenanceGraphNode[]; edges: ProvenanceGraphEdge[]; relationships: ProvenanceGraph["relationships"]; analysis: ProvenanceAnalysis; }
```

Edges use data-flow direction, from input/source to consumer/product:

| Edge type | Direction |
| --- | --- |
| `processed_by` | dataset → preprocessing |
| `preprocessing_for` | preprocessing → training |
| `dataset_for_training` | dataset → training when preprocessing is absent |
| `trained_to_create` | training → model/artifact |
| `derived_from` | parent artifact → registered artifact |

Nodes and edges are built only from declared IDs; missing stages are omitted and no edge may refer to an absent node. The legacy `relationships` projection mirrors edge endpoints and uppercased relationship type for existing consumers.

## Deterministic risk rules

This is a deterministic rule analyzer, not a trained ML model. Each unique issue contributes HIGH=40, MEDIUM=20, LOW=5 points; the sum is capped at 100. Risk levels use the capped score: NONE=0, LOW=1–29, MEDIUM=30–59, HIGH=60–100. The aggregate `severity` uses LOW below 30, MEDIUM from 30, HIGH from 60. Issues include missing dataset (HIGH), preprocessing (MEDIUM), training run (HIGH), parent reference for versions other than `1`/`v1` (MEDIUM), unsupported version format (LOW), metadata contradictions (HIGH or MEDIUM), unknown parent (MEDIUM), and an obvious parent version ordering/jump inconsistency (HIGH or MEDIUM).

Only plain numeric versions with up to three dot-separated components, optionally prefixed by `v`, are ordered. A major-version gap greater than one is reported as suspicious; numeric strings outside this format are classified unsupported, not coerced by extracting digits. The analyzer cannot inspect dataset contents, validate external training events, prove authorship, or turn an on-chain fingerprint match into proof of provenance. Risk means only “issues detected in available metadata.” Infrastructure failures are returned as errors and never replaced by a low-risk result.

## Complete example

Fictional multipart provenance value:

```json
{
  "artifactType": "model",
  "version": "v1.0.0",
  "dataset": "dataset-climate-2025",
  "preprocessing": "prep-normalize-07",
  "trainingRun": "train-xgb-2025-04-18",
  "metadata": {
    "name": "Regional Forecast Model",
    "version": "v1.0.0",
    "datasetMetadata": { "format": "parquet", "rows": 18420 },
    "preprocessing": { "method": "z-score", "codeRevision": "a13fd04" },
    "training": { "framework": "xgboost", "seed": 42 }
  }
}
```

For that complete `v1.0.0` lineage, the response contains dataset → preprocessing → training → generated artifact nodes/edges and an empty issue list with `riskLevel: "NONE"`, `riskScore: 0`, and `severity: "LOW"` (the no-issues explanation still disclaims factual verification). A real response includes the generated artifact ID in place of the illustrative ID below:

```json
{
  "success": true,
  "artifactId": "art_generated_id",
  "graph": {
    "nodes": [
      { "id": "dataset-climate-2025", "type": "dataset", "label": "dataset-climate-2025", "metadata": { "format": "parquet", "rows": 18420 } },
      { "id": "prep-normalize-07", "type": "preprocessing", "label": "prep-normalize-07", "metadata": { "method": "z-score", "codeRevision": "a13fd04" } },
      { "id": "train-xgb-2025-04-18", "type": "training", "label": "train-xgb-2025-04-18", "metadata": { "framework": "xgboost", "seed": 42 } },
      { "id": "art_generated_id", "type": "model", "label": "Regional Forecast Model", "version": "v1.0.0", "metadata": { "name": "Regional Forecast Model", "version": "v1.0.0", "datasetMetadata": { "format": "parquet", "rows": 18420 }, "preprocessing": { "method": "z-score", "codeRevision": "a13fd04" }, "training": { "framework": "xgboost", "seed": 42 } } }
    ],
    "edges": [
      { "id": "processed_by:dataset-climate-2025->prep-normalize-07", "source": "dataset-climate-2025", "target": "prep-normalize-07", "type": "processed_by" },
      { "id": "preprocessing_for:prep-normalize-07->train-xgb-2025-04-18", "source": "prep-normalize-07", "target": "train-xgb-2025-04-18", "type": "preprocessing_for" },
      { "id": "trained_to_create:train-xgb-2025-04-18->art_generated_id", "source": "train-xgb-2025-04-18", "target": "art_generated_id", "type": "trained_to_create" }
    ],
    "relationships": [
      { "from": "dataset-climate-2025", "to": "prep-normalize-07", "relationship": "PROCESSED_BY" },
      { "from": "prep-normalize-07", "to": "train-xgb-2025-04-18", "relationship": "PREPROCESSING_FOR_TRAINING" },
      { "from": "train-xgb-2025-04-18", "to": "art_generated_id", "relationship": "TRAINED_TO_CREATE" }
    ]
  },
  "nodes": [
    { "id": "dataset-climate-2025", "type": "dataset", "label": "dataset-climate-2025", "metadata": { "format": "parquet", "rows": 18420 } },
    { "id": "prep-normalize-07", "type": "preprocessing", "label": "prep-normalize-07", "metadata": { "method": "z-score", "codeRevision": "a13fd04" } },
    { "id": "train-xgb-2025-04-18", "type": "training", "label": "train-xgb-2025-04-18", "metadata": { "framework": "xgboost", "seed": 42 } },
    { "id": "art_generated_id", "type": "model", "label": "Regional Forecast Model", "version": "v1.0.0", "metadata": { "name": "Regional Forecast Model", "version": "v1.0.0", "datasetMetadata": { "format": "parquet", "rows": 18420 }, "preprocessing": { "method": "z-score", "codeRevision": "a13fd04" }, "training": { "framework": "xgboost", "seed": 42 } } }
  ],
  "edges": [
    { "id": "processed_by:dataset-climate-2025->prep-normalize-07", "source": "dataset-climate-2025", "target": "prep-normalize-07", "type": "processed_by" },
    { "id": "preprocessing_for:prep-normalize-07->train-xgb-2025-04-18", "source": "prep-normalize-07", "target": "train-xgb-2025-04-18", "type": "preprocessing_for" },
    { "id": "trained_to_create:train-xgb-2025-04-18->art_generated_id", "source": "train-xgb-2025-04-18", "target": "art_generated_id", "type": "trained_to_create" }
  ],
  "relationships": [
    { "from": "dataset-climate-2025", "to": "prep-normalize-07", "relationship": "PROCESSED_BY" },
    { "from": "prep-normalize-07", "to": "train-xgb-2025-04-18", "relationship": "PREPROCESSING_FOR_TRAINING" },
    { "from": "train-xgb-2025-04-18", "to": "art_generated_id", "relationship": "TRAINED_TO_CREATE" }
  ],
  "analysis": {
    "riskLevel": "NONE",
    "riskScore": 0,
    "severity": "LOW",
    "issues": [],
    "explanation": "No configured provenance consistency issues were detected; this does not independently prove the supplied history is factual."
  }
}
```

The example shows the duplicate top-level compatibility arrays in full; the grouped `graph` property is the preferred frontend field.

## Verification

`npm run build -w backend`, `npm run test -w backend`, `npm run compile -w blockchain`, and `npm run test -w blockchain` are the project verification commands. Backend tests use a mock blockchain gateway and do not send Sepolia transactions.
