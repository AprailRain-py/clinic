const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LONG_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function relativeDate(
  input: string | number | Date,
  now: Date = new Date(),
): string {
  const d =
    input instanceof Date
      ? input
      : typeof input === "number"
        ? new Date(input)
        : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);

  const days = Math.round((startOfDay(now) - startOfDay(d)) / MS_PER_DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days === -1) return "Tomorrow";
  if (days < -1 && days > -7) return `in ${-days} days`;
  return LONG_FMT.format(d);
}

export function longDate(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return LONG_FMT.format(d);
}
