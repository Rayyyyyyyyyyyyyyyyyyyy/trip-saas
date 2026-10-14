import type {
  SourceEvidenceUnit,
  TabularStructuralEvidence,
  UnifiedSourceDocument,
} from "./types";
import { validateUnifiedSourceDocument } from "./validateUnifiedSourceDocument";
import { visibleCalendarDate } from "./calendarDateEvidence";

export type InterpretationChunkPlan = {
  source: UnifiedSourceDocument;
  ownedIds: readonly string[];
  contextIds: readonly string[];
};

export class SourceChunkPlanningError extends Error {
  readonly code: "source_document_invalid" | "preflight_limit";

  constructor(
    code: "source_document_invalid" | "preflight_limit" = "preflight_limit",
  ) {
    super(
      "Source cannot be split within the configured interpretation limits.",
    );
    this.name = "SourceChunkPlanningError";
    this.code = code;
  }
}

type RowBand = { units: SourceEvidenceUnit[]; lastRow: number };
type SheetBands = {
  bands: RowBand[];
  firstPopulatedBands: Set<RowBand>;
  dateBoundaries?: Set<RowBand>;
  dateContextByBand?: Map<RowBand, RowBand>;
  axisUnits?: SourceEvidenceUnit[];
};
const region = (unit: SourceEvidenceUnit) =>
  unit.structural_evidence[0] as TabularStructuralEvidence;
const populated = (unit: SourceEvidenceUnit) =>
  unit.display_value.trim().length > 0 || unit.raw_value.trim().length > 0;

/** Split structure, never text: ownership partitions the original evidence. */
export function planSourceChunks(
  source: UnifiedSourceDocument,
  options: {
    maxOwnedEvidenceUnits?: number;
    maxChunks?: number;
    fits?: (
      source: UnifiedSourceDocument,
      plan?: InterpretationChunkPlan,
    ) => boolean;
  } = {},
): InterpretationChunkPlan[] {
  const target = options.maxOwnedEvidenceUnits ?? 16;
  const maxChunks = options.maxChunks ?? 32;
  if (
    !Number.isSafeInteger(target) ||
    target < 1 ||
    !Number.isSafeInteger(maxChunks) ||
    maxChunks < 1
  ) {
    throw new SourceChunkPlanningError();
  }
  if (
    !validateUnifiedSourceDocument(source, { source_id: source.source_id })
      .valid
  ) {
    throw new SourceChunkPlanningError("source_document_invalid");
  }
  const fits = options.fits ?? (() => true);
  if (source.source_format !== "tabular") {
    const plan = {
      source,
      ownedIds: source.evidence_units.map((u) => u.id),
      contextIds: [],
    };
    if (!fits(source, plan)) throw new SourceChunkPlanningError();
    return [plan];
  }

  const sheets = new Map<string, SheetBands>();
  const bandById = new Map<string, RowBand>();
  const unitsById = new Map(
    source.evidence_units.map((unit) => [unit.id, unit]),
  );
  for (const unit of source.evidence_units) {
    const evidence = region(unit);
    for (const ref of [unit.parent_ref, evidence.header_ref]) {
      if (
        ref !== null &&
        region(unitsById.get(ref)!).sheet_id !== evidence.sheet_id
      ) {
        throw new SourceChunkPlanningError("source_document_invalid");
      }
    }
    let sheet = sheets.get(evidence.sheet_id);
    if (!sheet) {
      sheet = { bands: [], firstPopulatedBands: new Set() };
      sheets.set(evidence.sheet_id, sheet);
    }
    let band = sheet.bands.at(-1);
    // A vertical merge extends the complete band through its final row. Any
    // overlapping merge extends it further, so covered children cannot be cut.
    if (!band || evidence.row_start > band.lastRow) {
      band = { units: [], lastRow: evidence.row_end };
      sheet.bands.push(band);
    }
    band.units.push(unit);
    band.lastRow = Math.max(band.lastRow, evidence.row_end);
    bandById.set(unit.id, band);
  }
  for (const sheet of sheets.values()) {
    const firstRows = new Set<number>();
    for (const band of sheet.bands) {
      for (const unit of band.units) {
        if (populated(unit) && firstRows.size < 2)
          firstRows.add(region(unit).row_start);
        if (firstRows.has(region(unit).row_start))
          sheet.firstPopulatedBands.add(band);
      }
    }
  }

  const groups: SheetBands[] = [];
  for (const sheet of sheets.values()) {
    const units = sheet.bands.flatMap((band) => band.units);
    const firstPopulated = units.find(populated);
    const headerRow = firstPopulated && region(firstPopulated).row_start;
    const dateHeaders = units.filter(
      (unit) =>
        region(unit).row_start === headerRow &&
        visibleCalendarDate(unit.display_value) !== null,
    );
    const distinctDates = new Set(
      dateHeaders.map((unit) => visibleCalendarDate(unit.display_value)),
    );
    const dateKeys = [...distinctDates] as string[];
    const ambiguousYears = dateKeys.some((date, index) => {
      const [year, month, day] = date.split(":");
      return dateKeys.slice(index + 1).some((other) => {
        const [otherYear, otherMonth, otherDay] = other.split(":");
        return (
          month === otherMonth && day === otherDay && (!year || !otherYear)
        );
      });
    });
    if (
      dateHeaders.length >= 2 &&
      distinctDates.size === dateHeaders.length &&
      !ambiguousYears
    ) {
      // Every date starts an original column region. A horizontal merge that
      // spans date columns joins those regions instead of being split.
      const starts = dateHeaders.map((unit) => region(unit).column_start);
      const owner = starts.map((_column, index) => index);
      const find = (index: number): number =>
        owner[index] === index ? index : (owner[index] = find(owner[index]!));
      const indexAt = (column: number) => {
        let index = starts.length - 1;
        while (index > 0 && starts[index]! > column) index -= 1;
        return index;
      };
      for (const unit of units) {
        const evidence = region(unit);
        const first = indexAt(evidence.column_start);
        const last = indexAt(evidence.column_end);
        for (let index = first + 1; index <= last; index += 1)
          owner[find(index)] = find(first);
      }
      const partitions = new Map<number, SourceEvidenceUnit[]>();
      for (const unit of units) {
        const key = find(indexAt(region(unit).column_start));
        const members = partitions.get(key) ?? [];
        members.push(unit);
        partitions.set(key, members);
      }
      const axisUnits = units.filter(
        (unit) => region(unit).column_end < starts[0]!,
      );
      for (const members of partitions.values()) {
        const ids = new Set(members.map((unit) => unit.id));
        groups.push({
          bands: sheet.bands
            .map((band) => ({
              ...band,
              units: band.units.filter((unit) => ids.has(unit.id)),
            }))
            .filter((band) => band.units.length > 0),
          firstPopulatedBands: sheet.firstPopulatedBands,
          axisUnits,
        });
      }
    } else {
      const dateBoundaries = new Set<RowBand>();
      const dateContextByBand = new Map<RowBand, RowBand>();
      let previousDate: string | null = null;
      let dateBand: RowBand | undefined;
      const leadingColumn = Math.min(
        ...units.map((unit) => region(unit).column_start),
      );
      for (const band of sheet.bands) {
        const dates = band.units
          .filter((unit) => region(unit).column_start === leadingColumn)
          .map((unit) => visibleCalendarDate(unit.display_value))
          .filter((date) => date !== null);
        const date = dates.length > 0 ? [...new Set(dates)].join("|") : null;
        if (date !== null) {
          if (previousDate !== null && date !== previousDate)
            dateBoundaries.add(band);
          previousDate = date;
          dateBand = band;
        }
        if (dateBand) dateContextByBand.set(band, dateBand);
      }
      groups.push({ ...sheet, dateBoundaries, dateContextByBand });
    }
  }

  function makePlan(
    sheet: SheetBands,
    start: number,
    end: number,
  ): InterpretationChunkPlan {
    const owned = sheet.bands.slice(start, end).flatMap((band) => band.units);
    const ownedIds = new Set(owned.map((unit) => unit.id));
    const includedBands = new Set<RowBand>([
      ...sheet.firstPopulatedBands,
      ...sheet.bands.slice(
        Math.max(0, start - 2),
        Math.min(sheet.bands.length, end + 1),
      ),
    ]);
    const dateContext = sheet.dateContextByBand?.get(sheet.bands[start]!);
    if (dateContext) includedBands.add(dateContext);
    if (sheet.axisUnits) {
      const firstRow = Math.min(...owned.map((unit) => region(unit).row_start));
      const lastRow = Math.max(...owned.map((unit) => region(unit).row_end));
      const axis = sheet.axisUnits.filter(
        (unit) =>
          region(unit).row_start <= lastRow && region(unit).row_end >= firstRow,
      );
      if (axis.length > 0) includedBands.add({ units: axis, lastRow });
    }
    const wantedColumns = new Set<number>();
    for (const unit of owned) {
      const evidence = region(unit);
      for (
        let column = evidence.column_start;
        column <= evidence.column_end;
        column += 1
      ) {
        wantedColumns.add(column);
      }
    }
    // A blank date/header column may continue far beyond the adjacent bands.
    // Carry the closest previous populated original cell for every owned column,
    // without guessing which column means a date, title, or inherited value.
    for (
      let index = start - 1;
      index >= 0 && wantedColumns.size > 0;
      index -= 1
    ) {
      const band = sheet.bands[index]!;
      for (let offset = band.units.length - 1; offset >= 0; offset -= 1) {
        const unit = band.units[offset]!;
        if (!populated(unit)) continue;
        const evidence = region(unit);
        let needed = false;
        for (
          let column = evidence.column_start;
          column <= evidence.column_end;
          column += 1
        ) {
          if (wantedColumns.delete(column)) needed = true;
        }
        if (needed) includedBands.add(band);
      }
    }
    // Adding complete reference bands also retains merges and covered children
    // reached indirectly through a header or parent chain.
    for (const band of includedBands) {
      for (const unit of band.units) {
        const refs = [unit.parent_ref, region(unit).header_ref];
        for (const ref of refs) {
          if (ref === null) continue;
          const referenced = unitsById.get(ref);
          const referencedBand = referenced && bandById.get(referenced.id);
          if (!referencedBand)
            throw new SourceChunkPlanningError("source_document_invalid");
          includedBands.add(referencedBand);
        }
      }
    }
    const includedIds = new Set(
      [...includedBands].flatMap((band) => band.units.map((unit) => unit.id)),
    );
    const units = source.evidence_units.filter((unit) =>
      includedIds.has(unit.id),
    );
    const document: UnifiedSourceDocument = {
      ...source,
      evidence_units: units.map((unit, index) => ({
        ...unit,
        source_order: index,
      })),
      extraction_findings: source.extraction_findings.filter((finding) =>
        includedIds.has(finding.evidence_unit_ref),
      ),
    };
    if (
      !validateUnifiedSourceDocument(document, { source_id: source.source_id })
        .valid
    ) {
      throw new SourceChunkPlanningError("source_document_invalid");
    }
    return {
      source: document,
      ownedIds: owned.map((unit) => unit.id),
      contextIds: units
        .filter((unit) => !ownedIds.has(unit.id))
        .map((unit) => unit.id),
    };
  }

  const plans: InterpretationChunkPlan[] = [];
  for (const sheet of groups) {
    let start = 0;
    while (start < sheet.bands.length) {
      let end = start + 1;
      let plan: InterpretationChunkPlan | undefined;
      let fittingEnd = start;
      let ownedCount = 0;
      while (end <= sheet.bands.length) {
        if (end > start + 1 && sheet.dateBoundaries?.has(sheet.bands[end - 1]!))
          break;
        ownedCount += sheet.bands[end - 1]!.units.length;
        // The first band is atomic, even when it exceeds the soft target.
        if (end > start + 1 && ownedCount > target) break;
        const candidate = makePlan(sheet, start, end);
        // Scope metadata shrinks as context becomes owned. Budget acceptance
        // is therefore not monotonic: inspect every legal endpoint.
        if (fits(candidate.source, candidate)) {
          plan = candidate;
          fittingEnd = end;
        }
        end += 1;
      }
      if (!plan) throw new SourceChunkPlanningError();
      plans.push(plan);
      if (plans.length > maxChunks) throw new SourceChunkPlanningError();
      start = fittingEnd;
    }
  }
  return plans;
}
