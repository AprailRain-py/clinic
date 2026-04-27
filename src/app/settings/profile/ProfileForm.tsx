"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { DoctorProfile } from "@/lib/db/doctor";
import { LetterheadPreview } from "./LetterheadPreview";

type ProfileFormProps = {
  initial: DoctorProfile | null;
  onboarding: boolean;
  doctorName: string;
};

type Values = {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  registrationNumber: string;
  specialty: string;
  timings: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

const DEGREE_PLACEHOLDERS = [
  "MBBS, MD (Medicine)",
  "MBBS, DNB (General Medicine)",
  "BAMS",
  "MBBS, DGO",
  "BDS, MDS",
  "MBBS, MS (Orthopaedics)",
];

function initialValues(profile: DoctorProfile | null): Values {
  return {
    clinicName: profile?.clinicName ?? "",
    clinicAddress: profile?.clinicAddress ?? "",
    clinicPhone: profile?.clinicPhone ?? "",
    registrationNumber: profile?.registrationNumber ?? "",
    specialty: profile?.specialty ?? "",
    timings: profile?.timings ?? "",
  };
}

export function ProfileForm({ initial, onboarding, doctorName }: ProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initialValues(initial));
  const [degrees, setDegrees] = useState<string[]>(initial?.degrees ?? []);
  const [degreeDraft, setDegreeDraft] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate the degree-input placeholder while empty, so doctors see real
  // examples of the expected format instead of a single frozen hint.
  useEffect(() => {
    if (degrees.length > 0 || degreeDraft.length > 0) return;
    const id = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % DEGREE_PLACEHOLDERS.length),
      2400,
    );
    return () => clearInterval(id);
  }, [degrees.length, degreeDraft.length]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (status.kind === "saved" || status.kind === "error") {
      setStatus({ kind: "idle" });
    }
  }

  function addDegree(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) return;
    if (degrees.includes(trimmed)) {
      setDegreeDraft("");
      return;
    }
    if (degrees.length >= 10) return;
    setDegrees((prev) => [...prev, trimmed]);
    setDegreeDraft("");
  }

  function removeDegree(value: string) {
    setDegrees((prev) => prev.filter((d) => d !== value));
  }

  function onDegreeKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDegree(degreeDraft);
    } else if (
      e.key === "Backspace" &&
      degreeDraft === "" &&
      degrees.length > 0
    ) {
      setDegrees((prev) => prev.slice(0, -1));
    }
  }

  const readiness = useMemo(() => {
    const hasClinic = values.clinicName.trim().length > 0;
    const hasReg = values.registrationNumber.trim().length > 0;
    const hasDegree =
      degrees.length > 0 || degreeDraft.trim().length > 0;
    const count = [hasClinic, hasReg, hasDegree].filter(Boolean).length;
    return { hasClinic, hasReg, hasDegree, count, ready: count === 3 };
  }, [values.clinicName, values.registrationNumber, degrees.length, degreeDraft]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "saving" });

    const finalDegrees =
      degreeDraft.trim() && degrees.length < 10 && !degrees.includes(degreeDraft.trim())
        ? [...degrees, degreeDraft.trim()]
        : degrees;

    const body = {
      clinicName: values.clinicName.trim() || null,
      clinicAddress: values.clinicAddress.trim() || null,
      clinicPhone: values.clinicPhone.trim() || null,
      registrationNumber: values.registrationNumber.trim() || null,
      degrees: finalDegrees,
      specialty: values.specialty.trim() || null,
      timings: values.timings.trim() || null,
      signatureDataUrl: initial?.signatureDataUrl ?? null,
    };

    try {
      const res = await fetch("/api/doctor", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        setStatus({
          kind: "error",
          message: text || `Save failed: ${res.status}`,
        });
        return;
      }
      setDegrees(finalDegrees);
      setDegreeDraft("");

      if (onboarding) {
        router.push("/");
        return;
      }

      setStatus({ kind: "saved", at: Date.now() });
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => {
        setStatus((s) => (s.kind === "saved" ? { kind: "idle" } : s));
      }, 2500);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  const degreesExceeded = degrees.length >= 10;
  const submitDisabled =
    status.kind === "saving" || (onboarding && !readiness.ready);

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-8">
        <RequiredSection
          number="I"
          title="The essentials"
          eyebrow="Required · Appears on every prescription"
        >
          <Field
            label="Clinic name"
            required
            satisfied={readiness.hasClinic}
          >
            <input
              type="text"
              value={values.clinicName}
              onChange={(e) => update("clinicName", e.target.value)}
              maxLength={200}
              placeholder="Arthik Family Clinic"
              className="input-field"
              autoComplete="organization"
            />
          </Field>

          <Field
            label="Registration number"
            hint="MCI / state council"
            required
            satisfied={readiness.hasReg}
          >
            <input
              type="text"
              value={values.registrationNumber}
              onChange={(e) => update("registrationNumber", e.target.value)}
              maxLength={50}
              placeholder="MCI-12345"
              className="input-field font-mono"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Degrees"
            hint={
              degreesExceeded
                ? "max reached"
                : `${degrees.length}/10 · press Enter or comma`
            }
            required
            satisfied={readiness.hasDegree}
          >
            <div
              className="input-field flex flex-wrap items-center gap-1.5"
              style={{ minHeight: "2.6rem" }}
            >
              {degrees.map((d) => (
                <span
                  key={d}
                  className="group inline-flex items-center gap-1 rounded-full border border-[--color-rule] bg-[--color-paper-2] px-2.5 py-1 text-[13px] font-medium text-[--color-ink]"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDegree(d)}
                    aria-label={`Remove ${d}`}
                    className="ml-0.5 -mr-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[--color-muted] transition-colors hover:bg-[--color-rust] hover:text-[--color-paper]"
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                      <path
                        d="M3 3l6 6M9 3l-6 6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={degreeDraft}
                onChange={(e) => setDegreeDraft(e.target.value)}
                onKeyDown={onDegreeKeyDown}
                onBlur={() => addDegree(degreeDraft)}
                maxLength={100}
                disabled={degreesExceeded}
                placeholder={
                  degrees.length === 0
                    ? DEGREE_PLACEHOLDERS[placeholderIdx]
                    : degrees.length < 10
                      ? "Add another…"
                      : ""
                }
                className="min-w-[10rem] flex-1 bg-transparent text-[14px] outline-none placeholder:text-[--color-muted-2] disabled:cursor-not-allowed"
              />
            </div>
          </Field>
        </RequiredSection>

        <RequiredSection
          number="II"
          title="Niceties"
          eyebrow="Optional · Enhances your letterhead"
          muted
        >
          <Field label="Specialty">
            <input
              type="text"
              value={values.specialty}
              onChange={(e) => update("specialty", e.target.value)}
              maxLength={100}
              placeholder="General Physician"
              className="input-field"
            />
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={values.clinicPhone}
              onChange={(e) => update("clinicPhone", e.target.value)}
              maxLength={30}
              placeholder="+91 98765 43210"
              className="input-field font-mono"
              autoComplete="tel"
            />
          </Field>

          <Field label="Clinic address">
            <textarea
              value={values.clinicAddress}
              onChange={(e) => update("clinicAddress", e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Street, city, PIN"
              className="input-field resize-y"
            />
          </Field>

          <Field label="Timings" hint="free-text, any format">
            <textarea
              value={values.timings}
              onChange={(e) => update("timings", e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Mon–Sat 10am–1pm, 5pm–8pm"
              className="input-field resize-y"
            />
          </Field>
        </RequiredSection>

        <div className="divider-thin" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Readiness
            onboarding={onboarding}
            count={readiness.count}
            ready={readiness.ready}
            status={status}
          />

          <div className="flex items-center gap-3">
            {status.kind === "error" ? (
              <span className="chip chip-rust max-w-[22rem] truncate normal-case tracking-normal">
                {status.message}
              </span>
            ) : null}
            <button
              type="submit"
              disabled={submitDisabled}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.kind === "saving"
                ? onboarding
                  ? "Saving…"
                  : "Saving…"
                : onboarding
                  ? "Save and continue"
                  : "Save changes"}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-8">
        <LetterheadPreview
          doctorName={doctorName}
          clinicName={values.clinicName}
          clinicAddress={values.clinicAddress}
          clinicPhone={values.clinicPhone}
          registrationNumber={values.registrationNumber}
          degrees={
            degreeDraft.trim() && !degrees.includes(degreeDraft.trim())
              ? [...degrees, degreeDraft.trim()]
              : degrees
          }
          specialty={values.specialty}
          timings={values.timings}
        />
      </aside>
    </form>
  );
}

function RequiredSection({
  number,
  title,
  eyebrow,
  children,
  muted = false,
}: {
  number: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={muted ? "card-flat p-6 md:p-7" : "card p-6 md:p-8"}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-display text-[22px] italic leading-none text-[--color-ochre]"
          >
            {number}
          </span>
          <div>
            <h2 className="font-display text-xl font-medium leading-tight">
              {title}
            </h2>
            <div className="eyebrow mt-1">{eyebrow}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  satisfied,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  satisfied?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5">
          {required ? (
            <span
              aria-hidden
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                satisfied ? "bg-[--color-pine]" : "bg-[--color-ochre]"
              }`}
            />
          ) : null}
          <span>{label}</span>
          {required ? (
            <span className="sr-only">(required)</span>
          ) : null}
        </span>
        {hint ? (
          <span className="normal-case tracking-normal text-[--color-muted-2]">
            {hint}
          </span>
        ) : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Readiness({
  onboarding,
  count,
  ready,
  status,
}: {
  onboarding: boolean;
  count: number;
  ready: boolean;
  status: Status;
}) {
  if (!onboarding) {
    return (
      <div className="flex items-center gap-2">
        <SavedPulse visible={status.kind === "saved"} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-6 rounded-full transition-colors duration-300"
            style={{
              background:
                i < count
                  ? ready
                    ? "var(--color-pine)"
                    : "var(--color-ochre)"
                  : "var(--color-rule)",
            }}
          />
        ))}
      </div>
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
          ready ? "text-[--color-pine]" : "text-[--color-muted]"
        }`}
      >
        {count} of 3 required {count === 1 ? "field" : "fields"} ready
      </span>
    </div>
  );
}

function SavedPulse({ visible }: { visible: boolean }) {
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[--color-pine] transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M3 8.5l3.2 3L13 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      Saved just now
    </span>
  );
}
