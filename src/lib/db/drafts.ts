import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "./client";
import { patients, visits } from "./schema";

/**
 * Best-effort cleanup of stale draft visits for a user. A draft visit is one
 * where `status = 'draft'` and `created_at` (bigint epoch ms) is older than
 * the cutoff. Patient ownership is enforced via the IN-subquery.
 *
 * Intended to be called opportunistically (e.g. on patient-page load). The
 * caller MUST wrap this in try/catch — cleanup should never block a page.
 */
export async function deleteStaleDrafts(
  userId: string,
  olderThanHours = 24,
): Promise<number> {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;

  const ownedPatients = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.userId, userId));

  const deleted = await db
    .delete(visits)
    .where(
      and(
        eq(visits.status, "draft"),
        lt(visits.createdAt, cutoff),
        inArray(visits.patientId, ownedPatients),
      ),
    )
    .returning({ id: visits.id });

  return deleted.length;
}

// Re-export sql for ad-hoc queries if ever needed downstream.
export { sql };
