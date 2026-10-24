import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const exists = (name) => Boolean(process.env[name]?.trim());
let detectedChainId = "unavailable";
let connectivity = "FAIL";

if (exists("RPC_URL")) {
  try {
    const response = await fetch(process.env.RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(8_000)
    });
    const payload = await response.json();
    if (!response.ok || payload.error || typeof payload.result !== "string") throw new Error("eth_chainId unavailable");
    detectedChainId = Number(BigInt(payload.result)).toString();
    connectivity = detectedChainId === "11155111" ? "PASS" : "FAIL";
  } catch {
    // Deliberately hide provider error details because they can include an RPC URL.
  }
}

console.log(`RPC_URL exists: ${exists("RPC_URL") ? "YES" : "NO"}`);
console.log(`PRIVATE_KEY exists: ${exists("PRIVATE_KEY") ? "YES" : "NO"}`);
console.log(`CONTRACT_ADDRESS exists: ${exists("CONTRACT_ADDRESS") ? "YES" : "NO"}`);
console.log(`Detected chain ID: ${detectedChainId}`);
console.log(`RPC connectivity: ${connectivity}`);
process.exitCode = connectivity === "PASS" ? 0 : 1;
