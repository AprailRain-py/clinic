export type FormType =
  | 'tablet'
  | 'syrup'
  | 'capsule'
  | 'injection'
  | 'ointment'
  | 'drops'
  | 'powder';

// Prefix-based form keyword matcher. The user asked that we trigger on
// short prefixes like "tab", "syr", "cap", "inj", "oint", "drop", "pow".
// We match the longest applicable prefix first, case-insensitive.
const FORM_PREFIXES: Array<{ prefix: string; form: FormType }> = [
  { prefix: 'tablet', form: 'tablet' },
  { prefix: 'tab', form: 'tablet' },
  { prefix: 'syrup', form: 'syrup' },
  { prefix: 'syr', form: 'syrup' },
  { prefix: 'capsule', form: 'capsule' },
  { prefix: 'cap', form: 'capsule' },
  { prefix: 'injection', form: 'injection' },
  { prefix: 'inj', form: 'injection' },
  { prefix: 'ointment', form: 'ointment' },
  { prefix: 'oint', form: 'ointment' },
  { prefix: 'drops', form: 'drops' },
  { prefix: 'drop', form: 'drops' },
  { prefix: 'powder', form: 'powder' },
  { prefix: 'pow', form: 'powder' },
];

export function detectFormKeyword(word: string): FormType | null {
  if (!word) return null;
  const w = word.toLowerCase().trim();
  if (w.length < 3) return null;
  // Only trigger if the word IS (starts-and-equals) the keyword — the user
  // is literally typing "tab", "tablet", not "tabby" or "capsize". We treat
  // prefixes where the typed word starts with an approved keyword root.
  for (const { prefix, form } of FORM_PREFIXES) {
    if (w === prefix) return form;
  }
  // Allow partials: "tabl" -> tablet, "syru" -> syrup
  const partials: Array<[string, FormType]> = [
    ['tabl', 'tablet'],
    ['syru', 'syrup'],
    ['caps', 'capsule'],
    ['inje', 'injection'],
    ['oint', 'ointment'],
    ['drop', 'drops'],
    ['powd', 'powder'],
  ];
  for (const [p, f] of partials) {
    if (w.startsWith(p) && p.length >= 4 && w.length <= p.length + 3) return f;
  }
  return null;
}

export const FORM_LABELS: Record<FormType, string> = {
  tablet: 'Tablet',
  syrup: 'Syrup',
  capsule: 'Capsule',
  injection: 'Injection',
  ointment: 'Ointment',
  drops: 'Drops',
  powder: 'Powder',
};
