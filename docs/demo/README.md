## Complete lineage demo

[`complete-lineage-provenance.json`](complete-lineage-provenance.json) is a safe, fictional Dataset → Preprocessing → Training → Model fixture using the live backend schema. It is not registered automatically.

To make a live demo later, explicitly approve a Sepolia transaction, select a non-sensitive local file in Register, choose `model` and `v1.0.0`, paste the fixture into **Provenance JSON**, review it, and submit once. The backend supplies the generated artifact ID and the resulting Provenance page should show four nodes, three edges, and risk score `0`. Never retry if the response reports `METADATA_PERSISTENCE_FAILED`; recover the returned artifact ID after Firestore is restored.
