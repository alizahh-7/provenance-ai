import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile } from "../src/services/hashingService.js";

describe("hashFile", () => {
  it("is deterministic, byte-based, and returns a valid SHA-256 digest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "provenance-hash-")); const one = join(dir, "one.bin"); const two = join(dir, "two.bin");
    await writeFile(one, Buffer.from("identical bytes")); await writeFile(two, Buffer.from("identical bytes"));
    const first = await hashFile(one); const second = await hashFile(one); const copy = await hashFile(two);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/); expect(first).toEqual(second); expect(first.hash).toBe(copy.hash); expect(first.fileSize).toBe(15);
    await writeFile(two, Buffer.from("changed bytes")); expect((await hashFile(two)).hash).not.toBe(first.hash); await rm(dir, { recursive: true });
  });
});
