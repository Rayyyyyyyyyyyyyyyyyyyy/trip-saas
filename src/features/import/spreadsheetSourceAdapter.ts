import * as XLSX from "xlsx";
import type {
  SourceEvidenceUnit,
  SourceExtractionFinding,
  TabularStructuralEvidence,
  ValidatedUnifiedSourceDocument,
} from "../../domain/source/types";
import { MAX_SOURCE_EVIDENCE_UNITS } from "../../domain/source/sourceDocumentLimits";
import { validateUnifiedSourceDocument } from "../../domain/source/validateUnifiedSourceDocument";
import { createSpreadsheetSourceIdentity } from "./spreadsheetSourceIdentity";
import { createIntakeFailure, IntakeFailureError } from "./intakeFailure";

export const MAX_SPREADSHEET_BYTES = 128 * 1024 * 1024;
export type VisibleSpreadsheetSheet = Readonly<{
  id: string;
  name: string;
  order: number;
}>;
export type PreparedSpreadsheetFile = Readonly<{
  displayName: string;
  format: "xlsx" | "csv";
  visibleSheets: readonly VisibleSpreadsheetSheet[];
}>;

// Library workbooks and original bytes stay inside this session-only adapter.
const originals = new WeakMap<PreparedSpreadsheetFile, ArrayBuffer>();

function fail(code: Parameters<typeof createIntakeFailure>[0]): never {
  throw new IntakeFailureError(createIntakeFailure(code));
}

const readOptions: XLSX.ParsingOptions = {
  type: "array",
  // Format explicitly: SSF rejects some valid unquoted CJK Excel literals.
  cellText: false,
  cellNF: true,
  cellFormula: true,
  cellDates: false,
  cellHTML: false,
  bookVBA: false,
  raw: true,
  WTF: true,
};

function readWorkbook(
  bytes: ArrayBuffer,
  format: "xlsx" | "csv",
  sheets: number[],
) {
  try {
    if (format === "xlsx") {
      const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
      if (
        signature[0] !== 0x50 ||
        signature[1] !== 0x4b ||
        signature[2] !== 3 ||
        signature[3] !== 4
      )
        fail("spreadsheet_unreadable");
      const workbook = XLSX.read(bytes, { ...readOptions, sheets });
      if (workbook.bookType !== "xlsx") fail("spreadsheet_unreadable");
      return workbook;
    }
    // Decode as text explicitly and force the DSV parser. A literal first cell
    // beginning with '<' remains text instead of invoking XML/HTML guessing.
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) fail("spreadsheet_unreadable");
    const csv = /^sep=.[\r\n]/u.test(text) ? text : `sep=,\n${text}`;
    return XLSX.read(csv, { ...readOptions, type: "string", sheet: "CSV" });
  } catch {
    fail("spreadsheet_unreadable");
  }
}

/** Read locally and inspect visible metadata before worksheet extraction. */
export async function prepareSpreadsheetFile(
  file: Pick<File, "name" | "size" | "arrayBuffer">,
): Promise<PreparedSpreadsheetFile> {
  const extension = file.name.toLowerCase().match(/\.(xlsx|csv)$/u)?.[1];
  if (extension !== "xlsx" && extension !== "csv")
    fail("spreadsheet_unsupported_type");
  if (!Number.isFinite(file.size) || file.size > MAX_SPREADSHEET_BYTES)
    fail("spreadsheet_too_large");
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    fail("spreadsheet_unreadable");
  }
  if (!bytes.byteLength) fail("spreadsheet_empty");
  if (bytes.byteLength > MAX_SPREADSHEET_BYTES) fail("spreadsheet_too_large");
  const workbook = readWorkbook(bytes, extension, []);
  const visibleSheets = workbook.SheetNames.flatMap((name, order) => {
    const hidden = workbook.Workbook?.Sheets?.[order]?.Hidden ?? 0;
    return hidden === 0
      ? [Object.freeze({ id: `sheet:${order}`, name, order })]
      : [];
  });
  if (visibleSheets.length > 19) fail("spreadsheet_sheet_limit");
  if (!visibleSheets.length) fail("spreadsheet_empty");
  const prepared = Object.freeze({
    displayName: file.name,
    format: extension,
    visibleSheets: Object.freeze(visibleSheets),
  });
  originals.set(prepared, bytes);
  return prepared;
}

function hasContent(cell: XLSX.CellObject | undefined) {
  return (
    !!cell &&
    (typeof cell.f === "string" ||
      !!cell.l?.Target ||
      (cell.t !== "z" &&
        cell.v !== undefined &&
        cell.v !== null &&
        String(cell.v).trim() !== ""))
  );
}

function unitId(sourceId: string, sheetOrder: number, address: string) {
  return `${sourceId}:s:${sheetOrder}:${address}`;
}

function typedHint(
  cell: XLSX.CellObject,
  date1904: boolean,
): TabularStructuralEvidence["typed_hint"] {
  if (cell.t === "b" && typeof cell.v === "boolean")
    return { kind: "boolean", value: cell.v };
  if (cell.t === "n" && typeof cell.v === "number" && Number.isFinite(cell.v)) {
    if (cell.z && XLSX.SSF.is_date(cell.z))
      return {
        kind: "date_serial",
        value: cell.v,
        date_system: date1904 ? "1904" : "1900",
      };
    return { kind: "number", value: cell.v };
  }
}

function quoteCjkFormatLiterals(format: string) {
  let quoted = false;
  let output = "";
  for (let index = 0; index < format.length; index += 1) {
    const character = format[index]!;
    if (character === '"') quoted = !quoted;
    if (!quoted && ["\\", "_", "*"].includes(character)) {
      output += character + (format[++index] ?? "");
      continue;
    }
    output +=
      !quoted && /[年月日時分秒]/u.test(character)
        ? `"${character}"`
        : character;
  }
  return output;
}

function displayCell(cell: XLSX.CellObject, date1904: boolean) {
  if (cell.v === undefined || cell.v === null) return "";
  if (
    (cell.t === "n" && typeof cell.v === "number") ||
    (cell.t === "s" && typeof cell.v === "string")
  ) {
    const format = cell.z ?? "General";
    try {
      return XLSX.SSF.format(format, cell.v, { date1904 });
    } catch {
      if (typeof format !== "string") fail("spreadsheet_unreadable");
      try {
        return XLSX.SSF.format(quoteCjkFormatLiterals(format), cell.v, {
          date1904,
        });
      } catch {
        fail("spreadsheet_unreadable");
      }
    }
  }
  if (cell.t === "e") return XLSX.utils.format_cell(cell);
  if (cell.t === "b") return cell.v ? "TRUE" : "FALSE";
  return String(cell.v);
}

/** Extract selected visible sheets. It assigns structure, never itinerary meaning. */
export async function extractSpreadsheetSource(
  prepared: PreparedSpreadsheetFile,
  selectedSheetIds: readonly string[] = prepared.visibleSheets.map(
    (sheet) => sheet.id,
  ),
): Promise<ValidatedUnifiedSourceDocument> {
  const bytes = originals.get(prepared);
  if (!bytes) fail("source_invalid_contract");
  if (
    !selectedSheetIds.length ||
    new Set(selectedSheetIds).size !== selectedSheetIds.length ||
    selectedSheetIds.some(
      (id) => !prepared.visibleSheets.some((sheet) => sheet.id === id),
    )
  )
    fail("spreadsheet_selection_invalid");
  const selected = prepared.visibleSheets.filter((sheet) =>
    selectedSheetIds.includes(sheet.id),
  );
  const { sourceId } = await createSpreadsheetSourceIdentity(
    bytes,
    selected.map((sheet) => sheet.order),
  );
  const workbook = readWorkbook(
    bytes,
    prepared.format,
    selected.map((sheet) => sheet.order),
  );
  const units: SourceEvidenceUnit[] = [];
  const findings: SourceExtractionFinding[] = [];
  const date1904 = workbook.Workbook?.WBProps?.date1904 === true;
  for (const sheet of selected) {
    const worksheet = workbook.Sheets[sheet.name];
    if (!worksheet) fail("spreadsheet_unreadable");
    const merges = worksheet["!merges"] ?? [];
    // Cell addresses are sparse; !ref can cover a million formatting-only rows.
    const addresses = new Set(
      Object.keys(worksheet).filter(
        (address) =>
          /^[A-Z]+[1-9]\d*$/u.test(address) && hasContent(worksheet[address]),
      ),
    );
    for (const merge of merges) {
      if (
        [...addresses].some((address) => {
          const point = XLSX.utils.decode_cell(address);
          return (
            point.r >= merge.s.r &&
            point.r <= merge.e.r &&
            point.c >= merge.s.c &&
            point.c <= merge.e.c
          );
        })
      )
        addresses.add(XLSX.utils.encode_cell(merge.s));
    }
    const ordered = [...addresses]
      .map((address) => ({ address, point: XLSX.utils.decode_cell(address) }))
      .sort(
        (left, right) =>
          left.point.r - right.point.r || left.point.c - right.point.c,
      );
    for (const { address, point } of ordered) {
      if (units.length >= MAX_SOURCE_EVIDENCE_UNITS)
        fail("spreadsheet_extraction_limit");
      const cell: XLSX.CellObject = worksheet[address] ?? { t: "z" };
      const enclosing = merges.filter(
        (merge) =>
          point.r >= merge.s.r &&
          point.r <= merge.e.r &&
          point.c >= merge.s.c &&
          point.c <= merge.e.c,
      );
      if (enclosing.length > 1) fail("source_document_invalid");
      const merge = enclosing[0];
      const isAnchor =
        !!merge && point.r === merge.s.r && point.c === merge.s.c;
      const bounds = isAnchor ? merge : { s: point, e: point };
      const range = XLSX.utils.encode_range(bounds);
      const locator = `sheet:${sheet.name}!${range}`;
      const mergeLocator =
        merge && (merge.s.r !== merge.e.r || merge.s.c !== merge.e.c)
          ? `sheet:${sheet.name}!${XLSX.utils.encode_range(merge)}`
          : null;
      const formula = typeof cell.f === "string" ? cell.f : undefined;
      const hasCache = cell.v !== undefined && cell.v !== null;
      const display = displayCell(cell, date1904);
      const hint = typedHint(cell, date1904);
      const unit: SourceEvidenceUnit = {
        id: unitId(sourceId, sheet.order, address),
        source_order: units.length,
        parent_ref:
          merge && !isAnchor
            ? unitId(sourceId, sheet.order, XLSX.utils.encode_cell(merge.s))
            : null,
        locator,
        raw_value: hasCache ? String(cell.v) : "",
        display_value: display,
        links: cell.l?.Target
          ? [{ kind: "link", label: display, target: cell.l.Target }]
          : [],
        structural_evidence: [
          {
            evidence_kind: "tabular_region",
            sheet_id: sheet.id,
            sheet_name: sheet.name,
            sheet_order: sheet.order,
            row_start: bounds.s.r + 1,
            row_end: bounds.e.r + 1,
            column_start: bounds.s.c + 1,
            column_end: bounds.e.c + 1,
            header_ref: null,
            merge_ref: mergeLocator,
            ...(hint ? { typed_hint: hint } : {}),
            ...(formula !== undefined
              ? {
                  formula,
                  ...(hasCache ? { cached_display_value: display } : {}),
                }
              : {}),
            ...(cell.l?.Target ? { hyperlink_target: cell.l.Target } : {}),
          },
        ],
      };
      units.push(unit);
      const addFinding = (
        code: SourceExtractionFinding["code"],
        message: string,
      ) =>
        findings.push({
          code,
          severity: "warning",
          message,
          evidence_unit_ref: unit.id,
          locator,
          target: address,
        });
      if (formula !== undefined && !hasCache)
        addFinding(
          "MISSING_CACHED_VALUE",
          "這個公式沒有可讀取的快取結果，公式未執行。",
        );
      else if (cell.t === "e")
        addFinding(
          "CACHED_VALUE_ERROR",
          "這個儲存格的快取結果是錯誤值，沒有重新計算。",
        );
      if (merge && !isAnchor)
        addFinding(
          "COVERED_CELL_CONTENT",
          "合併儲存格內另有隱藏內容，已保留但不能視為畫面上可見的事實。",
        );
    }
  }
  if (
    !units.some(
      (unit) =>
        unit.display_value.trim() ||
        unit.links.length ||
        unit.structural_evidence.some(
          (evidence) =>
            evidence.evidence_kind === "tabular_region" &&
            evidence.formula !== undefined,
        ),
    )
  )
    fail("spreadsheet_empty");
  const gate = validateUnifiedSourceDocument(
    {
      schema_version: "unified-source-document.v1",
      source_id: sourceId,
      display_name: prepared.displayName,
      source_format: "tabular",
      input_mode: prepared.format === "csv" ? "csv_file" : "spreadsheet_file",
      excluded_sheets: prepared.visibleSheets
        .filter((sheet) => !selectedSheetIds.includes(sheet.id))
        .map((sheet) => sheet.name),
      evidence_units: units,
      extraction_findings: findings,
    },
    { source_id: sourceId },
  );
  if (!gate.valid)
    fail(
      gate.failures.some((failure) => failure.code === "source_size_exceeded")
        ? "spreadsheet_extraction_limit"
        : "source_document_invalid",
    );
  return gate.document;
}
