"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listQueue, type QueueRow } from "@/lib/screening/client";
import { SegTab } from "@/components/screening/primitives";
import type { Band, FiredFactor } from "@/lib/screening";

type QueueData = {
  screenings: QueueRow[];
  counts: { high: number; moderate: number; low: number };
};

const BAND_LABEL: Record<Band, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

function parseReasons(json: string | null): FiredFactor[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as FiredFactor[]) : [];
  } catch {
    return [];
  }
}

// Prefer the tier-bearing (clinical) reasons; fall back to any modifiers.
function topReasons(row: QueueRow): FiredFactor[] {
  const reasons = parseReasons(row.firedReasons);
  const tiered = reasons.filter((r) => r.tier);
  return (tiered.length ? tiered : reasons).slice(0, 2);
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CountTile({
  count,
  label,
  band,
}: {
  count: number;
  label: string;
  band: Band;
}) {
  const fg =
    band === "high"
      ? "var(--hi-fg)"
      : band === "moderate"
        ? "var(--md-fg)"
        : "var(--lo-fg)";
  const bg =
    band === "high"
      ? "var(--hi-bg)"
      : band === "moderate"
        ? "var(--md-bg)"
        : "var(--lo-bg)";
  const bd =
    band === "high"
      ? "var(--hi-bd)"
      : band === "moderate"
        ? "var(--md-bd)"
        : "var(--lo-bd)";
  return (
    <div
      style={{
        flex: 1,
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: 12,
        padding: "11px 13px",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: fg }}>{count}</div>
      <div
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: fg,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function QueuePage() {
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listQueue(status)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load the queue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const rows = data?.screenings ?? [];
  const counts = data?.counts ?? { high: 0, moderate: 0, low: 0 };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 18px 48px" }}>
      <div className="eyebrow" style={{ color: "var(--tl)" }}>
        Review queue
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 9,
          marginTop: 6,
        }}
      >
        <span className="scr-title" style={{ fontSize: 26 }}>
          {rows.length} {status === "pending" ? "pending" : "total"}
        </span>
        <span className="scr-sub">· sorted High → Low</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <CountTile count={counts.high} label="High" band="high" />
        <CountTile count={counts.moderate} label="Moderate" band="moderate" />
        <CountTile count={counts.low} label="Low" band="low" />
      </div>

      <div
        style={{
          display: "inline-flex",
          background: "#fff",
          border: "1px solid var(--line-2)",
          borderRadius: 11,
          padding: 3,
          gap: 2,
          marginTop: 16,
        }}
      >
        <SegTab on={status === "pending"} onClick={() => setStatus("pending")}>
          Pending
        </SegTab>
        <SegTab on={status === "all"} onClick={() => setStatus("all")}>
          All
        </SegTab>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        {loading && <div className="scr-sub">Loading…</div>}
        {error && (
          <div className="scr-sub" style={{ color: "var(--hi-fg)" }}>
            {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="card" style={{ padding: 18 }}>
            <div className="scr-sub">No screenings in this view.</div>
          </div>
        )}

        {rows.map((row) => {
          const band: Band = row.riskBand ?? "low";
          const reasons = topReasons(row);
          const meta = [
            `${row.patientAge} yrs`,
            row.patientGender ?? null,
            formatDate(row.screeningDate),
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <Link
              key={row.id}
              href={`/screening/${row.id}`}
              className="dcase"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className={`accent ${band}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {row.patientName}
                  </span>
                  <span className={`bandpill ${band}`}>
                    {BAND_LABEL[band]} · {row.riskScore ?? 0}
                  </span>
                </div>
                <div className="scr-sub" style={{ fontSize: 12, marginTop: 3 }}>
                  {meta}
                </div>
                {reasons.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {reasons.map((r) => (
                      <span
                        key={r.id}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--ink-2)",
                          background: "var(--screen)",
                          border: "1px solid var(--line)",
                          padding: "4px 9px",
                          borderRadius: 7,
                        }}
                      >
                        {r.reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
