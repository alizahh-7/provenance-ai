# ProvenanceAI frontend

React + TypeScript + Vite interface for the ProvenanceAI hackathon MVP.

## Run locally

```sh
cd frontend
npm install
npm run dev
```

The default development mode is explicitly labeled **DEMO MODE**. Demo records use browser `localStorage` and generated display fingerprints; they are not cryptographic or blockchain proofs. To connect to the backend, copy `.env.example` to `.env.local`, set `VITE_USE_MOCK_API=false`, and set `VITE_API_BASE_URL=http://localhost:3001/api`, then restart Vite.

The live service layer calls `POST /artifacts/register`, `POST /artifacts/verify`, `GET /artifacts/:id`, and `GET /provenance/:id`. Verification sends both the uploaded file and the artifact ID, which the current backend implementation requires. API errors and missing optional fields are surfaced without inventing blockchain or integrity-analysis results.

The current backend stores only limited provenance metadata and does not provide verification history or integrity analysis. Those dashboard metrics remain unavailable and the risk panel is a clearly marked integration placeholder until those services return real data.
