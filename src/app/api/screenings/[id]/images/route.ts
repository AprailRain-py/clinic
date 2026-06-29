import { NextResponse } from "next/server";
import { and, asc, count, eq, max } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, screeningImages, screenings } from "@/lib/db/schema";
import { extForMime, getStorage } from "@/lib/storage";
import { sniffImageMime } from "@/lib/storage/sniff";
import { oralImageViewEnum } from "@/lib/validators/screening";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_SCREENING = 20; // 7 required + conditional + per-lesion
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

async function loadScreeningForCaller(screeningId: string, userId: string) {
  const [row] = await db
    .select({ id: screenings.id, patientId: screenings.patientId })
    .from(screenings)
    .innerJoin(patients, eq(screenings.patientId, patients.id))
    .where(and(eq(screenings.id, screeningId), eq(screenings.userId, userId)))
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

  const { id: screeningId } = await params;
  const screening = await loadScreeningForCaller(screeningId, session.user.id);
  if (!screening) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const rows = await db
    .select({
      id: screeningImages.id,
      viewType: screeningImages.viewType,
      mimeType: screeningImages.mimeType,
      sizeBytes: screeningImages.sizeBytes,
      qualityCheck: screeningImages.qualityCheck,
      position: screeningImages.position,
      createdAt: screeningImages.createdAt,
    })
    .from(screeningImages)
    .where(
      and(
        eq(screeningImages.screeningId, screeningId),
        eq(screeningImages.userId, session.user.id),
      ),
    )
    .orderBy(asc(screeningImages.position), asc(screeningImages.id));

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

  const { id: screeningId } = await params;
  const screening = await loadScreeningForCaller(screeningId, session.user.id);
  if (!screening) {
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

  // Which guided view this photo is for.
  const viewParsed = oralImageViewEnum.safeParse(form.get("viewType"));
  if (!viewParsed.success) {
    return NextResponse.json(
      { error: "invalid_view_type" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const viewType = viewParsed.data;

  // Optional client-side quality-gate result (blur/brightness/glare).
  const qualityRaw = form.get("qualityCheck");
  let qualityCheck: string | null = null;
  if (typeof qualityRaw === "string" && qualityRaw.length > 0) {
    try {
      JSON.parse(qualityRaw); // validate it parses; store as-is
      qualityCheck = qualityRaw.slice(0, 2000);
    } catch {
      qualityCheck = null;
    }
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
    .from(screeningImages)
    .where(
      and(
        eq(screeningImages.screeningId, screeningId),
        eq(screeningImages.userId, session.user.id),
      ),
    );
  if (existing >= MAX_IMAGES_PER_SCREENING) {
    return NextResponse.json(
      { error: "max_images_reached" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const imageId = createId();
  const ext = extForMime(sniffed);
  const storageKey = `screenings/${session.user.id}/${screening.patientId}/${screeningId}/${imageId}.${ext}`;

  try {
    await getStorage().put(storageKey, buffer, sniffed);
  } catch {
    return NextResponse.json(
      { error: "storage_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const [{ maxPos }] = await db
    .select({ maxPos: max(screeningImages.position) })
    .from(screeningImages)
    .where(
      and(
        eq(screeningImages.screeningId, screeningId),
        eq(screeningImages.userId, session.user.id),
      ),
    );
  const position = (maxPos ?? -1) + 1;

  try {
    const [inserted] = await db
      .insert(screeningImages)
      .values({
        id: imageId,
        screeningId,
        userId: session.user.id,
        viewType,
        storageKey,
        mimeType: sniffed,
        sizeBytes: buffer.byteLength,
        qualityCheck,
        position,
      })
      .returning({
        id: screeningImages.id,
        viewType: screeningImages.viewType,
        mimeType: screeningImages.mimeType,
        sizeBytes: screeningImages.sizeBytes,
        qualityCheck: screeningImages.qualityCheck,
        position: screeningImages.position,
        createdAt: screeningImages.createdAt,
      });
    return NextResponse.json(inserted, {
      status: 201,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    await getStorage()
      .delete(storageKey)
      .catch(() => {});
    return NextResponse.json(
      { error: "insert_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
