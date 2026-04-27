"use client";

import type { CSSProperties } from "react";
import { PrescriptionLetterhead } from "@/components/PrescriptionLetterhead";

type Props = {
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  registrationNumber: string;
  degrees: string[];
  specialty: string;
  timings: string;
};

export function LetterheadPreview({
  doctorName,
  clinicName,
  clinicAddress,
  clinicPhone,
  registrationNumber,
  degrees,
  specialty,
  timings,
}: Props) {
  return (
    <div className="lp-shell">
      <div className="lp-frame-meta">
        <span className="eyebrow">Live preview</span>
        <span className="eyebrow text-[--color-muted-2]">A4 · top of page</span>
      </div>

      {/* Render the real PrescriptionLetterhead with the same class names as the
          print sheet; `lp-sheet-rx` scopes the print styles locally so the
          preview is accurate by construction. */}
      <div className="lp-sheet lp-sheet-rx" style={sheetStyle}>
        <div className="lp-corner lp-corner-tl" aria-hidden />
        <div className="lp-corner lp-corner-tr" aria-hidden />

        <PrescriptionLetterhead
          doctorName={doctorName}
          clinicName={clinicName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
          registrationNumber={registrationNumber}
          degrees={degrees}
          specialty={specialty}
          timings={timings}
        />

        <div className="rx-divider" aria-hidden />

        <div className="lp-body-hint">
          <div className="rx-symbol" aria-hidden>℞</div>
          <div className="lp-body-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* Scoped copy of the print letterhead styles. Kept in sync with
          print.css by construction — both surfaces render the same component. */}
      <style>{`
        .lp-shell {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lp-frame-meta {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 0 2px;
        }
        .lp-sheet-rx {
          position: relative;
          background: #fdfcf6;
          border: 1px solid var(--color-rule);
          border-radius: 6px;
          padding: 22px 24px 26px;
          box-shadow:
            0 1px 0 rgba(25, 23, 20, 0.04),
            0 24px 48px -28px rgba(25, 23, 20, 0.22),
            inset 0 0 0 1px rgba(255, 255, 255, 0.6);
          font-family: "Instrument Sans", system-ui, sans-serif;
          color: #1a1a1a;
          overflow: hidden;
        }
        .lp-corner {
          position: absolute;
          width: 10px;
          height: 10px;
          border-color: var(--color-ink);
          border-style: solid;
          border-width: 0;
          opacity: 0.35;
        }
        .lp-corner-tl {
          top: 8px;
          left: 8px;
          border-top-width: 1px;
          border-left-width: 1px;
        }
        .lp-corner-tr {
          top: 8px;
          right: 8px;
          border-top-width: 1px;
          border-right-width: 1px;
        }
        /* rx-* classes scoped to the preview sheet so the real print CSS
           isn't needed on this page. */
        .lp-sheet-rx .rx-letterhead {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 18px;
          align-items: flex-start;
          padding-bottom: 10px;
        }
        .lp-sheet-rx .rx-clinic-name {
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(20px, 2.2vw, 26px);
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.15;
          color: #1a1a1a;
        }
        .lp-sheet-rx .rx-doctor-line {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 10px;
        }
        .lp-sheet-rx .rx-doctor-name {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .lp-sheet-rx .rx-doctor-degrees {
          font-size: 12px;
          color: #3b3b3b;
          letter-spacing: 0.02em;
        }
        .lp-sheet-rx .rx-specialty {
          margin-top: 2px;
          font-size: 12px;
          color: #3b3b3b;
          font-style: italic;
        }
        .lp-sheet-rx .rx-reg {
          margin-top: 3px;
          font-size: 11px;
          color: #6b6b6b;
        }
        .lp-sheet-rx .rx-letterhead-meta {
          text-align: right;
          font-size: 11px;
          color: #3b3b3b;
          line-height: 1.45;
        }
        .lp-sheet-rx .rx-meta-line {
          margin-bottom: 2px;
        }
        .lp-sheet-rx .rx-divider {
          height: 2px;
          background: #1a1a1a;
          margin: 4px 0 12px;
        }
        .lp-sheet-rx .rx-symbol {
          font-family: "Fraunces", Georgia, serif;
          font-size: 40px;
          line-height: 0.9;
          color: var(--color-pine);
          font-weight: 600;
          margin-top: -4px;
        }
        .lp-body-hint {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 10px;
          align-items: start;
          padding-top: 2px;
        }
        .lp-body-lines {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-top: 6px;
        }
        .lp-body-lines span {
          display: block;
          height: 1px;
          background: var(--color-rule);
        }
        .lp-body-lines span:nth-child(1) { width: 78%; }
        .lp-body-lines span:nth-child(2) { width: 90%; }
        .lp-body-lines span:nth-child(3) { width: 62%; }
      `}</style>
    </div>
  );
}

const sheetStyle: CSSProperties = {
  aspectRatio: "210 / 160",
};
