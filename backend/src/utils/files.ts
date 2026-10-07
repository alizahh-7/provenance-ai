import { unlink } from "node:fs/promises";
export async function removeTemporaryFile(path?: string) { if (path) await unlink(path).catch(() => undefined); }
