'use client';

import {
  DOSING_FREQUENCIES,
  DOSING_LABELS,
  DOSING_SHORT,
  DOSING_TIMES_PER_DAY,
  MEAL_TIMING_LABELS,
} from './dosing';
import type { DosingFrequency, MealTiming, PrescriptionItem } from './types';

type Props = {
  index: number;
  item: PrescriptionItem;
  onChange: (index: number, patch: Partial<PrescriptionItem>) => void;
  onRemove: (index: number) => void;
};

type MealTimingOption = {
  value: MealTiming;
  label: string;
};

const MEAL_TIMING_OPTIONS: MealTimingOption[] = [
  { value: 'before_food', label: 'Before food' },
  { value: 'after_food', label: 'After food' },
  { value: 'empty_stomach', label: 'Empty stomach' },
  { value: 'at_bedtime', label: 'At bedtime' },
  { value: null, label: '—' },
];

export function MedicineRow({ index, item, onChange, onRemove }: Props) {
  const dosing = item.dosing ?? null;
  const mealTiming = item.mealTiming ?? null;
  const invalid = dosing === null;

  const handlePickDosing = (d: DosingFrequency) => {
    onChange(index, {
      dosing: d,
      timesPerDay: DOSING_TIMES_PER_DAY[d],
      // Clear legacy frequency on new writes.
      frequency: [],
    });
  };

  const handlePickMeal = (m: MealTiming) => {
    onChange(index, { mealTiming: m });
  };

  return (
    <article
      className="pe-med-row"
      data-invalid={invalid ? 'true' : undefined}
      aria-invalid={invalid ? 'true' : undefined}
    >
      <header className="pe-med-head">
        <span className="pe-med-index">
          {String(index + 1).padStart(2, '0')}
        </span>
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
          aria-label={`Remove ${item.brand}`}
          title="Remove"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
          </svg>
        </button>
      </header>

      <div className="pe-med-section">
        <div className="pe-med-section-head">
          <span className="pe-eyebrow">Frequency</span>
          {invalid ? (
            <span className="pe-sched-required">Pick frequency</span>
          ) : (
            <span className="pe-sched-summary">
              {DOSING_LABELS[dosing]}
              {' · '}
              <span className="pe-sched-summary-count">
                ×{item.timesPerDay}/day
              </span>
            </span>
          )}
        </div>
        <div
          className="pe-dosing-group"
          role="radiogroup"
          aria-label="Dosing frequency"
        >
          {DOSING_FREQUENCIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={dosing === d}
              className="pe-dosing-pill"
              data-active={dosing === d}
              onClick={() => handlePickDosing(d)}
              title={DOSING_LABELS[d]}
            >
              {DOSING_SHORT[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="pe-med-section">
        <div className="pe-med-section-head">
          <span className="pe-eyebrow">With meal</span>
          <span className="pe-sched-summary">
            {mealTiming ? MEAL_TIMING_LABELS[mealTiming] : 'Unspecified'}
          </span>
        </div>
        <div
          className="pe-meal-group"
          role="radiogroup"
          aria-label="Meal timing"
        >
          {MEAL_TIMING_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? 'none'}
              type="button"
              role="radio"
              aria-checked={mealTiming === opt.value}
              className="pe-meal-pill"
              data-active={mealTiming === opt.value}
              onClick={() => handlePickMeal(opt.value)}
            >
              {opt.label}
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
            onChange={(e) => {
              const raw = Number(e.target.value) || 1;
              const clamped = Math.max(1, Math.min(365, raw));
              onChange(index, { durationDays: clamped });
            }}
          />
        </label>
        <label className="pe-med-input pe-med-input-grow">
          <span className="pe-eyebrow">Notes</span>
          <input
            type="text"
            className="pe-input"
            placeholder="e.g. with warm water"
            value={item.notes ?? ''}
            onChange={(e) =>
              onChange(index, { notes: e.target.value || undefined })
            }
          />
        </label>
      </div>
    </article>
  );
}
