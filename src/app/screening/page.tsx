import Link from "next/link";
import { AppShell } from "@/components/AppShell";

// Screening landing — lives inside the app shell. Two entry points: start a new
// screening (assistant) or open the doctor's review queue.
export default function ScreeningHomePage() {
  return (
    <AppShell>
      <section className="reveal mb-8">
        <div className="eyebrow">Cancer screening</div>
        <h1 className="font-display mt-1 text-2xl font-medium tracking-tight">
          Screening
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-[--color-muted]">
          Oral cancer screening — a guided questionnaire and photo capture that
          a medical assistant completes, then a doctor reviews and triages.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/screening/new"
          className="card group flex flex-col gap-4 p-6 transition hover:border-[--color-pine]"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[--color-pine] text-[--color-paper]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <div className="font-display text-lg font-medium">Start a screening</div>
            <p className="mt-1 text-sm text-[--color-muted]">
              Capture an oral cancer screening for a patient — risk factors,
              symptoms and guided photos.
            </p>
          </div>
          <span className="btn-link mt-1 text-xs">
            Begin
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </Link>

        <Link
          href="/screening/queue"
          className="card group flex flex-col gap-4 p-6 transition hover:border-[--color-pine]"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[--color-rule] bg-[--color-card] text-[--color-pine]">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <div className="font-display text-lg font-medium">Review queue</div>
            <p className="mt-1 text-sm text-[--color-muted]">
              Doctor worklist — pending screenings triaged High → Low with the
              reasons that fired.
            </p>
          </div>
          <span className="btn-link mt-1 text-xs">
            Open queue
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </Link>
      </div>
    </AppShell>
  );
}
