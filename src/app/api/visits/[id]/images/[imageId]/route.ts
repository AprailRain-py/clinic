import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { visitImages } from "@/lib/db/schema";
import { getStorage, StorageNotFoundError } from "@/lib/storage";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

async function loadImageForCaller(
  visitId: string,
  imageId: string,
  userId: string,
) {
  const [row] = await db
    .select({
      id: visitImages.id,
      storageKey: visitImages.storageKey,
      mimeType: visitImages.mimeType,
      sizeBytes: visitImages.sizeBytes,
    })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.id, imageId),
        eq(visitImages.visitId, visitId),
        eq(visitImages.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { id: visitId, imageId } = await params;
  const row = await loadImageForCaller(visitId, imageId, session.user.id);
  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const { stream } = await getStorage().get(row.storageKey);
    const webStream =
      stream instanceof ReadableStream
        ? stream
        : Readable.toWeb(stream as Readable);
    return new Response(webStream as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(row.sizeBytes),
        "Cache-Control": "no-store, private",
        Vary: "Cookie",
      },
    });
  } catch (err) {
    if (err instanceof StorageNotFoundError) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: "storage_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { id: visitId, imageId } = await params;
  const row = await loadImageForCaller(visitId, imageId, session.user.id);
  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  // Best-effort storage delete; if it fails we still clear the DB row so the
  // UI recovers. An orphan bucket object is easier to reconcile than a phantom
  // thumbnail whose bytes 404.
  try {
    await getStorage().delete(row.storageKey);
  } catch (err) {
    console.warn(
      `visit_images: storage delete failed for key=${row.storageKey}`,
      err,
    );
  }

  await db
    .delete(visitImages)
    .where(
      and(
        eq(visitImages.id, imageId),
        eq(visitImages.visitId, visitId),
        eq(visitImages.userId, session.user.id),
      ),
    );

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
