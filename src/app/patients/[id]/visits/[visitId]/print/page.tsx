import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visitImages, visits } from "@/lib/db/schema";
import type { PrescriptionDocument } from "@/components/prescription-editor/types";
import {
  describeDosing,
  MEAL_TIMING_LABELS,
  normalizeItem,
} from "@/components/prescription-editor/dosing";
import { getDoctorProfile } from "@/lib/db/doctor";
import { PrescriptionLetterhead } from "@/components/PrescriptionLetterhead";
import { AutoPrint, PrintButton, PhotosToggle } from "./AutoPrint";
import "./print.css";

export const dynamic = "force-dynamic";

type Params = { id: string; visitId: string };
type Search = { auto?: string; photos?: string };

function parsePrescription(raw: string): PrescriptionDocument {
  try {
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      freeText: typeof parsed?.freeText === "string" ? parsed.freeText : "",
    };
  } catch {
    return { items: [], freeText: "" };
  }
}

export default async function PrintVisitPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id, visitId } = await params;
  const sp = await searchParams;
  const autoPrint = sp?.auto === "1";
  const includePhotos = sp?.photos !== "0";

  const [row] = await db
    .select({ visit: visits, patient: patients })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(
      and(
        eq(visits.id, visitId),
        eq(patients.id, id),
        eq(patients.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const doc = parsePrescription(row.visit.prescription);
  const profile = await getDoctorProfile(session.user.id);

  const photos = await db
    .select({
      id: visitImages.id,
      createdAt: visitImages.createdAt,
    })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.visitId, row.visit.id),
        eq(visitImages.userId, session.user.id),
      ),
    )
    .orderBy(asc(visitImages.position), asc(visitImages.id));

  const doctorName = session.user.name ?? "";
  const clinicName = profile?.clinicName ?? "";
  const degrees = profile?.degrees ?? [];
  const specialty = profile?.specialty ?? "";
  const registration = profile?.registrationNumber ?? "";
  const clinicAddress = profile?.clinicAddress ?? "";
  const clinicPhone = profile?.clinicPhone ?? "";
  const timings = profile?.timings ?? "";
  const signature = profile?.signatureDataUrl ?? "";

  const profileIncomplete =
    !profile ||
    !profile.clinicName ||
    !profile.registrationNumber ||
    !profile.clinicAddress;

  const signatureMissing = !signature;

  return (
    <div className="rx-print-root">
      {autoPrint ? <AutoPrint /> : null}

      {signatureMissing ? (
        <div
          className="rx-preview-banner rx-preview-banner-info"
          data-testid="rx-signature-missing-banner"
        >
          <div>
            <strong>No signature image uploaded.</strong>{" "}
            Prescriptions will print with a handwritten-signature line instead.
          </div>
          <Link href="/settings/profile" className="rx-preview-banner-link">
            Add signature in Settings →
          </Link>
        </div>
      ) : null}

      {profileIncomplete ? (
        <div
          className="rx-preview-banner rx-preview-banner-soft"
          data-testid="rx-profile-incomplete-banner"
        >
          <div>
            Some clinic fields are missing. The prescription will still print,
            but{" "}
            <Link href="/settings/profile" className="rx-preview-banner-link">
              complete your profile
            </Link>{" "}
            to add them.
          </div>
        </div>
      ) : null}

      <article className="rx-sheet">
        <PrescriptionLetterhead
          doctorName={doctorName}
          clinicName={clinicName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
          registrationNumber={registration}
          degrees={degrees}
          specialty={specialty}
          timings={timings}
        />

        <div className="rx-divider" aria-hidden />

        <section className="rx-patient-block">
          <div className="rx-patient-row">
            <div className="rx-field rx-field-grow">
              <span className="rx-field-label">Patient</span>
              <span className="rx-field-value">{row.patient.name}</span>
            </div>
            <div className="rx-field">
              <span className="rx-field-label">Age</span>
              <span className="rx-field-value">{row.patient.age} yr</span>
            </div>
            <div className="rx-field">
              <span className="rx-field-label">Date</span>
              <span className="rx-field-value">{row.visit.visitDate}</span>
            </div>
            <div className="rx-field">
              <span className="rx-field-label">Visit ID</span>
              <span className="rx-field-value rx-field-mono">
                {row.visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </section>

        <section className="rx-body">
          <div className="rx-symbol" aria-hidden>
            ℞
          </div>
          <div className="rx-body-content">
            {doc.items.length === 0 ? (
              <p className="rx-empty">No medicines prescribed.</p>
            ) : (
              <table className="rx-table">
                <thead>
                  <tr>
                    <th className="rx-col-num">#</th>
                    <th className="rx-col-med">Medicine</th>
                    <th className="rx-col-comp">Composition</th>
                    <th className="rx-col-freq">Frequency</th>
                    <th className="rx-col-dur">Duration</th>
                    <th className="rx-col-notes">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((rawIt, idx) => {
                    const it = normalizeItem(rawIt);
                    const mealLabel =
                      it.mealTiming && it.mealTiming !== null
                        ? MEAL_TIMING_LABELS[it.mealTiming]
                        : null;
                    return (
                      <tr key={idx}>
                        <td className="rx-col-num">{idx + 1}</td>
                        <td className="rx-col-med">
                          <div className="rx-med-brand">{it.brand}</div>
                          <div className="rx-med-meta">
                            {[it.form, it.strength]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </td>
                        <td className="rx-col-comp">
                          {it.composition ?? it.generic ?? "—"}
                        </td>
                        <td className="rx-col-freq">
                          <div className="rx-freq-tag">{describeDosing(it)}</div>
                          {mealLabel ? (
                            <div className="rx-freq-detail">{mealLabel}</div>
                          ) : null}
                        </td>
                        <td className="rx-col-dur">{it.durationDays} d</td>
                        <td className="rx-col-notes">{it.notes ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {doc.freeText ? (
              <div className="rx-notes">
                <div className="rx-notes-label">Advice / Notes</div>
                <p className="rx-notes-body">{doc.freeText}</p>
              </div>
            ) : null}

            {photos.length > 0 && includePhotos ? (
              <section className="rx-photos" data-photos-section>
                <div className="rx-photos-label">Attached photos</div>
                <div className="rx-photos-grid">
                  {photos.map((p) => (
                    <figure key={p.id} className="rx-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/visits/${row.visit.id}/images/${p.id}`}
                        alt="Attached prescription photo"
                      />
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <footer className="rx-footer">
          <div className="rx-footer-left">
            <div className="rx-footer-hint">
              Valid only as a medical record for the named patient above.
            </div>
          </div>
          <div className="rx-signature">
            {signature ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={signature}
                alt="Signature"
                className="rx-signature-img"
              />
            ) : (
              <div className="rx-signature-placeholder" aria-hidden />
            )}
            <div className="rx-signature-line" />
            <div className="rx-signature-name">
              {doctorName ? `Dr. ${doctorName}` : "Attending physician"}
            </div>
            {registration ? (
              <div className="rx-signature-reg">Reg. No. {registration}</div>
            ) : null}
          </div>
        </footer>
      </article>

      <div className="rx-preview-toolbar" data-testid="rx-preview-toolbar">
        <Link
          href={`/patients/${row.patient.id}/visits/${row.visit.id}`}
          className="rx-toolbar-btn"
        >
          ← Back to visit
        </Link>
        <div className="rx-toolbar-spacer" />
        {photos.length > 0 ? <PhotosToggle initial={includePhotos} /> : null}
        <PrintButton />
      </div>
    </div>
  );
}
