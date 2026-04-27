import { localDriver } from "./local";
import { spacesDriver } from "./spaces";

export interface StorageDriver {
  put(key: string, bytes: Buffer, mimeType: string): Promise<void>;
  get(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; sizeBytes: number }>;
  delete(key: string): Promise<void>;
}

// Thrown by drivers when a key does not exist, so API handlers can map to 404
// without having to sniff driver-specific errors.
export class StorageNotFoundError extends Error {
  constructor(key: string) {
    super(`Storage key not found: ${key}`);
    this.name = "StorageNotFoundError";
  }
}

export function getStorage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") return localDriver;
  if (driver === "do-spaces") return spacesDriver;
  throw new Error(`Unknown STORAGE_DRIVER: ${driver}`);
}

export function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}
