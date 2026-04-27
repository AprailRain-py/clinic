import type {
  DosingFrequency,
  Frequency,
  MealTiming,
  PrescriptionItem,
} from './types';

export const DOSING_FREQUENCIES: DosingFrequency[] = [
  'OD',
  'BID',
  'TID',
  'QID',
  'SOS',
];

export const DOSING_LABELS: Record<DosingFrequency, string> = {
  OD: 'Once a day',
  BID: 'Twice a day',
  TID: 'Thrice a day',
  QID: 'Four times a day',
  SOS: 'As needed (SOS)',
};

export const DOSING_SHORT: Record<DosingFrequency, string> = {
  OD: 'OD',
  BID: 'BID',
  TID: 'TID',
  QID: 'QID',
  SOS: 'SOS',
};

export const DOSING_TIMES_PER_DAY: Record<DosingFrequency, number> = {
  OD: 1,
  BID: 2,
  TID: 3,
  QID: 4,
  SOS: 1,
};

export const MEAL_TIMING_LABELS: Record<NonNullable<MealTiming>, string> = {
  before_food: 'Before food',
  after_food: 'After food',
  empty_stomach: 'Empty stomach',
  at_bedtime: 'At bedtime',
};

// Derive (dosing, mealTiming) from the legacy `frequency: Frequency[]`.
// Returns null for either axis when the legacy shape can't confidently decide.
export function deriveFromLegacyFrequency(
  freq: Frequency[],
): { dosing: DosingFrequency; mealTiming: MealTiming } {
  if (!freq || freq.length === 0) {
    return { dosing: 'SOS', mealTiming: null };
  }

  // Meal timing: pick the dominant pattern in the array.
  const allBefore = freq.every((f) => f.startsWith('before_'));
  const allAfter = freq.every((f) => f.startsWith('after_'));
  const hasEmpty = freq.includes('empty_stomach');
  const hasSleep = freq.includes('before_sleep');
  const onlySleep = freq.length === 1 && freq[0] === 'before_sleep';

  let mealTiming: MealTiming = null;
  if (onlySleep) mealTiming = 'at_bedtime';
  else if (hasEmpty) mealTiming = 'empty_stomach';
  else if (allBefore) mealTiming = 'before_food';
  else if (allAfter || (freq.length > 1 && hasSleep)) mealTiming = 'after_food';

  // Dosing: from the count, discounting `before_sleep` if it's an adjunct.
  const effectiveCount = freq.length;
  let dosing: DosingFrequency;
  if (effectiveCount >= 4) dosing = 'QID';
  else if (effectiveCount === 3) dosing = 'TID';
  else if (effectiveCount === 2) dosing = 'BID';
  else dosing = 'OD';

  return { dosing, mealTiming };
}

// Read-path normalizer: accept legacy rows and produce the new shape without
// mutating the original. New rows pass through unchanged.
export function normalizeItem(item: PrescriptionItem): PrescriptionItem {
  if (item.dosing !== undefined && item.dosing !== null) {
    return item;
  }
  const derived = deriveFromLegacyFrequency(item.frequency ?? []);
  return {
    ...item,
    dosing: derived.dosing,
    mealTiming:
      item.mealTiming !== undefined ? item.mealTiming : derived.mealTiming,
  };
}

// Short human label for the prescription: "TID · after food"
export function describeDosing(item: PrescriptionItem): string {
  const d = item.dosing ?? deriveFromLegacyFrequency(item.frequency ?? []).dosing;
  const meal =
    item.mealTiming !== undefined
      ? item.mealTiming
      : deriveFromLegacyFrequency(item.frequency ?? []).mealTiming;
  const base = DOSING_SHORT[d];
  return meal ? `${base} · ${MEAL_TIMING_LABELS[meal]}` : base;
}
