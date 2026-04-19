export type Frequency =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'empty_stomach'
  | 'before_sleep';

export type PrescriptionItem = {
  medicineId?: string;
  brand: string;
  generic?: string;
  composition?: string;
  form?: string;
  strength?: string;
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
