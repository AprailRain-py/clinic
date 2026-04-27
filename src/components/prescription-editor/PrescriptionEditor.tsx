'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Command } from 'cmdk';
import { useDebouncedCallback, useDebounce } from 'use-debounce';
import { MedicineRow } from './MedicineRow';
import { AddMedicinePanel } from './AddMedicinePanel';
import { HandwritingInput, canRecognize } from './HandwritingInput';
import { defaultDurationFor } from '@/lib/medicine-class';
import type {
  Medicine,
  PrescriptionDocument,
  PrescriptionEditorProps,
  PrescriptionItem,
} from './types';

const EMPTY_DOC: PrescriptionDocument = { items: [], freeText: '' };

const UNDO_WINDOW_MS = 5000;

type PendingRemoval = {
  // A stable id so the banner stays with the same deletion even if the list shifts.
  id: string;
  brand: string;
  // Where in the active list the row lived when it was removed (for visual order).
  position: number;
  // The item, preserved so we can restore it.
  item: PrescriptionItem;
  // Timestamp (ms from epoch) after which the removal becomes permanent.
  expiresAt: number;
  // Handle so we can clear the timer on unmount / undo.
  timer: ReturnType<typeof setTimeout>;
};

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

function rowId(): string {
  return `rm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Empty-state illustration (inline, ink tone, non-decorative hidden). ---
function EmptyStateIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="pe-empty-icon"
    >
      <rect
        x="12"
        y="10"
        width="40"
        height="46"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M20 22h24M20 30h24M20 38h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="46" cy="46" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M50 50l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
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
  const [addPanelQuery, setAddPanelQuery] = useState<string | null>(null);
  const [pendingRemovals, setPendingRemovals] = useState<PendingRemoval[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Mirror ref so callbacks can read the latest doc without stale closures
  // and without side effects inside state updaters.
  const docRef = useRef<PrescriptionDocument>(initialValue ?? EMPTY_DOC);

  const emitChange = useDebouncedCallback((next: PrescriptionDocument) => {
    onChange(next);
  }, 200);

  const update = useCallback(
    (updater: (prev: PrescriptionDocument) => PrescriptionDocument) => {
      const next = updater(docRef.current);
      docRef.current = next;
      setDoc(next);
      emitChange(next);
    },
    [emitChange],
  );

  useEffect(() => {
    setPenSupported(canRecognize());
  }, []);

  // Autofocus the search on mount.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Global `/` key refocuses the search input — unless focus is already in
  // another editable element, mirroring the PatientDirectory guard.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Clear any pending removal timers on unmount.
  useEffect(() => {
    return () => {
      pendingRemovals.forEach((p) => clearTimeout(p.timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const groups: Record<
      'allopathic' | 'ayurvedic' | 'homeopathic',
      Medicine[]
    > = {
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
        class: m.class,
        // Doctor MUST pick dosing — we leave it null to block save.
        dosing: null,
        mealTiming: null,
        // Legacy array is not populated on new writes.
        frequency: [],
        timesPerDay: 0,
        durationDays: defaultDurationFor(m.class),
      };
      update((prev) => ({ ...prev, items: [...prev.items, item] }));
      setQuery('');
      setResults([]);
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

  // --- Delete with undo -----------------------------------------------------

  const finalizeRemoval = useCallback((id: string) => {
    setPendingRemovals((curr) => curr.filter((p) => p.id !== id));
  }, []);

  const removeItem = useCallback(
    (index: number) => {
      // Read current state synchronously via ref so we can compute outside any
      // state updater — keeps React strict mode from double-firing timers.
      const snap = docRef.current;
      const item = snap.items[index];
      if (!item) return;

      const nextItems = snap.items.filter((_, i) => i !== index);
      const nextDoc: PrescriptionDocument = { ...snap, items: nextItems };

      const id = rowId();
      const expiresAt = Date.now() + UNDO_WINDOW_MS;
      const timer = setTimeout(() => finalizeRemoval(id), UNDO_WINDOW_MS);

      setDoc(nextDoc);
      docRef.current = nextDoc;
      emitChange(nextDoc);

      setPendingRemovals((curr) => [
        ...curr,
        {
          id,
          brand: item.brand,
          position: index,
          item,
          expiresAt,
          timer,
        },
      ]);
    },
    [emitChange, finalizeRemoval],
  );

  const undoRemoval = useCallback(
    (id: string) => {
      // Find & remove the pending entry; then restore its item via ref-based
      // dispatch so we never run side effects inside a state updater.
      let toRestore: PendingRemoval | undefined;
      setPendingRemovals((curr) => {
        toRestore = curr.find((p) => p.id === id);
        if (!toRestore) return curr;
        clearTimeout(toRestore.timer);
        return curr.filter((p) => p.id !== id);
      });

      if (!toRestore) return;

      const snap = docRef.current;
      const items = snap.items.slice();
      const insertAt = Math.min(toRestore.position, items.length);
      items.splice(insertAt, 0, toRestore.item);
      const nextDoc: PrescriptionDocument = { ...snap, items };
      docRef.current = nextDoc;
      setDoc(nextDoc);
      emitChange(nextDoc);
    },
    [emitChange],
  );

  const updateNotes = (text: string) => {
    update((prev) => ({ ...prev, freeText: text }));
  };

  const handleRecognized = (text: string) => {
    setQuery(text);
    setPenOpen(false);
    searchInputRef.current?.focus();
  };

  const handleAddNewFromQuery = () => {
    setAddPanelQuery(query);
  };

  const handleAddPanelCreated = (m: Medicine) => {
    addMedicine(m);
    setAddPanelQuery(null);
  };

  // Interleave pending-removal banners with rows. Banner shows at the same
  // slot the row occupied so ordering remains stable visually.
  type RenderedRow =
    | { kind: 'item'; index: number }
    | { kind: 'pending'; pending: PendingRemoval };

  const rendered: RenderedRow[] = useMemo(() => {
    const rows: RenderedRow[] = doc.items.map((_, i) => ({
      kind: 'item' as const,
      index: i,
    }));
    // Insert banners at their original position, stably.
    const sorted = [...pendingRemovals].sort(
      (a, b) => a.position - b.position,
    );
    for (const p of sorted) {
      const insertAt = Math.min(p.position, rows.length);
      rows.splice(insertAt, 0, { kind: 'pending', pending: p });
    }
    return rows;
  }, [doc.items, pendingRemovals]);

  return (
    <div className="pe-root-single">
      {/* Notes section */}
      <section className="pe-section">
        <div className="pe-section-head">
          <div>
            <div className="pe-eyebrow">Prescription · notes</div>
            <div className="pe-section-title">
              Complaint, diagnosis, advice
            </div>
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
            <div className="pe-eyebrow">Prescription · compose</div>
            <div className="pe-section-title">Add medicines</div>
          </div>
          <span className="pe-hint">
            Indian catalog &mdash; 250,000+ entries
          </span>
        </div>

        <div className="pe-search-wrap">
          <Command className="pe-cmdk-root" shouldFilter={false}>
            <div className="pe-search-bar">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="pe-search-icon"
                aria-hidden
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="m20 20-3-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <Command.Input
                ref={searchInputRef}
                className="pe-search-input"
                placeholder="Start typing a medicine name, or press /"
                value={query}
                onValueChange={setQuery}
                data-testid="pe-search-input"
              />
              <button
                type="button"
                onClick={() => setPenOpen((v) => !v)}
                className={`pe-pen-btn${penOpen ? ' pe-pen-btn-active' : ''}`}
                title={
                  penSupported ? 'Write with pen' : 'Pen mode (Chrome/Edge only)'
                }
                aria-pressed={penOpen}
                disabled={!penSupported && !penOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M12 19l7-7 3 3-7 7-3-3z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m2 2 7.586 7.586"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
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

            {(query || searching) && !penOpen && addPanelQuery === null ? (
              <Command.List className="pe-results">
                {searching && <div className="pe-cmdk-empty">Searching…</div>}
                {!searching && query && results.length === 0 && (
                  <div className="pe-cmdk-empty">
                    No medicines match &ldquo;{query}&rdquo;.
                  </div>
                )}
                {(['allopathic', 'ayurvedic', 'homeopathic'] as const).map(
                  (sys) =>
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
                                  <span className="pe-item-strength">
                                    {m.strength}
                                  </span>
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
                {!searching && query && results.length === 0 ? (
                  <Command.Item
                    value={`__add_new__${query}`}
                    className="pe-cmdk-item pe-cmdk-item-add-new"
                    onSelect={handleAddNewFromQuery}
                    data-testid="pe-add-new-link"
                  >
                    <div className="pe-item-row">
                      <div className="pe-item-head">
                        <span className="pe-item-add-new-icon" aria-hidden>
                          +
                        </span>
                        <span className="pe-item-brand">
                          Add &ldquo;{query}&rdquo; as new medicine
                        </span>
                      </div>
                      <div className="pe-item-sub">
                        Create a new medicine record and add it to this
                        prescription.
                      </div>
                    </div>
                    <span className="pe-item-add">New →</span>
                  </Command.Item>
                ) : null}
              </Command.List>
            ) : null}
          </Command>

          {addPanelQuery !== null ? (
            <AddMedicinePanel
              initialBrand={addPanelQuery}
              searchMedicines={searchMedicines}
              onCancel={() => setAddPanelQuery(null)}
              onCreated={handleAddPanelCreated}
            />
          ) : null}
        </div>
      </section>

      {/* List */}
      <section className="pe-section">
        <div className="pe-section-head">
          <div>
            <div className="pe-eyebrow">Prescription · chart</div>
            <div className="pe-section-title">Prescribed medicines</div>
          </div>
          <span className="pe-hint">
            {doc.items.length === 0
              ? 'Nothing yet'
              : `${doc.items.length} ${doc.items.length === 1 ? 'medicine' : 'medicines'}`}
          </span>
        </div>

        <div
          ref={listRef}
          className="pe-med-list"
          aria-live="polite"
        >
          {doc.items.length === 0 && pendingRemovals.length === 0 ? (
            <div className="pe-empty-state">
              <EmptyStateIcon />
              <div className="pe-empty-headline">No medicines yet.</div>
              <div className="pe-empty-helper">
                Search above. Indian catalog has 250,000+ medicines.
                Can&rsquo;t find one? Use + Add new.
              </div>
            </div>
          ) : (
            rendered.map((row) =>
              row.kind === 'item' ? (
                <MedicineRow
                  key={`item-${row.index}`}
                  index={row.index}
                  item={doc.items[row.index]}
                  onChange={patchItem}
                  onRemove={removeItem}
                />
              ) : (
                <div
                  key={`pending-${row.pending.id}`}
                  className="pe-removed-banner"
                  role="status"
                >
                  <span className="pe-removed-text">
                    Removed{' '}
                    <span className="pe-removed-brand">
                      {row.pending.brand}
                    </span>
                  </span>
                  <UndoCountdown
                    expiresAt={row.pending.expiresAt}
                    onUndo={() => undoRemoval(row.pending.id)}
                  />
                </div>
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
}

function UndoCountdown({
  expiresAt,
  onUndo,
}: {
  expiresAt: number;
  onUndo: () => void;
}) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <div className="pe-removed-actions">
      <span className="pe-removed-countdown" aria-hidden>
        {remaining}s
      </span>
      <button
        type="button"
        className="pe-removed-undo"
        onClick={onUndo}
      >
        Undo
      </button>
    </div>
  );
}
