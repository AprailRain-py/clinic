import { eq } from "drizzle-orm";
import { db } from "./client";
import { doctors } from "./schema";

export type DoctorProfile = {
  userId: string;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  registrationNumber: string | null;
  degrees: string[];
  specialty: string | null;
  timings: string | null;
  signatureDataUrl: string | null;
};

function parseDegrees(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Legacy / malformed value — treat as empty so the UI stays usable.
  }
  return [];
}

export async function getDoctorProfile(
  userId: string,
): Promise<DoctorProfile | null> {
  const [row] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    userId: row.userId,
    clinicName: row.clinicName,
    clinicAddress: row.clinicAddress,
    clinicPhone: row.clinicPhone,
    registrationNumber: row.registrationNumber,
    degrees: parseDegrees(row.degrees),
    specialty: row.specialty,
    timings: row.timings,
    signatureDataUrl: row.signatureDataUrl,
  };
}
