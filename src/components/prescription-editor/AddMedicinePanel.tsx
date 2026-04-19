import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Command } from 'cmdk';
import { useDebounce } from 'use-debounce';
import { ALL_FREQUENCIES, FREQUENCY_LABELS } from './frequency';
import { SCHEDULE_PRESETS } from './presets';
import type {
  Frequency,
  Medicine,
  PrescriptionItem,
  SearchMedicinesFn,
} from './types';

type Props = {
  searchMedicines: SearchMedicinesFn;
  onAdd: (item: PrescriptionItem) => void;
  editing?: { item: PrescriptionItem; index: number } | null;
  onEditSave?: (index: number, item: PrescriptionItem) => void;
  onEditCancel?: () => void;
};

export type AddMedicinePanelHandle = {
  focusSearch: () => void;
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

export const AddMedicinePanel = forwardRef<AddMedicinePanelHandle, Props>(
  function AddMedicinePanel(
    { searchMedicines, onAdd, editing, onEditSave, onEditCancel },
    ref,
  ) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 150);
    const [results, setResults] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Medicine | null>(null);
    const [frequency, setFrequency] = useState<Frequency[]>(['after_breakfast']);
    const [timesPerDay, setTimesPerDay] = useState(1);
    const [durationDays, setDurationDays] = useState(5);
    const [notes, setNotes] = useState('');
    const [userTouchedTimes, setUserTouchedTimes] = useState(false);
    const [activePreset, setActivePreset] = useState<string>('OD');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      if (editing) {
        const it = editing.item;
        setSelected({
          id: it.medicineId ?? `ed-${editing.index}`,
          brand: it.brand,
          generic: it.generic,
          composition: it.composition,
          form: it.form,
          strength: it.strength,
        });
        setFrequency(it.frequency);
        setTimesPerDay(it.timesPerDay);
        setDurationDays(it.durationDays);
        setNotes(it.notes ?? '');
        setUserTouchedTimes(true);
        setActivePreset('');
      }
    }, [editing]);

    useEffect(() => {
      let cancelled = false;
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      searchMedicines(debouncedQuery)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [debouncedQuery, searchMedicines]);

    useEffect(() => {
      if (!userTouchedTimes && frequency.length > 0) {
        setTimesPerDay(frequency.length);
      }
    }, [frequency, userTouchedTimes]);

    const grouped = useMemo(() => {
      const groups: Record<string, Medicine[]> = {
        allopathic: [],
        ayurvedic: [],
        homeopathic: [],
      };
      for (const m of results) {
        const sys = m.system ?? 'allopathic';
        groups[sys]!.push(m);
      }
      return groups;
    }, [results]);

    const reset = () => {
      setQuery('');
      setResults([]);
      setSelected(null);
      setFrequency(['after_breakfast']);
      setTimesPerDay(1);
      setDurationDays(5);
      setNotes('');
      setUserTouchedTimes(false);
      setActivePreset('OD');
    };

    const applyPreset = (code: string) => {
      const p = SCHEDULE_PRESETS.find((x) => x.code === code);
      if (!p) return;
      setFrequency(p.frequency);
      setTimesPerDay(p.timesPerDay);
      setUserTouchedTimes(false);
      setActivePreset(code);
    };

    const handleSave = () => {
      if (!selected) return;
      const item: PrescriptionItem = {
        medicineId: selected.id,
        brand: selected.brand,
        generic: selected.generic,
        composition: selected.composition,
        form: selected.form,
        strength: selected.strength,
        frequency,
        timesPerDay,
        durationDays,
        notes: notes.trim() || undefined,
      };
      if (editing && onEditSave) {
        onEditSave(editing.index, item);
      } else {
        onAdd(item);
      }
      reset();
    };

    const handleCancel = () => {
      if (editing && onEditCancel) onEditCancel();
      reset();
    };

    const toggleFrequency = (f: Frequency) => {
      setFrequency((curr) =>
        curr.includes(f) ? curr.filter((x) => x !== f) : [...curr, f],
      );
      setActivePreset('');
    };

    return (
      <div>
        {!selected ? (
          <Command className="pe-cmdk-root" shouldFilter={false}>
            <Command.Input
              ref={inputRef}
              className="pe-cmdk-input"
              placeholder="Search medicines... (Ctrl+K)"
              value={query}
              onValueChange={setQuery}
            />
            <Command.List className="pe-cmdk-list">
              {loading && <div className="pe-cmdk-empty">Searching...</div>}
              {!loading && query && results.length === 0 && (
                <Command.Empty className="pe-cmdk-empty">
                  No medicines match &ldquo;{query}&rdquo;.
                </Command.Empty>
              )}
              {!loading && !query && (
                <div className="pe-cmdk-empty">
                  Start typing to search the inventory.
                </div>
              )}
              {(['allopathic', 'ayurvedic', 'homeopathic'] as const).map(
                (sys) =>
                  grouped[sys].length > 0 && (
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
                          onSelect={() => setSelected(m)}
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
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ),
              )}
            </Command.List>
          </Command>
        ) : (
          <div className="pe-item-card">
            <div className="pe-selected">
              <div className="pe-selected-head">
                <span className="pe-selected-brand">{selected.brand}</span>
                {selected.strength && (
                  <span className="pe-selected-strength">{selected.strength}</span>
                )}
                {systemBadge(selected.system)}
              </div>
              {(selected.generic || selected.composition) && (
                <div className="pe-selected-sub">
                  {selected.generic || selected.composition}
                </div>
              )}
            </div>

            <div className="pe-field">
              <label className="pe-label">Schedule preset</label>
              <div className="pe-preset-grid">
                {SCHEDULE_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className="pe-preset"
                    data-active={activePreset === p.code}
                    onClick={() => applyPreset(p.code)}
                    title={p.description}
                  >
                    <span className="pe-preset-code">{p.code}</span>
                    <span className="pe-preset-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pe-field">
              <label className="pe-label">Frequency</label>
              <div className="pe-chip-grid">
                {ALL_FREQUENCIES.map((f) => (
                  <button
                    type="button"
                    key={f}
                    className="pe-chip"
                    data-active={frequency.includes(f)}
                    onClick={() => toggleFrequency(f)}
                  >
                    {FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pe-grid-2">
              <div>
                <label className="pe-label">Times / day</label>
                <input
                  className="pe-input"
                  type="number"
                  min={1}
                  max={6}
                  value={timesPerDay}
                  onChange={(e) => {
                    setUserTouchedTimes(true);
                    setActivePreset('');
                    const n = Math.max(
                      1,
                      Math.min(6, Number(e.target.value) || 1),
                    );
                    setTimesPerDay(n);
                  }}
                />
              </div>
              <div>
                <label className="pe-label">Duration (days)</label>
                <input
                  className="pe-input"
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) =>
                    setDurationDays(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>
            </div>

            <div className="pe-field">
              <label className="pe-label">Notes</label>
              <input
                className="pe-input"
                type="text"
                placeholder="e.g. with water, after food"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pe-actions">
              <button type="button" className="pe-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="pe-btn pe-btn-primary"
                onClick={handleSave}
                disabled={frequency.length === 0 && activePreset !== 'SOS'}
              >
                {editing ? 'Save changes' : 'Add to prescription'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);
