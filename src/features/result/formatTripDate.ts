const ISO_CALENDAR_DATE = /^\d{4}-(\d{2})-(\d{2})$/;
const SOURCE_MONTH_DAY = /(?:^|[^\d])(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/;

function formatSourceMonthDay(label: string | null | undefined): string | null {
  if (!label) return null;
  const match = SOURCE_MONTH_DAY.exec(label);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const maximumDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
  if (!maximumDay || day < 1 || day > maximumDay) return null;
  return `${month}/${day}`;
}

export function formatTripMonthDay(
  date: string | null,
  sourceLabel?: string | null,
): string {
  if (date === null) return formatSourceMonthDay(sourceLabel) ?? "日期未定";
  const match = ISO_CALENDAR_DATE.exec(date);
  return match ? `${match[1]}/${match[2]}` : date;
}
