import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { screeningImages } from "@/lib/db/schema";
import { getStorage, StorageNotFoundError } from "@/lib/storage";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

async function loadImageForCaller(
  screeningId: string,
  imageId: string,
  userId: string,
) {
  const [row] = await db
    .select({
      id: screeningImages.id,
      storageKey: screeningImages.storageKey,
      mimeType: screeningImages.mimeType,
      sizeBytes: screeningImages.sizeBytes,
    })
    .from(screeningImages)
    .where(
      and(
        eq(screeningImages.id, imageId),
        eq(screeningImages.screeningId, screeningId),
        eq(screeningImages.userId, userId),
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

  const { id: screeningId, imageId } = await params;
  const row = await loadImageForCaller(screeningId, imageId, session.user.id);
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

  const { id: screeningId, imageId } = await params;
  const row = await loadImageForCaller(screeningId, imageId, session.user.id);
  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  try {
    await getStorage().delete(row.storageKey);
  } catch (err) {
    console.warn(
      `screening_images: storage delete failed for key=${row.storageKey}`,
      err,
    );
  }

  await db
    .delete(screeningImages)
    .where(
      and(
        eq(screeningImages.id, imageId),
        eq(screeningImages.screeningId, screeningId),
        eq(screeningImages.userId, session.user.id),
      ),
    );

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
