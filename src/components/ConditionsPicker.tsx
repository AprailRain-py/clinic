"use client";

import { useMemo, useState } from "react";
import { CONDITIONS, conditionLabel } from "@/lib/conditions";

const KIND_TO_CLASS: Record<string, string> = {
  chronic: "chip-pine",
  acute: "chip-ochre",
  mental: "chip-plum",
  special: "chip-sky",
  intake: "chip-rust",
};

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ConditionsPicker({
  value,
  onChange,
  name,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  name?: string;
}) {
  const [custom, setCustom] = useState("");

  const set = useMemo(() => new Set(value), [value]);

  const toggle = (slug: string) => {
    const next = set.has(slug) ? value.filter((v) => v !== slug) : [...value, slug];
    onChange(next);
  };

  const customSlug = toSlug(custom);

  const addCustom = () => {
    if (!customSlug || set.has(customSlug)) return;
    onChange([...value, customSlug]);
    setCustom("");
  };

  return (
    <div className="space-y-3">
      {name ? <input type="hidden" name={name} value={value.join(",")} /> : null}

      <div className="flex flex-wrap gap-1.5">
        {CONDITIONS.map((c) => {
          const active = set.has(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(c.slug)}
              className={`chip transition ${
                active ? KIND_TO_CLASS[c.kind] : "hover:bg-[--color-paper-2]"
              }`}
              aria-pressed={active}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full transition ${
                  active ? "bg-current" : "bg-[--color-muted-2]"
                }`}
              />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="eyebrow flex items-baseline justify-between">
            <span>Add custom</span>
            {customSlug ? (
              <span
                className="font-mono text-[10px] normal-case tracking-normal text-[--color-muted]"
                data-testid="custom-slug-preview"
              >
                saved as: {customSlug}
              </span>
            ) : null}
          </label>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Parkinson's"
            className="input-field mt-1"
          />
        </div>
        <button type="button" onClick={addCustom} className="btn-ghost">
          Add
        </button>
      </div>

      {value.filter((s) => !CONDITIONS.find((c) => c.slug === s)).length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[--color-rule] pt-3">
          <span className="eyebrow mr-1 self-center">Custom</span>
          {value
            .filter((s) => !CONDITIONS.find((c) => c.slug === s))
            .map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => toggle(slug)}
                className="chip bg-[--color-paper-2]"
                title="Remove"
              >
                {conditionLabel(slug)}
                <span className="ml-0.5 text-[10px] opacity-60">×</span>
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
