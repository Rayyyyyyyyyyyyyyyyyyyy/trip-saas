import type { ParsedTripDraft, TripFinding } from "../trip/types";
import type { ValidatedUnifiedSourceDocument } from "./types";

export type TabularDateDecision = {
  finding_id: string;
  target:
    | { kind: "trip"; field: "start_date" | "end_date" }
    | { kind: "day"; day_id: string; field: "date" };
  before: string;
  source_refs: string[];
  partial_text: string | null;
};

const MAX_DATE_SUMMARY_CHARS = 4000;

function boundedDateSummary(text: string) {
  if (text.length <= MAX_DATE_SUMMARY_CHARS) return text;
  let end = MAX_DATE_SUMMARY_CHARS - 1;
  if (/^[\uDC00-\uDFFF]$/.test(text[end] ?? "")) end -= 1;
  // The ellipsis marks a summary boundary; source_refs retain all evidence.
  return `${text.slice(0, end)}…`;
}

function stableFindingId(identity: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < identity.length; index++) {
    const code = identity.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `finding:local-fidelity:missing_year:${(first >>> 0).toString(36)}:${(second >>> 0).toString(36)}`;
}

function partialDateText(texts: string[], before: string): string | null {
  const [, month, day] = before.split("-").map(Number);
  for (const text of texts) {
    // Keep the entire matching displayed cell: weekday, theme and other intent
    // must survive alongside the date. Never reconstruct text from the ISO value.
    for (const pattern of [
      /(?<!\d)(?<text>(?:\d{4}[/.\-])?(?<month>1[0-2]|0?[1-9])[/.\-](?<day>3[01]|[12]\d|0?[1-9]))(?!\d)/gu,
      /(?<!\d)(?<text>(?:\d{4}年)?(?<month>1[0-2]|0?[1-9])月(?<day>3[01]|[12]\d|0?[1-9])(?:日|號)?)(?!\d)/gu,
    ]) {
      for (const match of text.matchAll(pattern)) {
        if (
          Number(match.groups?.month) === month &&
          Number(match.groups?.day) === day
        )
          return boundedDateSummary(text);
      }
    }
  }
  const summary = texts.filter((text) => text.trim()).join("\n");
  if (!summary) return null;
  // This bounds only the summary. source_refs retain every cited evidence unit.
  return boundedDateSummary(summary);
}

/**
 * A necessary visible-year check, not proof of complete date fidelity. The
 * source-backed decisions stay in memory and never extend the provider schema.
 */
export function assessTabularDateSupport(
  draft: ParsedTripDraft,
  source: ValidatedUnifiedSourceDocument,
): { findings: TripFinding[]; dateDecisions: TabularDateDecision[] } {
  const findings: TripFinding[] = [];
  const dateDecisions: TabularDateDecision[] = [];
  if (source.source_format !== "tabular") return { findings, dateDecisions };

  const unitsById = new Map(
    source.evidence_units.map((unit) => [unit.id, unit]),
  );
  const coveredIds = new Set(
    source.extraction_findings
      .filter((finding) => finding.code === "COVERED_CELL_CONTENT")
      .map((finding) => finding.evidence_unit_ref),
  );
  const assess = (
    target: TabularDateDecision["target"],
    before: string | null,
    sourceRefs: string[],
  ) => {
    if (before === null) return;
    const texts = sourceRefs.flatMap((ref) => {
      const unit = unitsById.get(ref);
      return unit && !coveredIds.has(ref) ? [unit.display_value] : [];
    });
    const year = before.slice(0, 4);
    const visibleYear = new RegExp(`(?:^|[^0-9])${year}(?![0-9])`, "u");
    if (texts.some((text) => visibleYear.test(text))) return;

    const id = stableFindingId(
      JSON.stringify([source.source_id, target, before, sourceRefs]),
    );
    findings.push({
      id,
      code: "MISSING_YEAR",
      severity: "review",
      blocking: false,
      message: `引用的可見原文沒有支持「${before}」的年份；請保留原文與未指定完整日期，無須補填年份。`,
      entity_refs: [],
      source_refs: [...sourceRefs],
    });
    dateDecisions.push({
      finding_id: id,
      target,
      before,
      source_refs: [...sourceRefs],
      partial_text: partialDateText(texts, before),
    });
  };
  for (const field of ["start_date", "end_date"] as const)
    assess({ kind: "trip", field }, draft.trip[field], draft.trip.source_refs);
  for (const day of draft.days)
    assess(
      { kind: "day", day_id: day.id, field: "date" },
      day.date,
      day.source_refs,
    );
  return { findings, dateDecisions };
}
