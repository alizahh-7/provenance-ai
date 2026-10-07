import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

export interface FileFingerprint { hash: string; algorithm: "sha256"; fileSize: number; }
export async function hashFile(path: string): Promise<FileFingerprint> {
  const digest = createHash("sha256");
  await new Promise<void>((resolve, reject) => { const stream = createReadStream(path); stream.on("data", chunk => digest.update(chunk)); stream.on("error", reject); stream.on("end", resolve); });
  return { hash: digest.digest("hex"), algorithm: "sha256", fileSize: (await stat(path)).size };
}
