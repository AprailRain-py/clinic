'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import type { Medicine, SearchMedicinesFn } from './types';

type Props = {
  initialBrand: string;
  searchMedicines: SearchMedicinesFn;
  onCancel: () => void;
  onCreated: (m: Medicine) => void;
};

const FORM_OPTIONS = [
  { value: '', label: 'Unspecified' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'ointment', label: 'Ointment / cream' },
  { value: 'drops', label: 'Drops' },
  { value: 'powder', label: 'Powder' },
] as const;

const SYSTEM_OPTIONS = [
  { value: 'allopathic', label: 'Allopathic' },
  { value: 'ayurvedic', label: 'Ayurvedic' },
  { value: 'homeopathic', label: 'Homeopathic' },
] as const;

export function AddMedicinePanel({
  initialBrand,
  searchMedicines,
  onCancel,
  onCreated,
}: Props) {
  const [brand, setBrand] = useState(initialBrand);
  const [generic, setGeneric] = useState('');
  const [composition, setComposition] = useState('');
  const [form, setForm] = useState<string>('');
  const [strength, setStrength] = useState('');
  const [system, setSystem] = useState<
    'allopathic' | 'ayurvedic' | 'homeopathic'
  >('allopathic');

  const [saltsPickerOpen, setSaltsPickerOpen] = useState(false);
  const [saltsQuery, setSaltsQuery] = useState('');
  const [saltsDebounced] = useDebounce(saltsQuery, 150);
  const [saltsResults, setSaltsResults] = useState<Medicine[]>([]);
  const [saltsSearching, setSaltsSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the brand field on mount so the doctor can refine it.
    brandRef.current?.focus();
    brandRef.current?.select();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = saltsDebounced.trim();
    if (!saltsPickerOpen || q.length < 1) {
      setSaltsResults([]);
      return;
    }
    setSaltsSearching(true);
    searchMedicines(q)
      .then((r) => {
        if (!cancelled) setSaltsResults(r);
      })
      .catch(() => {
        if (!cancelled) setSaltsResults([]);
      })
      .finally(() => {
        if (!cancelled) setSaltsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [saltsDebounced, saltsPickerOpen, searchMedicines]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleCopyFrom = (m: Medicine) => {
    if (m.composition) setComposition(m.composition);
    else if (m.generic) setComposition(m.generic);
    if (!generic && m.generic) setGeneric(m.generic);
    if (!strength && m.strength) setStrength(m.strength);
    if (!form && m.form) setForm(m.form);
    if (m.system) setSystem(m.system);
    setSaltsPickerOpen(false);
    setSaltsQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = brand.trim();
    if (!trimmed) {
      setError('Brand name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brand: trimmed,
          generic: generic.trim() || undefined,
          composition: composition.trim() || undefined,
          form: form || undefined,
          strength: strength.trim() || undefined,
          system,
        }),
      });
      if (res.status === 409) {
        // Duplicate — server returns the existing medicine; insert it anyway.
        const data = (await res.json()) as { medicine?: Medicine };
        if (data.medicine) {
          onCreated(data.medicine);
          return;
        }
        setError('A medicine with these details already exists.');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || `Request failed: ${res.status}`);
        return;
      }
      const created = (await res.json()) as Medicine;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="pe-inline-add"
      role="region"
      aria-label="Add new medicine"
      data-testid="pe-inline-add-panel"
    >
      <form onSubmit={handleSubmit} className="pe-inline-add-body">
        <div className="pe-inline-add-grid">
          <label className="pe-inline-add-field pe-inline-add-field-full">
            <span className="pe-eyebrow">Brand name *</span>
            <input
              ref={brandRef}
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="pe-input"
              maxLength={200}
              required
            />
          </label>

          <label className="pe-inline-add-field">
            <span className="pe-eyebrow">Generic</span>
            <input
              type="text"
              value={generic}
              onChange={(e) => setGeneric(e.target.value)}
              className="pe-input"
              maxLength={200}
            />
          </label>

          <label className="pe-inline-add-field">
            <span className="pe-eyebrow">Strength</span>
            <input
              type="text"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="pe-input"
              placeholder="500 mg"
              maxLength={120}
            />
          </label>

          <label className="pe-inline-add-field">
            <span className="pe-eyebrow">Form</span>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value)}
              className="pe-input"
            >
              {FORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pe-inline-add-field">
            <span className="pe-eyebrow">System</span>
            <select
              value={system}
              onChange={(e) =>
                setSystem(
                  e.target.value as
                    | 'allopathic'
                    | 'ayurvedic'
                    | 'homeopathic',
                )
              }
              className="pe-input"
            >
              {SYSTEM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pe-inline-add-field pe-inline-add-field-full">
            <span className="pe-inline-add-label-row">
              <span className="pe-eyebrow">Composition / salts</span>
              <button
                type="button"
                className="pe-inline-add-link"
                onClick={() => setSaltsPickerOpen((v) => !v)}
              >
                {saltsPickerOpen ? 'Cancel' : 'Copy salts from existing…'}
              </button>
            </span>
            <textarea
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              rows={2}
              className="pe-notes pe-inline-add-notes"
              maxLength={1000}
              placeholder="e.g. Paracetamol 500 mg + Caffeine 30 mg"
            />
            {saltsPickerOpen ? (
              <div className="pe-inline-add-salts">
                <input
                  type="text"
                  value={saltsQuery}
                  onChange={(e) => setSaltsQuery(e.target.value)}
                  className="pe-input"
                  placeholder="Search an existing medicine…"
                />
                {saltsSearching ? (
                  <div className="pe-cmdk-empty">Searching…</div>
                ) : saltsQuery && saltsResults.length === 0 ? (
                  <div className="pe-cmdk-empty">No matches.</div>
                ) : (
                  <ul className="pe-inline-add-salts-list">
                    {saltsResults.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className="pe-inline-add-salts-item"
                          onClick={() => handleCopyFrom(m)}
                        >
                          <span className="pe-item-brand">{m.brand}</span>
                          {m.strength ? (
                            <span className="pe-item-strength">
                              {m.strength}
                            </span>
                          ) : null}
                          {m.composition || m.generic ? (
                            <span className="pe-item-sub">
                              {m.composition ?? m.generic}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </label>
        </div>

        {error ? <div className="pe-inline-add-error">{error}</div> : null}

        <div className="pe-inline-add-actions">
          <button
            type="button"
            className="pe-btn"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="pe-btn pe-btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save & add'}
          </button>
        </div>
      </form>
    </section>
  );
}
