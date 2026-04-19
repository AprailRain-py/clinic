import { FREQUENCY_SHORT } from './frequency';
import type { Frequency, PrescriptionItem } from './types';

type Props = {
  items: PrescriptionItem[];
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
};

function scheduleTag(freq: Frequency[], times: number): string {
  if (times === 1 && freq.includes('before_sleep')) return 'HS';
  if (times === 4) return 'QID';
  if (times === 3 && freq.every((f) => f.startsWith('before_'))) return 'AC';
  if (times === 3 && freq.every((f) => f.startsWith('after_'))) return 'PC';
  if (times === 3) return 'TID';
  if (times === 2) return 'BID';
  if (times === 1) return 'OD';
  return `${times}/D`;
}

export function MedicineItemsList({ items, onRemove, onEdit }: Props) {
  if (items.length === 0) {
    return (
      <div className="pe-list-empty">
        Nothing added yet. Search above, or type a form keyword in the canvas.
      </div>
    );
  }

  return (
    <div className="pe-list">
      {items.map((item, idx) => (
        <div key={idx} className="pe-row">
          <div>
            <div className="pe-row-head">
              <span className="pe-row-brand">{item.brand}</span>
              {item.strength && (
                <span className="pe-row-strength">{item.strength}</span>
              )}
            </div>
            {(item.generic || item.composition) && (
              <div className="pe-row-sub">{item.generic || item.composition}</div>
            )}

            <div className="pe-row-sched">
              <span className="pe-sched-tag">
                {scheduleTag(item.frequency, item.timesPerDay)}
              </span>
              {item.frequency.map((f) => (
                <span key={f} className="pe-sched-tag" style={{ background: 'transparent', border: '1px solid var(--pe-rule)', color: 'var(--pe-ink-soft)' }}>
                  {FREQUENCY_SHORT[f]}
                </span>
              ))}
            </div>

            <div className="pe-row-meta">
              {item.timesPerDay}× / day &middot; {item.durationDays} day
              {item.durationDays > 1 ? 's' : ''}
            </div>
            {item.notes && <div className="pe-row-notes">&ldquo;{item.notes}&rdquo;</div>}
          </div>

          <div className="pe-row-actions">
            <button
              type="button"
              className="pe-btn pe-btn-ghost"
              title="Edit"
              onClick={() => onEdit(idx)}
              aria-label="Edit medicine"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              type="button"
              className="pe-btn pe-btn-ghost"
              title="Remove"
              onClick={() => onRemove(idx)}
              aria-label="Remove medicine"
              style={{ color: 'var(--pe-rust)' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
