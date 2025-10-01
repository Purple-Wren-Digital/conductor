type DateLike = Date | string | number | null | undefined;

const toDate = (dateData: DateLike): Date | undefined => {
  if (dateData == null) return undefined;
  if (dateData instanceof Date)
    return Number.isNaN(dateData.getTime()) ? undefined : dateData;
  const date = new Date(dateData);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const sameDueDate = (
  a: DateLike,
  b: DateLike,
  granularity: "day" | "ms" = "ms"
): boolean => {
  const original = toDate(a);
  const current = toDate(b);
  if (!original && !current) return true; // both "no date"
  if (!original || !current) return false; // one has date, the other doesn't

  if (granularity === "day") {
    return (
      original.getFullYear() === current.getFullYear() &&
      original.getMonth() === current.getMonth() &&
      original.getDate() === current.getDate()
    );
  }
  return original.getTime() === current.getTime();
};

export function differentDueDate(
  a: DateLike,
  b: DateLike,
  granularity: "day" | "ms" = "ms"
): { isChanged: "unchanged" | "changed" } {
  const original = toDate(a);
  const current = toDate(b);

  if (!original && !current) return { isChanged: "unchanged" };
  if (!original && current) return { isChanged: "changed" };
  if (original && !current) return { isChanged: "changed" };

  return sameDueDate(original, current, granularity)
    ? { isChanged: "unchanged" }
    : { isChanged: "changed" };
}

// Convenience wrapper keeping your original name/signature:
export const hasDueDateChanged = (
  initial?: Date | null,
  current?: Date | null
) => differentDueDate(initial, current, "day"); // use "ms" if you care about time, not just date

