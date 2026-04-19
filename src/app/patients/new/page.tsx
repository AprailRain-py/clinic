"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientCreateSchema } from "@/lib/validators/patient";
import { ConditionsPicker } from "@/components/ConditionsPicker";

type FormValues = {
  name: string;
  age: number;
  dob?: string;
  firstVisitDate: string;
  notes?: string;
};

export default function NewPatientPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [serverError, setServerError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patientCreateSchema) as any,
    defaultValues: {
      name: "",
      age: 0,
      dob: "",
      firstVisitDate: today,
      notes: "",
    },
  });

  const liveName = watch("name");
  const liveAge = watch("age");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, conditions }),
    });
    if (!res.ok) {
      const text = await res.text();
      setServerError(text || `Request failed: ${res.status}`);
      return;
    }
    const patient = (await res.json()) as { id: string };
    router.push(`/patients/${patient.id}`);
  });

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href="/" className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to directory
        </Link>
        <span className="eyebrow">New record</span>
      </header>

      <main className="container-shell pb-16">
        <div className="reveal mx-auto max-w-3xl">
          <div className="mb-10">
            <div className="eyebrow">Patient intake</div>
            <h1 className="font-display mt-2 text-[clamp(2rem,4vw,3rem)] font-medium leading-tight tracking-tight">
              {liveName ? (
                <>
                  <span className="italic text-[--color-muted]">For </span>
                  {liveName}
                </>
              ) : (
                "A new record."
              )}
            </h1>
            <p className="mt-3 max-w-lg font-display text-lg italic text-[--color-muted]">
              {liveName && liveAge
                ? `Age ${liveAge}. Intake on ${today}.`
                : "Enter the vitals below. Conditions can be updated later."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-10">
            <section className="card p-6 md:p-8">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="font-display text-xl font-medium">Identity</h2>
                <span className="eyebrow">Required</span>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full name" error={errors.name?.message}>
                  <input type="text" {...register("name")} className="input-field" placeholder="Priya Sharma" autoFocus />
                </Field>

                <Field label="Age" error={errors.age?.message}>
                  <input type="number" {...register("age")} className="input-field font-mono" placeholder="34" min={0} />
                </Field>

                <Field label="Date of birth" hint="optional" error={errors.dob?.message}>
                  <input type="date" {...register("dob")} className="input-field font-mono" />
                </Field>

                <Field label="First visit" error={errors.firstVisitDate?.message}>
                  <input type="date" {...register("firstVisitDate")} className="input-field font-mono" />
                </Field>
              </div>
            </section>

            <section className="card p-6 md:p-8">
              <div className="mb-5 flex items-baseline justify-between">
                <div>
                  <h2 className="font-display text-xl font-medium">Category &amp; conditions</h2>
                  <p className="mt-1 text-sm text-[--color-muted]">
                    Pick all that apply. These surface across visits and filter the directory.
                  </p>
                </div>
                <span className="eyebrow">{conditions.length} selected</span>
              </div>
              <ConditionsPicker value={conditions} onChange={setConditions} />
            </section>

            <section className="card p-6 md:p-8">
              <h2 className="font-display text-xl font-medium">Chart notes</h2>
              <p className="mt-1 text-sm text-[--color-muted]">
                Anything you want surfaced on the patient&rsquo;s card. Allergies, family history, referral source.
              </p>
              <textarea
                {...register("notes")}
                rows={4}
                placeholder="e.g. Allergic to penicillin. Family history of cardiac disease."
                className="input-field mt-4 resize-y"
              />
            </section>

            {serverError ? (
              <div className="chip chip-rust">{serverError}</div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Link href="/" className="btn-ghost">
                Cancel
              </Link>
              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
                {isSubmitting ? "Saving..." : "Create record"}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow flex items-baseline justify-between">
        <span>{label}</span>
        {hint ? <span className="normal-case tracking-normal text-[--color-muted-2]">{hint}</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-[--color-rust]">{error}</p>
      ) : null}
    </label>
  );
}
