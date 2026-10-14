import { describe, expect, it, vi } from "vitest";
import {
  planSourceChunks,
  SourceChunkPlanningError,
} from "../../src/domain/source/planSourceChunks";
import type {
  SourceEvidenceUnit,
  TabularStructuralEvidence,
  UnifiedSourceDocument,
} from "../../src/domain/source/types";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { validMarkdownSourceDocument } from "../fixtures/contracts/sourceDocuments";
import { visibleCalendarDate } from "../../src/domain/source/calendarDateEvidence";

function cell(
  row: number,
  column: number,
  value = `value ${row},${column}`,
  options: {
    rowEnd?: number;
    columnEnd?: number;
    parent?: string;
    header?: string;
    merge?: string;
    sheet?: string;
    sheetOrder?: number;
  } = {},
): SourceEvidenceUnit {
  const sheet = options.sheet ?? "Calendar";
  const point = (r: number, c: number) => `${String.fromCharCode(64 + c)}${r}`;
  const first = point(row, column);
  const last = point(options.rowEnd ?? row, options.columnEnd ?? column);
  const locator = `sheet:${sheet}!${first}${first === last ? "" : `:${last}`}`;
  return {
    id: `${sheet}:r${row}c${column}`,
    source_order: 0,
    parent_ref: options.parent ?? null,
    locator,
    raw_value: value,
    display_value: value,
    links: [],
    structural_evidence: [
      {
        evidence_kind: "tabular_region",
        sheet_id: `sheet:${sheet}`,
        sheet_name: sheet,
        sheet_order: options.sheetOrder ?? 0,
        row_start: row,
        row_end: options.rowEnd ?? row,
        column_start: column,
        column_end: options.columnEnd ?? column,
        header_ref: options.header ?? null,
        merge_ref: options.merge ?? (first === last ? null : locator),
      },
    ],
  };
}

function document(units: SourceEvidenceUnit[]): UnifiedSourceDocument {
  return {
    schema_version: "unified-source-document.v1",
    source_id: "source:region-fixture",
    display_name: "Calendar.xlsx",
    input_mode: "spreadsheet_file",
    source_format: "tabular",
    evidence_units: units.map((unit, source_order) => ({
      ...unit,
      source_order,
    })),
    extraction_findings: [],
    excluded_sheets: ["Hidden expenses"],
  };
}

function grid(rows: number, columns = 2) {
  return document(
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => cell(row + 1, column + 1)),
    ).flat(),
  );
}

const evidence = (unit: SourceEvidenceUnit) =>
  unit.structural_evidence[0] as TabularStructuralEvidence;

describe("structural region chunk planning", () => {
  it.each([
    ["8/16", ":8:16"],
    ["8月16日", ":8:16"],
    ["2026-08-16", "2026:8:16"],
    ["2026.08.16（日）", "2026:8:16"],
    ["12:30", null],
    ["5.30", null],
    ["8/16 或 8/17", null],
    ["2026.08", null],
    ["2/30", null],
  ])("uses only unequivocal visible calendar dates: %s", (text, expected) => {
    expect(visibleCalendarDate(text)).toBe(expected);
  });

  it("prefers leading-column date groups without filling in an absent year", () => {
    const source = grid(11);
    source.evidence_units[0]!.raw_value =
      source.evidence_units[0]!.display_value = "日期";
    for (const [row, date] of [
      [3, "8/16"],
      [6, "8/17"],
      [9, "8月18日"],
    ] as const) {
      const unit = source.evidence_units.find(
        (unit) =>
          evidence(unit).row_start === row && evidence(unit).column_start === 1,
      )!;
      unit.raw_value = unit.display_value = date;
      evidence(unit).typed_hint = {
        kind: "date_serial",
        value: 46250,
        date_system: "1900",
      };
    }
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 100 });
    expect(plans).toHaveLength(3);
    expect(
      plans.map((plan) =>
        plan.ownedIds.filter((id) =>
          ["Calendar:r3c1", "Calendar:r6c1", "Calendar:r9c1"].includes(id),
        ),
      ),
    ).toEqual([["Calendar:r3c1"], ["Calendar:r6c1"], ["Calendar:r9c1"]]);
    expect(plans.flatMap((plan) => plan.ownedIds)).toEqual(
      source.evidence_units.map((unit) => unit.id),
    );
    expect(
      plans[1]!.source.evidence_units.find(
        (unit) => unit.id === "Calendar:r6c1",
      )!.display_value,
    ).toBe("8/17");
  });

  it("keeps a distant visible date as context when one long day needs sparse-row subchunks", () => {
    const units = [cell(1, 1, "日期"), cell(1, 2, "活動"), cell(2, 1, "8/16")];
    for (let row = 3; row <= 18; row += 1) units.push(cell(row, 2));
    units.push(cell(19, 1, "8/17"));
    for (let row = 20; row <= 38; row += 1) units.push(cell(row, 2));
    const source = document(units);
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 4 });
    const late = plans.find((plan) =>
      plan.ownedIds.includes("Calendar:r36c2"),
    )!;
    expect(late.contextIds).toContain("Calendar:r19c1");
    expect(
      late.source.evidence_units.find((unit) => unit.id === "Calendar:r19c1")!
        .display_value,
    ).toBe("8/17");
    expect(plans.flatMap((plan) => plan.ownedIds)).toEqual(
      source.evidence_units.map((unit) => unit.id),
    );
    expect(plans.every((plan) => plan.ownedIds.length <= 4)).toBe(true);
  });

  it("prefers distinct date columns and carries the matching original time axis with single ownership", () => {
    const source = grid(5, 3);
    source.evidence_units[0]!.raw_value =
      source.evidence_units[0]!.display_value = "時間";
    source.evidence_units[1]!.raw_value =
      source.evidence_units[1]!.display_value = "8/16";
    source.evidence_units[2]!.raw_value =
      source.evidence_units[2]!.display_value = "8/17";
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 100 });
    expect(plans).toHaveLength(2);
    expect(plans[0]!.ownedIds.every((id) => !id.endsWith("c3"))).toBe(true);
    expect(plans[1]!.ownedIds.every((id) => id.endsWith("c3"))).toBe(true);
    expect(plans[1]!.contextIds).toEqual(
      expect.arrayContaining(
        source.evidence_units
          .filter((unit) => evidence(unit).column_start === 1)
          .map((unit) => unit.id),
      ),
    );
    const owned = plans.flatMap((plan) => plan.ownedIds);
    expect(new Set(owned).size).toBe(source.evidence_units.length);
    expect([...owned].sort()).toEqual(
      source.evidence_units.map((unit) => unit.id).sort(),
    );
  });

  it.each([
    ["12:30", "14:00"],
    ["5.30", "6.01"],
    ["8/16 或 8/17", "8/18"],
    ["8/16", "2026/8/16"],
  ])(
    "falls back to row structure for clock or ambiguous date headers %s / %s",
    (first, second) => {
      const source = grid(4, 3);
      source.evidence_units[1]!.raw_value =
        source.evidence_units[1]!.display_value = first;
      source.evidence_units[2]!.raw_value =
        source.evidence_units[2]!.display_value = second;
      const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 3 });
      expect(plans).toHaveLength(4);
      expect(
        plans.every(
          (plan) =>
            new Set(plan.ownedIds.map((id) => id.split("c")[0])).size === 1,
        ),
      ).toBe(true);
    },
  );

  it("joins date columns bridged by a horizontal merge rather than cutting it", () => {
    const source = document([
      cell(1, 1, "時間"),
      cell(1, 2, "8/16"),
      cell(1, 3, "8/17"),
      cell(2, 1, "08:00"),
      cell(2, 2, "Shared booking", { columnEnd: 3 }),
      cell(3, 1, "09:00"),
      cell(3, 2),
      cell(3, 3),
    ]);
    const [plan] = planSourceChunks(source, { maxOwnedEvidenceUnits: 100 });
    expect(plan!.ownedIds).toHaveLength(source.evidence_units.length);
    expect(
      plan!.source.evidence_units.find((unit) => unit.id === "Calendar:r2c2")!
        .locator,
    ).toBe("sheet:Calendar!B2:C2");
  });

  it("keeps vertical merge families atomic inside date-column batches", () => {
    const source = document([
      cell(1, 1, "時間"),
      cell(1, 2, "8/16"),
      cell(1, 3, "8/17"),
      cell(2, 1),
      cell(2, 2, "Venue", { rowEnd: 4 }),
      cell(2, 3),
      cell(3, 1),
      cell(3, 2, "Covered venue", {
        parent: "Calendar:r2c2",
        merge: "sheet:Calendar!B2:B4",
      }),
      cell(3, 3),
      cell(4, 1),
      cell(4, 3),
      cell(5, 1),
      cell(5, 2),
      cell(5, 3),
    ]);
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 3 });
    expect(
      plans.filter((plan) => plan.ownedIds.includes("Calendar:r2c2")),
    ).toHaveLength(1);
    const owner = plans.find((plan) =>
      plan.ownedIds.includes("Calendar:r2c2"),
    )!;
    expect(owner.ownedIds).toContain("Calendar:r3c2");
    expect(
      plans.every(
        (plan) =>
          validateUnifiedSourceDocument(plan.source, {
            source_id: source.source_id,
          }).valid,
      ),
    ).toBe(true);
    expect(plans.flatMap((plan) => plan.ownedIds)).toHaveLength(
      source.evidence_units.length,
    );
  });

  it("retains one unchanged Markdown source and rejects a non-fitting original", () => {
    const [plan] = planSourceChunks(validMarkdownSourceDocument);
    expect(plan!.source).toBe(validMarkdownSourceDocument);
    expect(plan!.ownedIds).toEqual(
      validMarkdownSourceDocument.evidence_units.map((unit) => unit.id),
    );
    expect(plan!.contextIds).toEqual([]);
    expect(() =>
      planSourceChunks(validMarkdownSourceDocument, { fits: () => false }),
    ).toThrow(SourceChunkPlanningError);
  });

  it("partitions every original cell once, preserves identity and exact evidence, and validates every local source", () => {
    const source = grid(12);
    source.evidence_units[9]!.links.push({
      kind: "link",
      label: "Map",
      target: "https://maps.example/exact",
    });
    evidence(source.evidence_units[9]!).cached_display_value = "8/16";
    evidence(source.evidence_units[9]!).typed_hint = {
      kind: "date_serial",
      value: 46250,
      date_system: "1900",
    };
    source.extraction_findings.push({
      code: "CACHED_VALUE_ERROR",
      severity: "warning",
      message: "Original warning",
      evidence_unit_ref: source.evidence_units[9]!.id,
      locator: source.evidence_units[9]!.locator,
      target: "#VALUE!",
    });
    const before = structuredClone(source);
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 4 });
    const ids = plans.flatMap((plan) => plan.ownedIds);
    expect(ids).toEqual(source.evidence_units.map((unit) => unit.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(plans).toHaveLength(6);
    for (const plan of plans) {
      expect(plan.source.source_id).toBe(source.source_id);
      expect(plan.source.excluded_sheets).toEqual(source.excluded_sheets);
      expect(
        validateUnifiedSourceDocument(plan.source, {
          source_id: source.source_id,
        }).valid,
      ).toBe(true);
      expect(plan.contextIds.every((id) => !plan.ownedIds.includes(id))).toBe(
        true,
      );
      expect([...plan.ownedIds, ...plan.contextIds].sort()).toEqual(
        plan.source.evidence_units.map((unit) => unit.id).sort(),
      );
      for (const [index, unit] of plan.source.evidence_units.entries()) {
        expect(unit.source_order).toBe(index);
        const original = source.evidence_units.find(
          (candidate) => candidate.id === unit.id,
        )!;
        expect({ ...unit, source_order: original.source_order }).toEqual(
          original,
        );
      }
      expect(plan.source.extraction_findings).toEqual(
        source.extraction_findings.filter((finding) =>
          plan.source.evidence_units.some(
            (unit) => unit.id === finding.evidence_unit_ref,
          ),
        ),
      );
    }
    expect(source).toEqual(before);
    expect(
      plans.filter((plan) => plan.contextIds.includes("Calendar:r1c1")).length,
    ).toBeGreaterThan(1);
  });

  it("keeps transitive vertical merges, complete rows and covered children indivisible", () => {
    const source = document([
      cell(1, 1),
      cell(1, 2),
      cell(2, 1, "August 16", { rowEnd: 4 }),
      cell(2, 2),
      cell(3, 1, "covered content", {
        parent: "Calendar:r2c1",
        merge: "sheet:Calendar!A2:A4",
      }),
      cell(3, 2, "Venue program", { rowEnd: 5 }),
      cell(4, 2, "covered program", {
        parent: "Calendar:r3c2",
        merge: "sheet:Calendar!B3:B5",
      }),
      cell(5, 1),
      cell(6, 1),
      cell(6, 2),
    ]);
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 2 });
    const mergedIds = source.evidence_units
      .filter(
        (unit) =>
          evidence(unit).row_start >= 2 && evidence(unit).row_start <= 5,
      )
      .map((unit) => unit.id);
    expect(plans).toHaveLength(3);
    expect(plans[1]!.ownedIds).toEqual(mergedIds);
    expect(plans[1]!.ownedIds.length).toBeGreaterThan(2);
    for (const plan of plans) {
      const present = new Set(
        plan.source.evidence_units.map((unit) => unit.id),
      );
      if (mergedIds.some((id) => present.has(id)))
        expect(mergedIds.every((id) => present.has(id))).toBe(true);
    }
  });

  it("carries calendar columns and original first populated rows without inventing header refs", () => {
    const source = grid(7, 4);
    source.evidence_units.slice(0, 4).forEach((unit, index) => {
      unit.raw_value = unit.display_value = ["", "8/16", "8/17", "8/18"][
        index
      ]!;
    });
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 4 });
    const last = plans.at(-1)!;
    expect(last.contextIds).toEqual(
      expect.arrayContaining(
        source.evidence_units.slice(0, 8).map((unit) => unit.id),
      ),
    );
    expect(
      last.source.evidence_units.every(
        (unit) => evidence(unit).header_ref === null,
      ),
    ).toBe(true);
    expect(last.ownedIds.every((id) => id.endsWith("c4"))).toBe(true);
    expect(last.ownedIds).toContain("Calendar:r7c4");
  });

  it("uses the first two populated original rows even when the sheet starts with blanks", () => {
    const source = grid(12, 1);
    source.evidence_units.slice(0, 2).forEach((unit) => {
      unit.raw_value = unit.display_value = "";
    });
    const last = planSourceChunks(source, { maxOwnedEvidenceUnits: 1 }).at(-1)!;
    expect(last.contextIds).toEqual(
      expect.arrayContaining(["Calendar:r3c1", "Calendar:r4c1"]),
    );
    expect(last.contextIds).not.toContain("Calendar:r1c1");
    expect(last.contextIds).not.toContain("Calendar:r2c1");
  });

  it("adds the preceding two bands, next band, and distant previous populated original column cell", () => {
    const source = grid(12);
    source.evidence_units.forEach((unit) => {
      if (evidence(unit).column_start === 1 && evidence(unit).row_start > 3)
        unit.raw_value = unit.display_value = "";
    });
    source.evidence_units[4]!.raw_value =
      source.evidence_units[4]!.display_value = "8/16";
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 2 });
    const row10 = plans.find((plan) =>
      plan.ownedIds.includes("Calendar:r10c1"),
    )!;
    expect(row10.contextIds).toEqual(
      expect.arrayContaining([
        "Calendar:r1c1",
        "Calendar:r2c1",
        "Calendar:r3c1",
        "Calendar:r8c1",
        "Calendar:r9c1",
        "Calendar:r11c1",
      ]),
    );
    expect(
      row10.source.evidence_units.some((unit) => unit.id === "Calendar:r7c1"),
    ).toBe(false);
    expect(
      row10.source.evidence_units.find((unit) => unit.id === "Calendar:r10c1")!
        .display_value,
    ).toBe("");
  });

  it("recursively includes original parent and header bands beyond nearby context", () => {
    const source = grid(14);
    source.evidence_units[8]!.parent_ref = "Calendar:r3c1";
    evidence(source.evidence_units[16]!).header_ref = "Calendar:r5c1";
    evidence(source.evidence_units[24]!).header_ref = "Calendar:r9c1";
    const plan = planSourceChunks(source, { maxOwnedEvidenceUnits: 2 }).find(
      (candidate) => candidate.ownedIds.includes("Calendar:r13c1"),
    )!;
    expect(plan.contextIds).toEqual(
      expect.arrayContaining([
        "Calendar:r3c1",
        "Calendar:r3c2",
        "Calendar:r5c1",
        "Calendar:r5c2",
        "Calendar:r9c1",
        "Calendar:r9c2",
      ]),
    );
    expect(
      evidence(
        plan.source.evidence_units.find(
          (unit) => unit.id === "Calendar:r13c1",
        )!,
      ).header_ref,
    ).toBe("Calendar:r9c1");
  });

  it("keeps separate original sheet coordinates and partitions each selected sheet", () => {
    const source = document([
      ...grid(4).evidence_units,
      cell(1, 1, "Other header", { sheet: "Other", sheetOrder: 3 }),
      cell(2, 1, "Other event", { sheet: "Other", sheetOrder: 3 }),
    ]);
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 2 });
    expect(plans).toHaveLength(5);
    expect(plans.at(-1)!.ownedIds).toEqual(["Other:r1c1", "Other:r2c1"]);
    expect(evidence(plans.at(-1)!.source.evidence_units[0]!).sheet_order).toBe(
      3,
    );
  });

  it("packs fewer owned rows when complete context makes the next row exceed budget", () => {
    const source = grid(10, 1);
    const fits = (part: UnifiedSourceDocument) =>
      part.evidence_units.length <= 7;
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 5, fits });
    expect(plans.every((plan) => fits(plan.source))).toBe(true);
    expect(plans[1]!.ownedIds.length).toBeLessThan(5);
    expect(plans.flatMap((plan) => plan.ownedIds)).toEqual(
      source.evidence_units.map((unit) => unit.id),
    );
  });

  it("includes ownership and context metadata in every budget check", () => {
    const source = grid(6, 1);
    const fits = vi.fn((part, plan) => {
      expect(plan).toBeDefined();
      expect(plan.source).toBe(part);
      return part.evidence_units.length + plan.ownedIds.length <= 9;
    });
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 5, fits });
    expect(fits).toHaveBeenCalled();
    expect(
      plans.every(
        (plan) => plan.source.evidence_units.length + plan.ownedIds.length <= 9,
      ),
    ).toBe(true);
    expect(plans.flatMap((plan) => plan.ownedIds)).toHaveLength(6);
  });

  it("tries a larger ownership band when removing context metadata makes only the whole sheet fit", () => {
    const source = grid(2, 1);
    const budget = JSON.stringify(source).length;
    const fits = vi.fn((part, plan) => {
      const scope =
        plan.contextIds.length === 0
          ? ""
          : JSON.stringify({
              ownedIds: plan.ownedIds,
              contextIds: plan.contextIds,
            });
      return JSON.stringify(part).length + scope.length <= budget;
    });
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 2, fits });
    expect(fits.mock.results[0]!.value).toBe(false);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.ownedIds).toEqual(
      source.evidence_units.map((unit) => unit.id),
    );
    expect(plans[0]!.contextIds).toEqual([]);
  });

  it("searches past an intermediate non-fitting endpoint and selects the furthest fitting band", () => {
    const source = grid(4, 1);
    const fits = (
      _part: UnifiedSourceDocument,
      plan?: { ownedIds: readonly string[] },
    ) => plan!.ownedIds.length !== 2;
    const plans = planSourceChunks(source, { maxOwnedEvidenceUnits: 4, fits });
    expect(plans).toHaveLength(1);
    expect(plans[0]!.ownedIds).toHaveLength(4);
  });

  it("rejects a cross-sheet parent dependency as invalid structure rather than expanding interpretation scope", () => {
    const source = document([
      cell(1, 1),
      cell(1, 1, "Cross-sheet child", {
        sheet: "Other",
        sheetOrder: 1,
        parent: "Calendar:r1c1",
      }),
    ]);
    expect(
      validateUnifiedSourceDocument(source, { source_id: source.source_id })
        .valid,
    ).toBe(true);
    try {
      planSourceChunks(source);
      expect.fail("Expected invalid cross-sheet dependency to fail planning");
    } catch (error) {
      expect(error).toMatchObject({
        name: "SourceChunkPlanningError",
        code: "source_document_invalid",
      });
    }
  });

  it("fails the entire plan before a caller can send any earlier chunk when a later indivisible band cannot fit", () => {
    const source = grid(10, 1);
    source.evidence_units[9]!.raw_value =
      source.evidence_units[9]!.display_value = "x".repeat(2_000);
    const send = vi.fn();
    expect(() => {
      for (const plan of planSourceChunks(source, {
        maxOwnedEvidenceUnits: 2,
        fits: (part) =>
          part.evidence_units.every(
            (unit) => unit.display_value.length < 1_000,
          ),
      }))
        send(plan);
    }).toThrow(SourceChunkPlanningError);
    expect(send).not.toHaveBeenCalled();
    expect(source.evidence_units).toHaveLength(10);
    expect(source.evidence_units[9]!.display_value).toHaveLength(2_000);
  });

  it("rejects broken references, invalid limits, and chunk-count exhaustion without mutation", () => {
    const source = grid(8);
    const before = structuredClone(source);
    expect(() =>
      planSourceChunks(source, { maxOwnedEvidenceUnits: 2, maxChunks: 3 }),
    ).toThrow(SourceChunkPlanningError);
    for (const options of [
      { maxOwnedEvidenceUnits: 0 },
      { maxChunks: NaN },
      { maxChunks: 1.5 },
    ]) {
      expect(() => planSourceChunks(source, options)).toThrow(
        SourceChunkPlanningError,
      );
    }
    const invalid = structuredClone(source);
    evidence(invalid.evidence_units[4]!).header_ref = "missing";
    expect(() => planSourceChunks(invalid)).toThrow(SourceChunkPlanningError);
    expect(source).toEqual(before);
  });
});
