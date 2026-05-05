import Link from "next/link";
import { PatientForm } from "@/components/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href="/" className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="m15 18-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to directory
        </Link>
        <span className="eyebrow">New record</span>
      </header>

      <main className="container-shell pb-16">
        <div className="reveal mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="eyebrow">Patient intake</div>
            <h1 className="font-display mt-1 text-2xl font-medium tracking-tight">
              New patient
            </h1>
            <p className="mt-2 max-w-lg text-sm text-[--color-muted]">
              Name, age, and today&rsquo;s date are enough to get started.
              Conditions and chart notes can be updated later.
            </p>
          </div>

          <PatientForm mode="create" cancelHref="/" />
        </div>
      </main>
    </div>
  );
}
