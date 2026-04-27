import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { doctors } from "@/lib/db/schema";
import { getDoctorProfile } from "@/lib/db/doctor";
import { doctorUpsertSchema } from "@/lib/validators/doctor";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const profile = await getDoctorProfile(session.user.id);
  if (!profile) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(profile, { headers: PRIVATE_HEADERS });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = doctorUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const values = parsed.data;
  const now = Date.now();
  const row = {
    userId: session.user.id,
    clinicName: values.clinicName ?? null,
    clinicAddress: values.clinicAddress ?? null,
    clinicPhone: values.clinicPhone ?? null,
    registrationNumber: values.registrationNumber ?? null,
    degrees: JSON.stringify(values.degrees ?? []),
    specialty: values.specialty ?? null,
    timings: values.timings ?? null,
    signatureDataUrl: values.signatureDataUrl ?? null,
    updatedAt: now,
  };

  await db
    .insert(doctors)
    .values(row)
    .onConflictDoUpdate({
      target: doctors.userId,
      set: {
        clinicName: row.clinicName,
        clinicAddress: row.clinicAddress,
        clinicPhone: row.clinicPhone,
        registrationNumber: row.registrationNumber,
        degrees: row.degrees,
        specialty: row.specialty,
        timings: row.timings,
        signatureDataUrl: row.signatureDataUrl,
        updatedAt: row.updatedAt,
      },
    });

  const stored = await getDoctorProfile(session.user.id);
  return NextResponse.json(stored, { headers: PRIVATE_HEADERS });
}
