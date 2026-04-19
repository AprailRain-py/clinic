'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { useDebouncedCallback, useDebounce } from 'use-debounce';
import { MedicineRow } from './MedicineRow';
import { HandwritingInput, canRecognize } from './HandwritingInput';
import type {
  Medicine,
  PrescriptionDocument,
  PrescriptionEditorProps,
  PrescriptionItem,
} from './types';

const EMPTY_DOC: PrescriptionDocument = { items: [], freeText: '' };

function systemLabel(sys?: Medicine['system']): string {
  if (sys === 'ayurvedic') return 'Ayurvedic';
  if (sys === 'homeopathic') return 'Homeopathic';
  return 'Allopathic';
}

function systemBadge(sys?: Medicine['system']) {
  if (!sys) return null;
  const cls =
    sys === 'ayurvedic'
      ? 'pe-badge pe-badge-ayur'
      : sys === 'homeopathic'
        ? 'pe-badge pe-badge-homeo'
        : 'pe-badge pe-badge-allo';
  const label =
    sys === 'ayurvedic' ? 'Ayur' : sys === 'homeopathic' ? 'Homeo' : 'Allo';
  return <span className={cls}>{label}</span>;
}

export function PrescriptionEditor({
  initialValue,
  searchMedicines,
  onChange,
}: PrescriptionEditorProps) {
  const [doc, setDoc] = useState<PrescriptionDocument>(
    initialValue ?? EMPTY_DOC,
  );
  const [query, setQuery] = useState('');
  const [debounced] = useDebounce(query, 150);
  const [results, setResults] = useState<Medicine[]>([]);
  const [searching, setSearching] = useState(false);
  const [penOpen, setPenOpen] = useState(false);
  const [penSupported, setPenSupported] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const emitChange = useDebouncedCallback((next: PrescriptionDocument) => {
    onChange(next);
  }, 200);

  const update = useCallback(
    (updater: (prev: PrescriptionDocument) => PrescriptionDocument) => {
      setDoc((prev) => {
        const next = updater(prev);
        emitChange(next);
        return next;
      });
    },
    [emitChange],
  );

  useEffect(() => {
    setPenSupported(canRecognize());
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = debounced.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchMedicines(q)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, searchMedicines]);

  const grouped = useMemo(() => {
    const groups: Record<'allopathic' | 'ayurvedic' | 'homeopathic', Medicine[]> = {
      allopathic: [],
      ayurvedic: [],
      homeopathic: [],
    };
    for (const m of results) {
      const sys = (m.system ?? 'allopathic') as keyof typeof groups;
      groups[sys].push(m);
    }
    return groups;
  }, [results]);

  const addMedicine = useCallback(
    (m: Medicine) => {
      const item: PrescriptionItem = {
        medicineId: m.id,
        brand: m.brand,
        generic: m.generic,
        composition: m.composition,
        form: m.form,
        strength: m.strength,
        frequency: ['after_breakfast'],
        timesPerDay: 1,
        durationDays: 5,
      };
      update((prev) => ({ ...prev, items: [...prev.items, item] }));
      setQuery('');
      setResults([]);
      // Scroll to the newly added row
      requestAnimationFrame(() => {
        listRef.current?.lastElementChild?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    },
    [update],
  );

  const patchItem = useCallback(
    (index: number, patch: Partial<PrescriptionItem>) => {
      update((prev) => {
        const next = prev.items.slice();
        next[index] = { ...next[index], ...patch };
        return { ...prev, items: next };
      });
    },
    [update],
  );

  const removeItem = useCallback(
    (index: number) => {
      update((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    },
    [update],
  );

  const updateNotes = (text: string) => {
    update((prev) => ({ ...prev, freeText: text }));
  };

  const handleRecognized = (text: string) => {
    setQuery(text);
    setPenOpen(false);
    searchInputRef.current?.focus();
  };

  return (
    <div className="pe-root-single">
      {/* Notes section */}
      <section className="pe-section">
        <div className="pe-section-head">
          <div>
            <div className="pe-eyebrow">Rx · notes</div>
            <div className="pe-section-title">Complaint, diagnosis, advice</div>
          </div>
          <span className="pe-hint">Optional &mdash; what the visit is for</span>
        </div>
        <textarea
          value={doc.freeText}
          onChange={(e) => updateNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Fever 3 days, body ache. Rest, fluids."
          className="pe-notes"
        />
      </section>

      {/* Add medicine */}
      <section className="pe-section">
        <div className="pe-section-head">
          <div>
            <div className="pe-eyebrow">Rx · compose</div>
            <div className="pe-section-title">Add medicines</div>
          </div>
          <span className="pe-hint">
            Type or press{' '}
            <kbd className="pe-kbd">⌘K</kbd>
          </span>
        </div>

        <div className="pe-search-wrap">
          <Command className="pe-cmdk-root" shouldFilter={false}>
            <div className="pe-search-bar">
              <svg viewBox="0 0 24 24" fill="none" className="pe-search-icon" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <Command.Input
                ref={searchInputRef}
                className="pe-search-input"
                placeholder="Search medicines &mdash; brand, generic or composition..."
                value={query}
                onValueChange={setQuery}
              />
              <button
                type="button"
                onClick={() => setPenOpen((v) => !v)}
                className={`pe-pen-btn${penOpen ? ' pe-pen-btn-active' : ''}`}
                title={penSupported ? 'Write with pen' : 'Pen mode (Chrome/Edge only)'}
                aria-pressed={penOpen}
                disabled={!penSupported && !penOpen}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M12 19l7-7 3 3-7 7-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="m2 2 7.586 7.586" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <span>{penSupported ? 'Pen' : 'Pen (n/a)'}</span>
              </button>
            </div>

            {penOpen ? (
              <div className="pe-pen-slot">
                <HandwritingInput
                  onRecognize={handleRecognized}
                  onClose={() => setPenOpen(false)}
                />
              </div>
            ) : null}

            {(query || searching) && !penOpen ? (
              <Command.List className="pe-results">
                {searching && <div className="pe-cmdk-empty">Searching...</div>}
                {!searching && query && results.length === 0 && (
                  <Command.Empty className="pe-cmdk-empty">
                    No medicines match &ldquo;{query}&rdquo;.
                  </Command.Empty>
                )}
                {(['allopathic', 'ayurvedic', 'homeopathic'] as const).map((sys) =>
                  grouped[sys].length > 0 ? (
                    <Command.Group
                      key={sys}
                      heading={systemLabel(sys)}
                      className="pe-cmdk-group"
                    >
                      {grouped[sys].map((m) => (
                        <Command.Item
                          key={m.id}
                          value={m.id}
                          className="pe-cmdk-item"
                          onSelect={() => addMedicine(m)}
                        >
                          <div className="pe-item-row">
                            <div className="pe-item-head">
                              <span className="pe-item-brand">{m.brand}</span>
                              {m.strength && (
                                <span className="pe-item-strength">{m.strength}</span>
                              )}
                              {systemBadge(m.system)}
                            </div>
                            {(m.generic || m.composition) && (
                              <div className="pe-item-sub">
                                {m.generic || m.composition}
                              </div>
                            )}
                          </div>
                          <span className="pe-item-add">Add →</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ) : null,
                )}
              </Command.List>
            ) : null}
          </Command>
        </div>
      </section>

      {/* List */}
      <section className="pe-section">
        <div className="pe-section-head">
          <div>
            <div className="pe-eyebrow">Rx · chart</div>
            <div className="pe-section-title">Prescribed medicines</div>
          </div>
          <span className="pe-hint">
            {doc.items.length === 0
              ? 'Nothing yet'
              : `${doc.items.length} ${doc.items.length === 1 ? 'medicine' : 'medicines'}`}
          </span>
        </div>

        <div ref={listRef} className="pe-med-list">
          {doc.items.length === 0 ? (
            <div className="pe-list-empty">
              Prescribed medicines will appear here as you add them.
            </div>
          ) : (
            doc.items.map((item, idx) => (
              <MedicineRow
                key={idx}
                index={idx}
                item={item}
                onChange={patchItem}
                onRemove={removeItem}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
