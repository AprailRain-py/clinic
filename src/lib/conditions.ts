export type Condition = {
  slug: string;
  label: string;
  kind: "chronic" | "acute" | "mental" | "special";
};

export const CONDITIONS: Condition[] = [
  { slug: "diabetes", label: "Diabetes", kind: "chronic" },
  { slug: "hypertension", label: "Hypertension", kind: "chronic" },
  { slug: "heart-disease", label: "Heart disease", kind: "chronic" },
  { slug: "asthma", label: "Asthma", kind: "chronic" },
  { slug: "thyroid", label: "Thyroid", kind: "chronic" },
  { slug: "cholesterol", label: "High cholesterol", kind: "chronic" },
  { slug: "arthritis", label: "Arthritis", kind: "chronic" },
  { slug: "kidney", label: "Kidney disease", kind: "chronic" },
  { slug: "liver", label: "Liver disease", kind: "chronic" },
  { slug: "anemia", label: "Anemia", kind: "chronic" },
  { slug: "obesity", label: "Obesity", kind: "chronic" },
  { slug: "migraine", label: "Migraine", kind: "chronic" },
  { slug: "pcos", label: "PCOS", kind: "chronic" },
  { slug: "pregnancy", label: "Pregnancy", kind: "special" },
  { slug: "allergy", label: "Allergy", kind: "acute" },
  { slug: "anxiety", label: "Anxiety", kind: "mental" },
  { slug: "depression", label: "Depression", kind: "mental" },
];

export const CONDITION_BY_SLUG = Object.fromEntries(
  CONDITIONS.map((c) => [c.slug, c]),
) as Record<string, Condition>;

export function conditionLabel(slug: string): string {
  return (
    CONDITION_BY_SLUG[slug]?.label ??
    slug
      .split("-")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function parseConditions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}
