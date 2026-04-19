import { useState } from 'react';
import { ALL_FREQUENCIES, FREQUENCY_LABELS, FREQUENCY_SHORT } from './frequency';
import { SCHEDULE_PRESETS } from './presets';
import type { Frequency, PrescriptionItem } from './types';

type Props = {
  index: number;
  item: PrescriptionItem;
  onChange: (index: number, patch: Partial<PrescriptionItem>) => void;
  onRemove: (index: number) => void;
};

function matchPreset(item: PrescriptionItem): string {
  for (const p of SCHEDULE_PRESETS) {
    if (p.timesPerDay !== item.timesPerDay) continue;
    if (p.frequency.length !== item.frequency.length) continue;
    const a = [...p.frequency].sort().join(',');
    const b = [...item.frequency].sort().join(',');
    if (a === b) return p.code;
  }
  return '';
}

export function MedicineRow({ index, item, onChange, onRemove }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const activePreset = matchPreset(item);

  const applyPreset = (code: string) => {
    const p = SCHEDULE_PRESETS.find((x) => x.code === code);
    if (!p) return;
    onChange(index, { frequency: p.frequency, timesPerDay: p.timesPerDay });
  };

  const toggleFrequency = (f: Frequency) => {
    const next = item.frequency.includes(f)
      ? item.frequency.filter((x) => x !== f)
      : [...item.frequency, f];
    onChange(index, {
      frequency: next,
      timesPerDay: next.length > 0 ? next.length : item.timesPerDay,
    });
  };

  return (
    <article className="pe-med-row">
      <header className="pe-med-head">
        <span className="pe-med-index">{String(index + 1).padStart(2, '0')}</span>
        <div className="pe-med-id">
          <div className="pe-med-name-row">
            <span className="pe-med-brand">{item.brand}</span>
            {item.strength && (
              <span className="pe-med-strength">{item.strength}</span>
            )}
            {item.form && <span className="pe-med-form">{item.form}</span>}
          </div>
          {(item.generic || item.composition) && (
            <div className="pe-med-sub">{item.generic || item.composition}</div>
          )}
        </div>
        <button
          type="button"
          className="pe-btn pe-btn-ghost"
          onClick={() => onRemove(index)}
          aria-label="Remove medicine"
          title="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      <div className="pe-med-section">
        <div className="pe-med-section-head">
          <span className="pe-eyebrow">Schedule</span>
          {activePreset ? (
            <span className="pe-sched-summary">
              {SCHEDULE_PRESETS.find((p) => p.code === activePreset)?.label}
            </span>
          ) : (
            <span className="pe-sched-summary pe-sched-custom">Custom</span>
          )}
        </div>
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

      <div className="pe-med-inputs">
        <label className="pe-med-input">
          <span className="pe-eyebrow">Days</span>
          <input
            type="number"
            className="pe-input"
            min={1}
            max={365}
            value={item.durationDays}
            onChange={(e) =>
              onChange(index, {
                durationDays: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </label>
        <label className="pe-med-input pe-med-input-grow">
          <span className="pe-eyebrow">Notes</span>
          <input
            type="text"
            className="pe-input"
            placeholder="e.g. after food, with warm water"
            value={item.notes ?? ''}
            onChange={(e) => onChange(index, { notes: e.target.value || undefined })}
          />
        </label>
      </div>

      {item.frequency.length > 0 ? (
        <div className="pe-med-when">
          <span className="pe-eyebrow">When</span>
          <div className="pe-med-when-tags">
            {item.frequency.map((f) => (
              <span key={f} className="pe-when-tag">
                {FREQUENCY_SHORT[f]}
                <span className="pe-when-tag-full">{FREQUENCY_LABELS[f]}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="pe-advanced-toggle"
        onClick={() => setAdvanced((v) => !v)}
        aria-expanded={advanced}
      >
        <span className="pe-advanced-caret" data-open={advanced}>▸</span>
        Advanced &mdash; override individual times
      </button>
      {advanced ? (
        <div className="pe-advanced">
          <div className="pe-chip-grid">
            {ALL_FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                className="pe-chip"
                data-active={item.frequency.includes(f)}
                onClick={() => toggleFrequency(f)}
              >
                {FREQUENCY_LABELS[f]}
              </button>
            ))}
          </div>
          <label className="pe-med-input" style={{ marginTop: 12, maxWidth: 160 }}>
            <span className="pe-eyebrow">Times / day</span>
            <input
              type="number"
              className="pe-input"
              min={1}
              max={12}
              value={item.timesPerDay}
              onChange={(e) =>
                onChange(index, {
                  timesPerDay: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </label>
        </div>
      ) : null}
    </article>
  );
}
