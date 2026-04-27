"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PatientRow } from "@/lib/db/schema";
import { ConditionChip } from "@/components/ConditionChip";
import { CONDITIONS, parseConditions } from "@/lib/conditions";

type Enriched = PatientRow & { visitCount: number; lastVisit: string };

export function PatientDirectory({
  patients,
  autoFocusSearch = false,
}: {
  patients: Enriched[];
  autoFocusSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const parsed = useMemo(
    () =>
      patients.map((p) => ({
        ...p,
        conditionList: parseConditions(p.conditions),
      })),
    [patients],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return parsed.filter((p) => {
      if (filter && !p.conditionList.includes(filter)) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.conditionList.some((c) => c.toLowerCase().includes(needle))
      );
    });
  }, [parsed, q, filter]);

  // Only show filter chips for conditions that exist among this doctor's patients
  const available = useMemo(() => {
    const s = new Set<string>();
    parsed.forEach((p) => p.conditionList.forEach((c) => s.add(c)));
    return CONDITIONS.filter((c) => s.has(c.slug));
  }, [parsed]);

  return (
    <div>
      <div className="card-flat flex items-stretch gap-3 p-2 pl-4">
        <svg viewBox="0 0 24 24" fill="none" className="mt-2.5 h-4 w-4 text-[--color-muted]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or condition. Press / to focus."
          aria-label="Search patients"
          className="flex-1 bg-transparent py-2 text-sm text-[--color-ink] placeholder:text-[--color-muted-2] focus:outline-none"
        />
        {(q || filter) && (
          <button
            type="button"
            className="btn-ghost py-1.5 text-xs"
            onClick={() => {
              setQ("");
              setFilter(null);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {available.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="eyebrow mr-1 self-center">Filter</span>
          {available.map((c) => {
            const active = filter === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setFilter(active ? null : c.slug)}
                className={`chip transition ${
                  active
                    ? "bg-[--color-ink] text-[--color-paper] border-[--color-ink]"
                    : "hover:bg-[--color-paper-2]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
            <div className="eyebrow">No records</div>
            <p className="text-[--color-muted]">
              {patients.length === 0
                ? "The directory is empty."
                : "No patients match that query."}
            </p>
            {patients.length === 0 ? (
              <Link href="/patients/new" className="btn-primary mt-3">
                Add first patient
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-[--color-rule] border-y border-[--color-rule]">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/patients/${p.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 py-4 transition hover:bg-[--color-card]/60"
                >
                  <span className="font-mono text-xs tabular-nums text-[--color-muted-2]">
                    {(p.name.split(" ").map((s) => s[0]).join("") || "?")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="truncate font-display text-lg font-medium group-hover:text-[--color-pine]">
                        {p.name}
                      </span>
                      <span className="font-mono text-xs text-[--color-muted]">
                        {p.age} yr
                      </span>
                    </div>
                    {p.conditionList.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.conditionList.slice(0, 4).map((slug) => (
                          <ConditionChip key={slug} slug={slug} size="sm" />
                        ))}
                        {p.conditionList.length > 4 ? (
                          <span className="chip text-[10px] py-[1px] px-2">
                            +{p.conditionList.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="eyebrow">Last seen</div>
                    <div className="font-mono text-xs text-[--color-ink]">
                      {p.lastVisit}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[--color-muted]">
                      {p.visitCount} {p.visitCount === 1 ? "visit" : "visits"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
