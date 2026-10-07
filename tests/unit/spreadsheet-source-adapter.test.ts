import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import type {
  TabularStructuralEvidence,
  UnifiedSourceDocument,
} from "../../src/domain/source/types";
import {
  extractSpreadsheetSource,
  MAX_SPREADSHEET_BYTES,
  prepareSpreadsheetFile,
} from "../../src/features/import/spreadsheetSourceAdapter";

function file(bytes: ArrayBuffer, name = "synthetic.xlsx") {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.slice(0),
  };
}

function workbook(sheets: Array<[string, XLSX.WorkSheet]>) {
  const value = XLSX.utils.book_new();
  for (const [name, sheet] of sheets)
    XLSX.utils.book_append_sheet(value, sheet, name);
  return value;
}

function bytes(
  value: XLSX.WorkBook,
  bookType: XLSX.BookType = "xlsx",
): ArrayBuffer {
  return XLSX.write(value, { type: "array", bookType });
}

function textBytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function evidence(document: UnifiedSourceDocument, locator: string) {
  const unit = document.evidence_units.find((item) => item.locator === locator);
  expect(unit, `Missing evidence at ${locator}`).toBeDefined();
  return {
    unit: unit!,
    structural: unit!.structural_evidence[0] as TabularStructuralEvidence,
  };
}

async function extract(value: XLSX.WorkBook) {
  return extractSpreadsheetSource(
    await prepareSpreadsheetFile(file(bytes(value))),
  );
}

describe("synthetic spreadsheet source extraction", () => {
  it("lists visible original indices and extracts only selected sheets in workbook order", async () => {
    const value = workbook([
      ["First", XLSX.utils.aoa_to_sheet([["First visible"]])],
      ["Hidden", XLSX.utils.aoa_to_sheet([["Hidden secret"]])],
      ["Last", XLSX.utils.aoa_to_sheet([["Last visible"]])],
      ["VeryHidden", XLSX.utils.aoa_to_sheet([["Very hidden secret"]])],
      ["Expenses", XLSX.utils.aoa_to_sheet([["Excluded expense"]])],
    ]);
    value.Workbook = {
      Sheets: [
        { Hidden: 0 },
        { Hidden: 1 },
        { Hidden: 0 },
        { Hidden: 2 },
        { Hidden: 0 },
      ],
    };
    const prepared = await prepareSpreadsheetFile(file(bytes(value)));
    expect(prepared.visibleSheets).toEqual([
      { id: "sheet:0", name: "First", order: 0 },
      { id: "sheet:2", name: "Last", order: 2 },
      { id: "sheet:4", name: "Expenses", order: 4 },
    ]);
    const selection = ["sheet:2", "sheet:0"];
    const document = await extractSpreadsheetSource(prepared, selection);
    expect(selection).toEqual(["sheet:2", "sheet:0"]);
    expect(document.evidence_units.map((unit) => unit.display_value)).toEqual([
      "First visible",
      "Last visible",
    ]);
    expect(document.excluded_sheets).toEqual(["Expenses"]);
    expect(document.evidence_units.map((unit) => unit.source_order)).toEqual([
      0, 1,
    ]);
    expect(
      document.evidence_units.map(
        (unit) =>
          (unit.structural_evidence[0] as TabularStructuralEvidence)
            .sheet_order,
      ),
    ).toEqual([0, 2]);
    expect(JSON.stringify(document)).not.toMatch(
      /Hidden secret|Very hidden secret|Excluded expense/,
    );
    await expect(
      extractSpreadsheetSource(prepared, ["sheet:1"]),
    ).rejects.toMatchObject({
      failure: { code: "spreadsheet_selection_invalid" },
    });
    await expect(extractSpreadsheetSource(prepared, [])).rejects.toMatchObject({
      failure: { code: "spreadsheet_selection_invalid" },
    });
    await expect(
      extractSpreadsheetSource(prepared, ["sheet:0", "sheet:0"]),
    ).rejects.toMatchObject({
      failure: { code: "spreadsheet_selection_invalid" },
    });
  });

  it("keeps filename-independent identities and changes identity for changed selected scope", async () => {
    const value = workbook([
      ["One", XLSX.utils.aoa_to_sheet([["one"]])],
      ["Two", XLSX.utils.aoa_to_sheet([["two"]])],
    ]);
    const content = bytes(value);
    const first = await prepareSpreadsheetFile(file(content, "first.xlsx"));
    const renamed = await prepareSpreadsheetFile(file(content, "renamed.xlsx"));
    const all = await extractSpreadsheetSource(first);
    const same = await extractSpreadsheetSource(renamed, [
      "sheet:1",
      "sheet:0",
    ]);
    const subset = await extractSpreadsheetSource(first, ["sheet:0"]);
    expect(same.source_id).toBe(all.source_id);
    expect(same.evidence_units).toEqual(all.evidence_units);
    expect(subset.source_id).not.toBe(all.source_id);
    expect(subset.excluded_sheets).toEqual(["Two"]);
  });

  it("preserves formatted dates, times, exact hyperlinks and numeric/boolean auxiliary hints", async () => {
    const url = "https://maps.example/place?query=A%20B&entry=source#details";
    const document = await extract(
      workbook([
        [
          "Trip",
          {
            A1: { t: "n", v: 45885, z: "m/d" },
            A2: { t: "n", v: 23 / 24, z: "hh:mm" },
            A3: { t: "n", v: 7 },
            A4: { t: "b", v: false },
            A5: { t: "s", v: "Exact place", l: { Target: url } },
            "!ref": "A1:A5",
          },
        ],
      ]),
    );
    expect(evidence(document, "sheet:Trip!A1")).toMatchObject({
      unit: { display_value: "8/16" },
      structural: {
        typed_hint: { kind: "date_serial", value: 45885, date_system: "1900" },
        header_ref: null,
      },
    });
    expect(evidence(document, "sheet:Trip!A2").unit.display_value).toBe(
      "23:00",
    );
    expect(evidence(document, "sheet:Trip!A3").structural.typed_hint).toEqual({
      kind: "number",
      value: 7,
    });
    expect(evidence(document, "sheet:Trip!A4").structural.typed_hint).toEqual({
      kind: "boolean",
      value: false,
    });
    expect(evidence(document, "sheet:Trip!A5")).toMatchObject({
      unit: { links: [{ kind: "link", label: "Exact place", target: url }] },
      structural: { hyperlink_target: url },
    });
    expect(
      document.evidence_units.every(
        (unit) =>
          (unit.structural_evidence[0] as TabularStructuralEvidence)
            .header_ref === null,
      ),
    ).toBe(true);
  });

  it("retains the workbook 1904 epoch without converting serials into confirmed dates", async () => {
    const value = workbook([
      ["Trip", { A1: { t: "n", v: 1, z: "m/d/yyyy" }, "!ref": "A1" }],
    ]);
    value.Workbook = { WBProps: { date1904: true } };
    const document = await extract(value);
    expect(evidence(document, "sheet:Trip!A1")).toMatchObject({
      unit: { display_value: "1/2/1904" },
      structural: {
        typed_hint: { kind: "date_serial", value: 1, date_system: "1904" },
      },
    });
  });

  it.each([
    "yyyy年m月d日",
    'yyyy"年"m"月"d"日"',
    "yyyy\\年m\\月d\\日",
    'yyyy年m"月"d\\日',
  ])("preserves CJK date literals in format %s", async (format) => {
    const document = await extract(
      workbook([
        ["Trip", { A1: { t: "n", v: 45885, z: format }, "!ref": "A1" }],
      ]),
    );
    expect(evidence(document, "sheet:Trip!A1")).toMatchObject({
      unit: { display_value: "2025年8月16日" },
      structural: {
        typed_hint: { kind: "date_serial", value: 45885, date_system: "1900" },
      },
    });
  });

  it("formats CJK date and time literals with the workbook 1904 epoch", async () => {
    const value = workbook([
      [
        "Trip",
        {
          A1: { t: "n", v: 1, z: "yyyy年m月d日" },
          A2: { t: "n", v: 23 / 24, z: "hh時mm分ss秒" },
          "!ref": "A1:A2",
        },
      ],
    ]);
    value.Workbook = { WBProps: { date1904: true } };
    const document = await extract(value);
    expect(evidence(document, "sheet:Trip!A1")).toMatchObject({
      unit: { display_value: "1904年1月2日" },
      structural: { typed_hint: { date_system: "1904" } },
    });
    expect(evidence(document, "sheet:Trip!A2").unit.display_value).toBe(
      "23時00分00秒",
    );
  });

  it("preserves custom text display formats instead of replacing them with raw strings", async () => {
    const document = await extract(
      workbook([
        [
          "Trip",
          {
            A1: { t: "s", v: "Example", z: '0;0;0;"Note: "@' },
            "!ref": "A1",
          },
        ],
      ]),
    );
    expect(evidence(document, "sheet:Trip!A1").unit.display_value).toBe(
      "Note: Example",
    );
  });

  it("preserves formula metadata without evaluating and distinguishes missing/error/zero/false/empty caches", async () => {
    const document = await extract(
      workbook([
        [
          "Trip",
          {
            A1: { t: "n", f: "1+1" },
            A2: { t: "e", v: 7, f: "1/0" },
            A3: { t: "n", v: 0, f: "1-1" },
            A4: { t: "b", v: false, f: "1=2" },
            A5: { t: "s", v: "", f: 'IF(TRUE,"","")' },
            "!ref": "A1:A5",
          },
        ],
      ]),
    );
    expect(document.evidence_units).toHaveLength(5);
    expect(evidence(document, "sheet:Trip!A1")).toMatchObject({
      unit: { display_value: "", raw_value: "" },
      structural: { formula: "1+1" },
    });
    expect(evidence(document, "sheet:Trip!A1").structural).not.toHaveProperty(
      "cached_display_value",
    );
    expect(
      document.extraction_findings.map(({ code, locator }) => ({
        code,
        locator,
      })),
    ).toEqual([
      { code: "MISSING_CACHED_VALUE", locator: "sheet:Trip!A1" },
      { code: "CACHED_VALUE_ERROR", locator: "sheet:Trip!A2" },
    ]);
    expect(
      evidence(document, "sheet:Trip!A2").structural.cached_display_value,
    ).toBe("#DIV/0!");
    expect(
      evidence(document, "sheet:Trip!A3").structural.cached_display_value,
    ).toBe("0");
    expect(
      evidence(document, "sheet:Trip!A4").structural.cached_display_value,
    ).toBe("FALSE");
    expect(
      evidence(document, "sheet:Trip!A5").structural.cached_display_value,
    ).toBe("");
  });

  it("preserves merged anchors and independently populated covered cells with warnings", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Visible anchor", "Covered original"],
      ["Next row"],
    ]);
    sheet["!merges"] = [XLSX.utils.decode_range("A1:B1")];
    const document = await extract(workbook([["Trip", sheet]]));
    expect(document.evidence_units).toHaveLength(3);
    const anchor = evidence(document, "sheet:Trip!A1:B1");
    const child = evidence(document, "sheet:Trip!B1");
    expect(anchor).toMatchObject({
      unit: { display_value: "Visible anchor", parent_ref: null },
      structural: {
        row_start: 1,
        row_end: 1,
        column_start: 1,
        column_end: 2,
        merge_ref: "sheet:Trip!A1:B1",
      },
    });
    expect(child).toMatchObject({
      unit: { display_value: "Covered original", parent_ref: anchor.unit.id },
      structural: { merge_ref: anchor.unit.locator },
    });
    expect(document.extraction_findings).toContainEqual(
      expect.objectContaining({
        code: "COVERED_CELL_CONTENT",
        evidence_unit_ref: child.unit.id,
        locator: child.unit.locator,
        severity: "warning",
      }),
    );
    expect(new Set(document.evidence_units.map((unit) => unit.id)).size).toBe(
      3,
    );
  });

  it("adds an empty anchor when a merged region contains only independent covered content", async () => {
    const document = await extract(
      workbook([
        [
          "Trip",
          {
            B1: { t: "s", v: "Covered original" },
            "!ref": "A1:B1",
            "!merges": [XLSX.utils.decode_range("A1:B1")],
          },
        ],
      ]),
    );
    const anchor = evidence(document, "sheet:Trip!A1:B1");
    const child = evidence(document, "sheet:Trip!B1");
    expect(anchor.unit.display_value).toBe("");
    expect(child.unit.parent_ref).toBe(anchor.unit.id);
    expect(document.evidence_units.map((unit) => unit.source_order)).toEqual([
      0, 1,
    ]);
    expect(document.extraction_findings).toContainEqual(
      expect.objectContaining({
        code: "COVERED_CELL_CONTENT",
        evidence_unit_ref: child.unit.id,
      }),
    );
  });

  it("ignores a formatting-inflated full-sheet dimension while retaining sparse cell ordering", async () => {
    const value = workbook([
      ["Trip", XLSX.utils.aoa_to_sheet([["one", "two"]])],
    ]);
    const container = XLSX.CFB.read(new Uint8Array(bytes(value)), {
      type: "array",
    });
    const entry = XLSX.CFB.find(container, "/xl/worksheets/sheet1.xml");
    const xml = new TextDecoder()
      .decode(entry.content)
      .replace(
        /<dimension ref="[^"]+"\/>/u,
        '<dimension ref="A1:XFD1048576"/>',
      );
    entry.content = new TextEncoder().encode(xml);
    entry.size = entry.content.length;
    const zipped = new Uint8Array(
      XLSX.CFB.write(container, { type: "buffer", fileType: "zip" }),
    );
    const document = await extractSpreadsheetSource(
      await prepareSpreadsheetFile(file(zipped.buffer)),
    );
    expect(document.evidence_units.map((unit) => unit.locator)).toEqual([
      "sheet:Trip!A1",
      "sheet:Trip!B1",
    ]);
  });

  it("imports CSV as one visible sheet and preserves raw date, code, time and formula-looking strings", async () => {
    const prepared = await prepareSpreadsheetFile(
      file(
        textBytes('date,code,time,formula,note\n8/16,00123,23:00,=1+1,"A,B"'),
        "trip.csv",
      ),
    );
    expect(prepared.visibleSheets).toHaveLength(1);
    const document = await extractSpreadsheetSource(prepared);
    expect(document.input_mode).toBe("csv_file");
    expect(document.evidence_units.map((unit) => unit.display_value)).toEqual([
      "date",
      "code",
      "time",
      "formula",
      "note",
      "8/16",
      "00123",
      "23:00",
      "=1+1",
      "A,B",
    ]);
    expect(
      document.evidence_units.every(
        (unit) =>
          !(unit.structural_evidence[0] as TabularStructuralEvidence)
            .typed_hint &&
          !(unit.structural_evidence[0] as TabularStructuralEvidence).formula,
      ),
    ).toBe(true);
  });

  it("keeps a literal leading XML-looking cell as CSV text without invoking format guessing", async () => {
    const prepared = await prepareSpreadsheetFile(
      file(textBytes("<旅程>,目的地\n8/16,京都"), "trip.csv"),
    );
    const document = await extractSpreadsheetSource(prepared);
    expect(document.evidence_units.map((unit) => unit.display_value)).toEqual([
      "<旅程>",
      "目的地",
      "8/16",
      "京都",
    ]);
    expect(document.evidence_units.map((unit) => unit.locator)).toEqual([
      "sheet:CSV!A1",
      "sheet:CSV!B1",
      "sheet:CSV!A2",
      "sheet:CSV!B2",
    ]);
  });

  it("retains an explicit CSV separator directive and quoted delimiter text", async () => {
    const prepared = await prepareSpreadsheetFile(
      file(textBytes('sep=;\n8/16;"A;B"\n23:00;00123'), "trip.csv"),
    );
    const document = await extractSpreadsheetSource(prepared);
    expect(document.evidence_units.map((unit) => unit.display_value)).toEqual([
      "8/16",
      "A;B",
      "23:00",
      "00123",
    ]);
  });
});

describe("bounded spreadsheet input failures", () => {
  it("fails safely on an unsupported numeric format without falling back to the raw serial", async () => {
    const prepared = await prepareSpreadsheetFile(
      file(
        bytes(
          workbook([
            ["Trip", { A1: { t: "n", v: 1, z: "yyyy未" }, "!ref": "A1" }],
          ]),
        ),
      ),
    );
    await expect(extractSpreadsheetSource(prepared)).rejects.toMatchObject({
      failure: {
        code: "spreadsheet_unreadable",
        phase: "extraction",
        recoverable: true,
      },
    });
  });

  it.each(["ods", "xlsb"] as const)(
    "rejects a renamed %s container",
    async (format) => {
      const value = workbook([
        ["Trip", XLSX.utils.aoa_to_sheet([["content"]])],
      ]);
      await expect(
        prepareSpreadsheetFile(file(bytes(value, format))),
      ).rejects.toMatchObject({ failure: { code: "spreadsheet_unreadable" } });
    },
  );

  it.each([
    "a,b\n1,2",
    "<html><table><tr><td>content</td></tr></table></html>",
    "PK\u0003\u0004not-a-workbook",
  ])(
    "rejects non-XLSX bytes rather than trusting permissive format guessing",
    async (content) => {
      await expect(
        prepareSpreadsheetFile(file(textBytes(content))),
      ).rejects.toMatchObject({ failure: { code: "spreadsheet_unreadable" } });
    },
  );

  it("rejects a truncated ZIP workbook", async () => {
    const value = workbook([["Trip", XLSX.utils.aoa_to_sheet([["content"]])]]);
    const content = bytes(value);
    await expect(
      prepareSpreadsheetFile(
        file(content.slice(0, Math.floor(content.byteLength / 2))),
      ),
    ).rejects.toMatchObject({ failure: { code: "spreadsheet_unreadable" } });
  });

  it.each([
    { label: "NUL binary", content: textBytes("a\0b") },
    {
      label: "invalid UTF-8",
      content: new Uint8Array([0xff, 0xfe, 0x61]).buffer,
    },
  ])(
    "rejects renamed binary CSV ($label) with bounded failure copy",
    async ({ content }) => {
      await expect(
        prepareSpreadsheetFile(file(content, "binary.csv")),
      ).rejects.toMatchObject({
        failure: {
          code: "spreadsheet_unreadable",
          phase: "extraction",
          recoverable: true,
        },
      });
    },
  );

  it.each(["trip.xls", "xlsx", "csv", "trip.xlsx.exe"])("rejects unsupported %s before reading its bytes", async (name) => {
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(1));
    await expect(
      prepareSpreadsheetFile({ name, size: 1, arrayBuffer }),
    ).rejects.toMatchObject({
      failure: { code: "spreadsheet_unsupported_type" },
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects declared oversized files before reading bytes", async () => {
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(1));
    await expect(
      prepareSpreadsheetFile({
        name: "trip.xlsx",
        size: MAX_SPREADSHEET_BYTES + 1,
        arrayBuffer,
      }),
    ).rejects.toMatchObject({ failure: { code: "spreadsheet_too_large" } });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects more than 19 visible sheets even if a later selection could be smaller", async () => {
    const value = workbook(
      Array.from({ length: 20 }, (_, index) => [
        `Sheet${index}`,
        XLSX.utils.aoa_to_sheet([[index]]),
      ]),
    );
    await expect(
      prepareSpreadsheetFile(file(bytes(value))),
    ).rejects.toMatchObject({ failure: { code: "spreadsheet_sheet_limit" } });
  });

  it("does not count hidden sheets toward the 19-visible limit", async () => {
    const value = workbook(
      Array.from({ length: 21 }, (_, index) => [
        `Sheet${index}`,
        XLSX.utils.aoa_to_sheet([[index]]),
      ]),
    );
    value.Workbook = {
      Sheets: Array.from({ length: 21 }, (_, index) => ({
        Hidden: index > 18 ? 1 : 0,
      })),
    };
    expect(
      (await prepareSpreadsheetFile(file(bytes(value)))).visibleSheets,
    ).toHaveLength(19);
  });

  it("rejects no-visible-sheet, empty selected sheet and zero-byte inputs", async () => {
    const hidden = workbook([
      ["Hidden", XLSX.utils.aoa_to_sheet([["secret"]])],
    ]);
    hidden.Workbook = { Sheets: [{ Hidden: 2 }] };
    await expect(
      prepareSpreadsheetFile(file(bytes(hidden))),
    ).rejects.toMatchObject({ failure: { code: "spreadsheet_empty" } });
    const empty = await prepareSpreadsheetFile(
      file(bytes(workbook([["Trip", XLSX.utils.aoa_to_sheet([])]]))),
    );
    await expect(extractSpreadsheetSource(empty)).rejects.toMatchObject({
      failure: { code: "spreadsheet_empty" },
    });
    await expect(
      prepareSpreadsheetFile(file(new ArrayBuffer(0))),
    ).rejects.toMatchObject({ failure: { code: "spreadsheet_empty" } });
  });
});
