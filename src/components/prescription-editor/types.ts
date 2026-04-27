// Legacy shape (pre-Phase 4). Kept for backward-compat reads from visits
// saved before frequency/meal-timing were decoupled.
export type Frequency =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'empty_stomach'
  | 'before_sleep';

// New dosing model (Phase 4): frequency and meal-timing are independent axes.
// A medicine prescribed TID after food has frequency=TID, mealTiming=after_food.
export type DosingFrequency = 'OD' | 'BID' | 'TID' | 'QID' | 'SOS';
export type MealTiming =
  | 'before_food'
  | 'after_food'
  | 'empty_stomach'
  | 'at_bedtime'
  | null;

export type PrescriptionItem = {
  medicineId?: string;
  brand: string;
  generic?: string;
  composition?: string;
  form?: string;
  strength?: string;
  // New fields (Phase 4+). `dosing: null` means the doctor hasn't picked yet —
  // the editor blocks save until it's set for every row.
  dosing?: DosingFrequency | null;
  mealTiming?: MealTiming;
  // Drug class, propagated from the medicine catalog for duration defaults.
  class?: string;
  // Legacy; kept for read-compat on pre-Phase-4 visits. New writes leave empty.
  frequency: Frequency[];
  timesPerDay: number;
  durationDays: number;
  notes?: string;
};

export type PrescriptionDocument = {
  items: PrescriptionItem[];
  freeText: string;
};

export type Medicine = {
  id: string;
  brand: string;
  generic?: string;
  composition?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  system?: 'allopathic' | 'ayurvedic' | 'homeopathic';
  class?: string;
};

export type SearchMedicinesFn = (
  query: string,
  opts?: { form?: string; system?: string }
) => Promise<Medicine[]>;

export type PrescriptionEditorProps = {
  initialValue?: PrescriptionDocument;
  searchMedicines: SearchMedicinesFn;
  onChange: (doc: PrescriptionDocument) => void;
};
