import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import type { StorageDriver } from "./index";
import { StorageNotFoundError } from "./index";

// Root is ./uploads/ relative to the web dir. Resolving from process.cwd()
// matches how `next start` / `next build` run the server.
function rootDir(): string {
  return path.resolve(process.cwd(), "uploads");
}

function fullPath(key: string): string {
  // Keys are server-generated (never user input), but normalize defensively
  // so a misbehaving caller can't ".." out of the uploads root.
  const normalized = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  return path.join(rootDir(), normalized);
}

async function put(key: string, bytes: Buffer): Promise<void> {
  const target = fullPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

async function get(
  key: string,
): Promise<{ stream: NodeJS.ReadableStream; sizeBytes: number }> {
  const target = fullPath(key);
  try {
    const stat = await fs.stat(target);
    const stream = createReadStream(target);
    return { stream, sizeBytes: stat.size };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new StorageNotFoundError(key);
    }
    throw err;
  }
}

async function del(key: string): Promise<void> {
  const target = fullPath(key);
  try {
    await fs.unlink(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export const localDriver: StorageDriver = { put, get, delete: del };
