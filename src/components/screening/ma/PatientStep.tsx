"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/screening/primitives";
import { SEX_OPTIONS } from "@/lib/screening/oral-form";
import { initials, todayISO } from "./helpers";
import type { SelectedPatient } from "./types";

type ApiPatient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  mobile: string | null;
};

const labelStyle: React.CSSProperties = {
  font: "600 11px var(--ip-mono), monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--faint)",
  marginBottom: 7,
};

export default function PatientStep({
  selected,
  onSelect,
}: {
  selected: SelectedPatient | null;
  onSelect: (p: SelectedPatient) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // New-patient form
  const [npName, setNpName] = useState("");
  const [npAge, setNpAge] = useState("");
  const [npSex, setNpSex] = useState<string>("");
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

  async function createPatient() {
    setError(null);
    const ageNum = Number.parseInt(npAge, 10);
    if (!npName.trim()) return setError("Enter the patient's name.");
    if (!Number.isFinite(ageNum)) return setError("Enter a valid age.");
    if (!npSex) return setError("Select a sex.");
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
      onSelect({
        patientId: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender ?? npSex,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register patient.");
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ font: "600 16px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
          New patient
        </div>
        <div>
          <div style={labelStyle}>Full name</div>
          <input
            className="field"
            value={npName}
            onChange={(e) => setNpName(e.target.value)}
            placeholder="e.g. Ramesh Patel"
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 96 }}>
            <div style={labelStyle}>Age</div>
            <input
              className="field"
              value={npAge}
              onChange={(e) => setNpAge(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="54"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Sex</div>
            <div style={{ display: "flex", gap: 8 }}>
              {SEX_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  sex
                  on={npSex === o.value}
                  onClick={() => setNpSex(o.value)}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div style={labelStyle}>Phone</div>
          <input
            className="field"
            value={npMobile}
            onChange={(e) => setNpMobile(e.target.value)}
            inputMode="tel"
            placeholder="98250 11234"
          />
        </div>
        {error && (
          <div style={{ color: "var(--hi-fg)", fontSize: 13 }}>{error}</div>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={createPatient}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Register & select"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            setError(null);
          }}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            color: "var(--muted)",
            font: "500 13px var(--ip-sans), sans-serif",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "4px 0",
          }}
        >
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--faint)",
            display: "flex",
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          className="field"
          style={{ paddingLeft: 42 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or phone"
        />
      </div>

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "4px 2px 10px" }}>
          Searching…
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "4px 2px 10px" }}>
          No matches — register a new patient below.
        </div>
      )}

      {results.map((p) => {
        const on = selected?.patientId === p.id;
        const meta = [`${p.age}`, p.gender ?? "—", p.mobile ?? ""]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={p.id}
            className={`pres${on ? " on" : ""}`}
            style={{ marginBottom: 10 }}
            onClick={() =>
              onSelect({
                patientId: p.id,
                name: p.name,
                age: p.age,
                gender: p.gender ?? "other",
              })
            }
          >
            <div
              style={{
                width: 42,
                height: 42,
                flex: "none",
                borderRadius: "50%",
                background: "var(--tl-50)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "600 15px var(--ip-sans), sans-serif",
                color: "var(--tl)",
              }}
            >
              {initials(p.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 15px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
                {p.name}
              </div>
              <div style={{ font: "400 12px var(--ip-sans), sans-serif", color: "var(--muted)", marginTop: 2 }}>
                {meta}
              </div>
            </div>
            {on && (
              <span style={{ color: "var(--tl)", display: "flex" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setCreating(true)}
        style={{
          width: "100%",
          marginTop: 6,
          padding: 15,
          border: "1.5px dashed #c7d2d3",
          borderRadius: 13,
          background: "#fff",
          font: "600 14px var(--ip-sans), sans-serif",
          color: "var(--tl)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Register new patient
      </button>
    </div>
  );
}
