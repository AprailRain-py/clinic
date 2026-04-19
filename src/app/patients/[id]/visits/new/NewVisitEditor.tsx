"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  PrescriptionEditor,
  type Medicine,
  type PrescriptionDocument,
} from "@/components/prescription-editor";

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
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
          <div className="font-display text-sm italic text-[--color-muted]">
            {itemCount === 0
              ? "awaiting prescription..."
              : `${itemCount} ${itemCount === 1 ? "medicine" : "medicines"} · ${doc.freeText.length} chars`}
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <div className="mb-6 flex items-baseline justify-between border-b border-[--color-rule] pb-4">
          <div>
            <div className="eyebrow">Rx</div>
            <h2 className="font-display text-xl font-medium">
              Prescription for{" "}
              <span className="italic">{patientName.split(" ")[0]}</span>
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[--color-muted]">
            ⌘K to focus search
          </span>
        </div>
        <PrescriptionEditor
          searchMedicines={searchMedicines}
          onChange={setDoc}
        />
      </div>

      {error ? (
        <div className="chip chip-rust inline-flex items-center px-3 py-1.5 text-xs">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Link href={`/patients/${patientId}`} className="btn-ghost">
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save prescription"}
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
