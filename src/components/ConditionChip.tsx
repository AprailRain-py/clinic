import { CONDITION_BY_SLUG, conditionLabel } from "@/lib/conditions";

const KIND_TO_CLASS: Record<string, string> = {
  chronic: "chip-pine",
  acute: "chip-ochre",
  mental: "chip-plum",
  special: "chip-sky",
};

export function ConditionChip({ slug, size = "md" }: { slug: string; size?: "sm" | "md" }) {
  const c = CONDITION_BY_SLUG[slug];
  const cls = c ? KIND_TO_CLASS[c.kind] : "";
  return (
    <span
      className={`chip ${cls} ${size === "sm" ? "text-[10px] py-[1px] px-2" : ""}`}
    >
      {conditionLabel(slug)}
    </span>
  );
}
