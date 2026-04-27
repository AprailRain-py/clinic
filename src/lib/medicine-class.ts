export type MedicineClass =
  | "antibiotic"
  | "nsaid"
  | "ppi"
  | "antihypertensive"
  | "statin"
  | "oha"
  | "multivitamin"
  | "supplement"
  | "other";

export const MEDICINE_CLASSES: MedicineClass[] = [
  "antibiotic",
  "nsaid",
  "ppi",
  "antihypertensive",
  "statin",
  "oha",
  "multivitamin",
  "supplement",
  "other",
];

// Default duration (days) per class — research-backed:
// WHO 2023 dispensing guidance + PPI/antibiotic convention.
export const CLASS_DURATION_DAYS: Record<MedicineClass, number> = {
  antibiotic: 5,
  nsaid: 3,
  ppi: 14,
  antihypertensive: 30,
  statin: 30,
  oha: 30,
  multivitamin: 30,
  supplement: 30,
  other: 5,
};

// Keyword patterns used to classify medicines from the seed catalog.
// Matched against lowercased brand + generic + composition text.
const CLASS_KEYWORDS: Record<MedicineClass, string[]> = {
  antibiotic: [
    "amoxicillin",
    "amoxycillin",
    "amoxyclav",
    "clavulanate",
    "clavulanic",
    "ampicillin",
    "ampycillin",
    "cloxacillin",
    "cephalexin",
    "cephalosporin",
    "cefalexin",
    "cephadroxil",
    "cefadroxil",
    "cefaclor",
    "cefixime",
    "cefpodoxime",
    "cefuroxime",
    "ceftriaxone",
    "cefotaxime",
    "ceftazidime",
    "cefoperazone",
    "sulbactam",
    "tazobactam",
    "piperacillin",
    "azithromycin",
    "clarithromycin",
    "erythromycin",
    "roxithromycin",
    "doxycycline",
    "minocycline",
    "tetracycline",
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
    "ofloxacin",
    "norfloxacin",
    "gatifloxacin",
    "metronidazole",
    "tinidazole",
    "ornidazole",
    "secnidazole",
    "sulfamethoxazole",
    "trimethoprim",
    "cotrimoxazole",
    "nitrofurantoin",
    "furazolidone",
    "linezolid",
    "rifaximin",
    "rifampicin",
    "vancomycin",
    "clindamycin",
    "gentamicin",
    "amikacin",
    "tobramycin",
    "neomycin",
    "chloramphenicol",
    "fusidic",
    "mupirocin",
  ],
  nsaid: [
    "paracetamol",
    "acetaminophen",
    "ibuprofen",
    "diclofenac",
    "aceclofenac",
    "naproxen",
    "mefenamic",
    "nimesulide",
    "etoricoxib",
    "celecoxib",
    "etodolac",
    "lornoxicam",
    "ketorolac",
    "ketoprofen",
    "piroxicam",
    "aspirin",
    "acetylsalicylic",
    "tramadol",
    "serratiopeptidase",
  ],
  ppi: [
    "omeprazole",
    "pantoprazole",
    "rabeprazole",
    "esomeprazole",
    "lansoprazole",
    "dexlansoprazole",
    "ilaprazole",
  ],
  antihypertensive: [
    "amlodipine",
    "nifedipine",
    "diltiazem",
    "verapamil",
    "telmisartan",
    "losartan",
    "olmesartan",
    "valsartan",
    "irbesartan",
    "candesartan",
    "ramipril",
    "enalapril",
    "lisinopril",
    "perindopril",
    "metoprolol",
    "atenolol",
    "bisoprolol",
    "propranolol",
    "nebivolol",
    "carvedilol",
    "labetalol",
    "hydrochlorothiazide",
    "chlorthalidone",
    "indapamide",
    "furosemide",
    "spironolactone",
    "clonidine",
    "prazosin",
  ],
  statin: [
    "atorvastatin",
    "rosuvastatin",
    "simvastatin",
    "pravastatin",
    "fluvastatin",
    "pitavastatin",
  ],
  oha: [
    "metformin",
    "glimepiride",
    "glipizide",
    "gliclazide",
    "glibenclamide",
    "sitagliptin",
    "vildagliptin",
    "linagliptin",
    "saxagliptin",
    "teneligliptin",
    "empagliflozin",
    "dapagliflozin",
    "canagliflozin",
    "pioglitazone",
    "voglibose",
    "acarbose",
    "repaglinide",
  ],
  multivitamin: [
    "multivitamin",
    "multi-vitamin",
    "becosules",
    "b-complex",
    "b complex",
    "becozyme",
    "revital",
    "zincovit",
  ],
  supplement: [
    "vitamin d",
    "cholecalciferol",
    "calcitriol",
    "vitamin b12",
    "cyanocobalamin",
    "mecobalamin",
    "methylcobalamin",
    "folic acid",
    "calcium carbonate",
    "calcium citrate",
    "ferrous",
    "ferric",
    "iron sucrose",
    "iron polymaltose",
    "zinc sulphate",
    "zinc sulfate",
    "magnesium",
    "omega-3",
    "fish oil",
    "biotin",
    "vitamin c",
    "ascorbic acid",
    "evening primrose",
  ],
  other: [],
};

export function classifyMedicine(
  brand: string,
  generic: string | null | undefined,
  composition: string | null | undefined,
): MedicineClass {
  const hay = `${brand} ${generic ?? ""} ${composition ?? ""}`.toLowerCase();
  // Order matters: check antibiotic before nsaid (some combos like
  // "paracetamol + amoxicillin" would otherwise match nsaid first).
  const order: MedicineClass[] = [
    "antibiotic",
    "ppi",
    "antihypertensive",
    "statin",
    "oha",
    "multivitamin",
    "supplement",
    "nsaid",
  ];
  for (const cls of order) {
    for (const kw of CLASS_KEYWORDS[cls]) {
      if (hay.includes(kw)) return cls;
    }
  }
  return "other";
}

export function defaultDurationFor(cls: string | null | undefined): number {
  if (cls && (MEDICINE_CLASSES as string[]).includes(cls)) {
    return CLASS_DURATION_DAYS[cls as MedicineClass];
  }
  return CLASS_DURATION_DAYS.other;
}
