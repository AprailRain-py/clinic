import { NextResponse } from "next/server";
import { and, asc, count, eq, max } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visitImages, visits } from "@/lib/db/schema";
import { extForMime, getStorage } from "@/lib/storage";
import { sniffImageMime } from "@/lib/storage/sniff";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_VISIT = 10;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

async function loadVisitForCaller(visitId: string, userId: string) {
  const [row] = await db
    .select({ id: visits.id, patientId: visits.patientId })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.id, visitId), eq(patients.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { id: visitId } = await params;
  const visit = await loadVisitForCaller(visitId, session.user.id);
  if (!visit) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const rows = await db
    .select({
      id: visitImages.id,
      mimeType: visitImages.mimeType,
      sizeBytes: visitImages.sizeBytes,
      position: visitImages.position,
      createdAt: visitImages.createdAt,
    })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.visitId, visitId),
        eq(visitImages.userId, session.user.id),
      ),
    )
    .orderBy(asc(visitImages.position), asc(visitImages.id));

  return NextResponse.json({ images: rows }, { headers: NO_STORE_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { id: visitId } = await params;
  const visit = await loadVisitForCaller(visitId, session.user.id);
  if (!visit) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "file_required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const declaredMime = file.type;
  if (!ALLOWED_MIME.includes(declaredMime as AllowedMime)) {
    return NextResponse.json(
      { error: "unsupported_mime" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const arrayBuf = await file.arrayBuffer();
  if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const buffer = Buffer.from(arrayBuf);
  const sniffed = sniffImageMime(buffer);
  if (!sniffed || sniffed !== declaredMime) {
    return NextResponse.json(
      { error: "unsupported_mime" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const [{ c: existing }] = await db
    .select({ c: count() })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.visitId, visitId),
        eq(visitImages.userId, session.user.id),
      ),
    );
  if (existing >= MAX_IMAGES_PER_VISIT) {
    return NextResponse.json(
      { error: "max_images_reached" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const imageId = createId();
  const ext = extForMime(sniffed);
  const storageKey = `prescriptions/${session.user.id}/${visit.patientId}/${visitId}/${imageId}.${ext}`;

  try {
    await getStorage().put(storageKey, buffer, sniffed);
  } catch {
    return NextResponse.json(
      { error: "storage_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const [{ maxPos }] = await db
    .select({ maxPos: max(visitImages.position) })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.visitId, visitId),
        eq(visitImages.userId, session.user.id),
      ),
    );
  const position = (maxPos ?? -1) + 1;

  try {
    const [inserted] = await db
      .insert(visitImages)
      .values({
        id: imageId,
        visitId,
        userId: session.user.id,
        storageKey,
        mimeType: sniffed,
        sizeBytes: buffer.byteLength,
        position,
      })
      .returning({
        id: visitImages.id,
        mimeType: visitImages.mimeType,
        sizeBytes: visitImages.sizeBytes,
        position: visitImages.position,
        createdAt: visitImages.createdAt,
      });
    return NextResponse.json(inserted, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    // Best-effort cleanup of the orphan object; we've already logged the
    // DB error path indirectly via the 500 response.
    await getStorage()
      .delete(storageKey)
      .catch(() => {});
    return NextResponse.json(
      { error: "insert_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
