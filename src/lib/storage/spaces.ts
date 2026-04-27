import type { Readable } from "node:stream";
import type {
  S3Client as S3ClientType,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import type { StorageDriver } from "./index";
import { StorageNotFoundError } from "./index";

// Lazy client: resolve env on first use so `next build` (which imports route
// modules without runtime secrets) doesn't blow up.
let clientPromise: Promise<S3ClientType> | null = null;

async function getClient(): Promise<S3ClientType> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { S3Client } = await import("@aws-sdk/client-s3");
      return new S3Client({
        region: process.env.DO_SPACES_REGION ?? "blr1",
        endpoint:
          process.env.DO_SPACES_ENDPOINT ??
          "https://blr1.digitaloceanspaces.com",
        credentials: {
          accessKeyId: requireEnv("DO_SPACES_KEY"),
          secretAccessKey: requireEnv("DO_SPACES_SECRET"),
        },
        forcePathStyle: false,
      });
    })();
  }
  return clientPromise;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Required when STORAGE_DRIVER=do-spaces.`,
    );
  }
  return v;
}

function bucket(): string {
  return requireEnv("DO_SPACES_BUCKET");
}

async function put(
  key: string,
  bytes: Buffer,
  mimeType: string,
): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: bytes,
      ContentType: mimeType,
      ACL: "private",
    }),
  );
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    e.name === "NoSuchKey" ||
    e.Code === "NoSuchKey" ||
    e.$metadata?.httpStatusCode === 404
  );
}

async function get(
  key: string,
): Promise<{ stream: NodeJS.ReadableStream; sizeBytes: number }> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  let response: GetObjectCommandOutput;
  try {
    response = await client.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
  } catch (err) {
    if (isNotFound(err)) throw new StorageNotFoundError(key);
    throw err;
  }
  const body = response.Body as Readable | undefined;
  if (!body) throw new StorageNotFoundError(key);
  return {
    stream: body,
    sizeBytes: response.ContentLength ?? 0,
  };
}

async function del(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
  );
}

export const spacesDriver: StorageDriver = { put, get, delete: del };
