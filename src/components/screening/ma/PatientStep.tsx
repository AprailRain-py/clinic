"use client";

import { useEffect, useRef, useState } from "react";
import { SEX_OPTIONS } from "@/lib/screening/oral-form";
import { initials, todayISO } from "./helpers";
import type { SelectedPatient } from "./types";
import { Field, SegControl } from "./StepKit";

type ApiPatient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  mobile: string | null;
};

// Selecting a patient IS the action on this step — tapping a result (or
// registering) advances the flow. There is no separate footer button here, so
// the screen has a single, unambiguous primary action.
export default function PatientStep({
  onPicked,
}: {
  onPicked: (p: SelectedPatient) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");

  const [npName, setNpName] = useState("");
  const [npAge, setNpAge] = useState("");
  const [npSex, setNpSex] = useState("");
  const [npMobile, setNpMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctl;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`, {
          signal: ctl.signal,
        });
        const body = (await res.json()) as { patients?: ApiPatient[] };
        setResults(body.patients ?? []);
      } catch {
        /* aborted or network — ignore */
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  const ageNum = Number.parseInt(npAge, 10);
  const createValid = npName.trim().length > 0 && Number.isFinite(ageNum) && !!npSex;

  async function createPatient() {
    setError(null);
    if (!createValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: npName.trim(),
          age: ageNum,
          gender: npSex,
          mobile: npMobile.trim() || undefined,
          firstVisitDate: todayISO(),
          conditions: [],
          notes: "",
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `http_${res.status}`);
      }
      const p = (await res.json()) as ApiPatient;
      onPicked({ patientId: p.id, name: p.name, age: p.age, gender: p.gender ?? npSex });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register patient.");
    } finally {
      setSaving(false);
    }
  }

  if (mode === "create") {
    return (
      <section className="card p-5 md:p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-medium">New patient</h2>
          <span className="eyebrow">Required</span>
        </div>

        <div className="space-y-5">
          <Field label="Full name">
            <input
              className="input-field"
              value={npName}
              onChange={(e) => setNpName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              autoFocus
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-[7rem_1fr]">
            <Field label="Age">
              <input
                className="input-field font-mono"
                value={npAge}
                onChange={(e) => setNpAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder="54"
              />
            </Field>
            <Field label="Sex">
              <SegControl options={SEX_OPTIONS} value={npSex} onChange={setNpSex} ariaLabel="Sex" />
            </Field>
          </div>

          <Field label="Phone" hint="optional">
            <input
              className="input-field font-mono"
              value={npMobile}
              onChange={(e) => setNpMobile(e.target.value)}
              inputMode="tel"
              placeholder="98250 11234"
            />
          </Field>

          {error ? <p className="text-sm text-[--color-rust]">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-link text-xs"
            onClick={() => {
              setMode("search");
              setError(null);
            }}
          >
            Back to search
          </button>
          <button
            type="button"
            className="btn-primary disabled:opacity-50"
            disabled={!createValid || saving}
            onClick={createPatient}
          >
            {saving ? "Registering…" : "Register & continue"}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[--color-muted-2]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          className="input-field"
          style={{ paddingLeft: 42 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          autoFocus
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="px-1 text-sm text-[--color-muted]">Searching…</p>
        ) : null}
        {!loading && query.trim() && results.length === 0 ? (
          <p className="px-1 text-sm text-[--color-muted]">
            No matches — register a new patient below.
          </p>
        ) : null}

        {results.map((p) => {
          const meta = [`${p.age} yr`, p.gender ?? null, p.mobile ?? null]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onPicked({
                  patientId: p.id,
                  name: p.name,
                  age: p.age,
                  gender: p.gender ?? "other",
                })
              }
              className="card-flat flex w-full items-center gap-4 px-4 py-3 text-left transition hover:border-[--color-pine]"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-pine-soft font-mono text-sm font-semibold text-[--color-pine]">
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[--color-ink]">{p.name}</span>
                <span className="block text-xs text-[--color-muted]">{meta}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-none text-[--color-muted-2]">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setMode("create")}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[--color-rule] bg-card px-4 py-3.5 text-sm font-medium text-[--color-pine] transition hover:border-[--color-pine]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Register new patient
      </button>
    </div>
  );
}
