/** A visible, complete calendar-date cell; no clock, serial, or inferred year. */
export function visibleCalendarDate(value: string): string | null {
  const text = value.trim();
  const match = text.match(
    /^(?:(\d{4})[-/.年])?(\d{1,2})(?:[-/.]|月)(\d{1,2})(?:日|號)?(?:\s*[（(]?(?:(?:週|星期)?[一二三四五六日天]|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?)[）)]?)?$/iu,
  );
  if (!match) return null;
  // An unqualified dotted number also encodes a clock in the supported inputs.
  if (!match[1] && text.includes(".")) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!
  )
    return null;
  return `${match[1] ?? ""}:${month}:${day}`;
}
