/**
 * Shared letterhead block used by the real print page AND the settings
 * preview, so the preview stays accurate by construction.
 *
 * This is a pure server component — no hooks, no client-only APIs — so it can
 * be embedded inside either surface. Styling is supplied by the caller's
 * stylesheet (either `print.css` for the real print sheet, or the scoped
 * styles inside `LetterheadPreview` for the settings panel).
 */

export type PrescriptionLetterheadProps = {
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  registrationNumber: string;
  degrees: string[];
  specialty: string;
  timings: string;
};

export function PrescriptionLetterhead({
  doctorName,
  clinicName,
  clinicAddress,
  clinicPhone,
  registrationNumber,
  degrees,
  specialty,
  timings,
}: PrescriptionLetterheadProps) {
  return (
    <header className="rx-letterhead">
      <div className="rx-letterhead-main">
        <div className="rx-clinic-name">{clinicName || "Your Clinic"}</div>
        <div className="rx-doctor-line">
          <span className="rx-doctor-name">
            {doctorName ? `Dr. ${doctorName}` : "Dr. —"}
          </span>
          {degrees.length > 0 ? (
            <span className="rx-doctor-degrees">{degrees.join(", ")}</span>
          ) : null}
        </div>
        {specialty ? <div className="rx-specialty">{specialty}</div> : null}
        {registrationNumber ? (
          <div className="rx-reg">Reg. No. {registrationNumber}</div>
        ) : null}
      </div>
      <div className="rx-letterhead-meta">
        {clinicAddress ? (
          <div className="rx-meta-line">{clinicAddress}</div>
        ) : null}
        {clinicPhone ? (
          <div className="rx-meta-line">Phone: {clinicPhone}</div>
        ) : null}
        {timings ? <div className="rx-meta-line">{timings}</div> : null}
      </div>
    </header>
  );
}
