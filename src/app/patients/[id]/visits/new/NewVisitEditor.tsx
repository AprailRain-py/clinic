"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PrescriptionEditor,
  type Medicine,
  type PrescriptionDocument,
} from "@/components/prescription-editor";
import { PhotoAttacher } from "@/components/PhotoAttacher";
import { useAutosave } from "@/components/useAutosave";

export function NewVisitEditor({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [visitDate, setVisitDate] = useState(today);
  const [doc, setDoc] = useState<PrescriptionDocument>({
    items: [],
    freeText: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Draft-visit lifecycle ----------------------------------------------
  // A draft visit is created lazily on the first "persistent" user action:
  // either the first medicine row, OR the first photo-attach intent. We cache
  // the id in state; ensureDraft() is idempotent (returns the cached id).
  const [draftVisitId, setDraftVisitId] = useState<string | null>(null);
  const draftInFlightRef = useRef<Promise<string> | null>(null);

  const ensureDraft = useCallback(async (): Promise<string> => {
    if (draftVisitId) return draftVisitId;
    if (draftInFlightRef.current) return draftInFlightRef.current;

    const promise = (async () => {
      const res = await fetch("/api/visits/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, visitDate }),
      });
      if (!res.ok) {
        const msg = (await res.text()) || `draft_failed_${res.status}`;
        throw new Error(msg);
      }
      const body = (await res.json()) as { visitId: string };
      setDraftVisitId(body.visitId);
      return body.visitId;
    })();

    draftInFlightRef.current = promise;
    try {
      const id = await promise;
      return id;
    } finally {
      draftInFlightRef.current = null;
    }
  }, [draftVisitId, patientId, visitDate]);

  // Auto-create the draft the moment the first medicine lands in the doc.
  useEffect(() => {
    if (doc.items.length > 0 && !draftVisitId && !draftInFlightRef.current) {
      ensureDraft().catch((err) => {
        // Don't surface to the user yet — they can still save; we'll retry on save.
        // eslint-disable-next-line no-console
        console.warn("draft creation failed, will retry on save", err);
      });
    }
  }, [doc.items.length, draftVisitId, ensureDraft]);

  // ---- Autosave -----------------------------------------------------------
  // Once a draft exists, debounce-PATCH the Rx doc every ~3 seconds of idle.
  // Note: the API's PATCH handler flips status → "final"; that's acceptable
  // here because this Phase 6 work explicitly forbids new/changed API routes.
  const autosaveValue = useMemo(
    () => ({ visitDate, prescription: doc }),
    [visitDate, doc],
  );

  const autosave = useAutosave({
    value: autosaveValue,
    enabled: !!draftVisitId,
    delayMs: 3000,
    save: async (v) => {
      if (!draftVisitId) return;
      const res = await fetch(`/api/visits/${draftVisitId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const msg = (await res.text()) || `autosave_failed_${res.status}`;
        throw new Error(msg);
      }
    },
  });

  const searchMedicines = useCallback(
    async (query: string, opts?: { form?: string; system?: string }) => {
      const qs = new URLSearchParams();
      if (query) qs.set("q", query);
      if (opts?.form) qs.set("form", opts.form);
      if (opts?.system) qs.set("system", opts.system);
      const res = await fetch(`/api/medicines/search?${qs.toString()}`);
      if (!res.ok) return [];
      return (await res.json()) as Medicine[];
    },
    [],
  );

  // Save-gate: a visit is valid if ANY of these has content — a photo (proxied
  // by the draft existing, since photos only attach to a draft), a free-text
  // note, or at least one structured medicine row. If the doctor DID add
  // structured rows, every row must still have `dosing` picked (safety — don't
  // let half-filled Rx go out).
  const offendingBrands = useMemo(
    () =>
      doc.items
        .filter((it) => it.dosing === null || it.dosing === undefined)
        .map((it) => it.brand),
    [doc.items],
  );

  const hasAnyContent =
    doc.items.length > 0 ||
    doc.freeText.trim().length > 0 ||
    draftVisitId !== null;
  const canSave = hasAnyContent && offendingBrands.length === 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      // Two save paths:
      //  1) No draft yet → traditional POST /api/patients/:id/visits (final from the start).
      //  2) Draft exists (photo attached or medicine triggered) → PATCH /api/visits/:id
      //     to finalize.
      if (draftVisitId) {
        const res = await fetch(`/api/visits/${draftVisitId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visitDate, prescription: doc }),
        });
        if (!res.ok) {
          setError((await res.text()) || `Request failed: ${res.status}`);
          return;
        }
        router.push(`/patients/${patientId}/visits/${draftVisitId}`);
      } else {
        const res = await fetch(`/api/patients/${patientId}/visits`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visitDate, prescription: doc }),
        });
        if (!res.ok) {
          setError((await res.text()) || `Request failed: ${res.status}`);
          return;
        }
        const visit = (await res.json()) as { id: string };
        router.push(`/patients/${patientId}/visits/${visit.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const itemCount = doc.items.length;

  return (
    <div className="reveal space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="card flex flex-wrap items-end justify-between gap-5 p-5">
        <label className="block">
          <span className="eyebrow">Visit date</span>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="input-field mt-1.5 font-mono"
          />
        </label>

        <div className="text-right">
          <div className="eyebrow">Composed</div>
          <div className="text-sm text-[--color-muted]">
            {itemCount === 0 && doc.freeText.length === 0 && !draftVisitId
              ? "Attach a photo, write a note, or add a medicine"
              : itemCount === 0
                ? `${doc.freeText.length} chars note${draftVisitId ? " · photos attached" : ""}`
                : `${itemCount} ${itemCount === 1 ? "medicine" : "medicines"} · ${doc.freeText.length} chars`}
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <div className="mb-6 flex items-baseline justify-between border-b border-[--color-rule] pb-4">
          <div>
            <div className="eyebrow">Prescription</div>
            <h2 className="font-display text-xl font-medium">
              Prescription for{" "}
              <span className="italic">{patientName.split(" ")[0]}</span>
            </h2>
          </div>
        </div>
        <PrescriptionEditor
          searchMedicines={searchMedicines}
          onChange={setDoc}
        />
      </div>

      {/* Photos: only show the real attacher once a draft visit exists.
          Before that, a muted affordance tells the doctor what to do. */}
      <DraftPhotoAttacher
        draftVisitId={draftVisitId}
        ensureDraft={ensureDraft}
      />

      {error ? (
        <div className="chip chip-rust inline-flex items-center px-3 py-1.5 text-xs">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center justify-end gap-3">
          <AutosaveIndicator
            status={autosave.status}
            lastSavedAt={autosave.lastSavedAt}
          />
          <Link href={`/patients/${patientId}`} className="btn-ghost">
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            data-testid="save-prescription"
            className="btn-primary disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save prescription"}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {!saving && offendingBrands.length > 0 ? (
          <div
            className="font-mono text-[11px] text-[--color-muted]"
            data-testid="save-hint"
          >
            Pick frequency for: {offendingBrands.join(", ")}
          </div>
        ) : null}
        {!saving && !hasAnyContent ? (
          <div
            className="font-mono text-[11px] text-[--color-muted]"
            data-testid="save-hint-empty"
          >
            Attach a photo, write a note, or add a medicine to save.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AutosaveIndicator({
  status,
  lastSavedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
}) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span
        data-testid="autosave-indicator"
        data-status="saving"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[--color-muted]"
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-[--color-muted]"
        />
        Saving…
      </span>
    );
  }
  if (status === "saved" && lastSavedAt) {
    const hh = String(lastSavedAt.getHours()).padStart(2, "0");
    const mm = String(lastSavedAt.getMinutes()).padStart(2, "0");
    return (
      <span
        data-testid="autosave-indicator"
        data-status="saved"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[--color-muted]"
      >
        Saved · {hh}:{mm}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        data-testid="autosave-indicator"
        data-status="error"
        className="font-mono text-[11px] text-[--color-muted]"
        title="Autosave failed; manual save still works."
      >
        Couldn't autosave — your work is safe; try saving manually.
      </span>
    );
  }
  return null;
}

/**
 * Wraps PhotoAttacher so photos can be attached BEFORE the Rx is saved.
 *
 * Until a draft exists, the user sees a muted affordance. On click, we create
 * the draft, then render the real PhotoAttacher with the draft id. The user's
 * first intent ("add photo") is NOT lost — the attacher mounts with an id so
 * its next click opens the file picker normally.
 */
function DraftPhotoAttacher({
  draftVisitId,
  ensureDraft,
}: {
  draftVisitId: string | null;
  ensureDraft: () => Promise<string>;
}) {
  const [creating, setCreating] = useState(false);

  if (draftVisitId) {
    return <PhotoAttacher visitId={draftVisitId} initial={[]} />;
  }

  return (
    <section className="mt-10" data-testid="photo-attacher-placeholder">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="eyebrow">Prescription photos</div>
      </div>
      <button
        type="button"
        disabled={creating}
        onClick={async () => {
          setCreating(true);
          try {
            await ensureDraft();
          } finally {
            setCreating(false);
          }
        }}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[--color-rule] bg-[--color-card] px-6 py-10 text-center transition hover:border-[--color-muted-2] hover:bg-[--color-paper-2] disabled:opacity-60"
      >
        <span className="font-display text-base font-medium">
          {creating ? "Preparing…" : "Attach photos"}
        </span>
        <span className="max-w-md font-mono text-[11px] leading-relaxed text-[--color-muted]">
          Photos appear here after you add the first medicine or click to start
          attaching. They'll be saved with this visit.
        </span>
      </button>
    </section>
  );
}
