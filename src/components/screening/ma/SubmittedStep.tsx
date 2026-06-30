"use client";

import { useRouter } from "next/navigation";
import { BandPill } from "@/components/screening/primitives";
import type { Band } from "@/lib/screening";
import type { SelectedPatient } from "./types";

export default function SubmittedStep({
  patient,
  band,
  score,
  onNew,
}: {
  patient: SelectedPatient;
  band: Band;
  score: number;
  onNew: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[--color-pine] bg-pine-soft">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-pine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="font-display mt-6 text-2xl font-medium">Sent to the doctor&rsquo;s queue</h2>
      <p className="mt-2 max-w-xs text-sm text-[--color-muted]">
        Screening for <span className="font-medium text-[--color-ink]">{patient.name}</span> has
        been submitted for review.
      </p>

      <div className="mt-5 flex items-center gap-2">
        <BandPill band={band} />
        <span className="font-mono text-xs text-[--color-muted]">score {score}</span>
      </div>

      <div className="mt-9 flex w-full max-w-xs flex-col gap-2.5">
        <button type="button" className="btn-primary justify-center" onClick={onNew}>
          Start new screening
        </button>
        <button
          type="button"
          className="btn-ghost justify-center"
          onClick={() => router.push("/screening/queue")}
        >
          Open doctor&rsquo;s queue
        </button>
      </div>
    </div>
  );
}
