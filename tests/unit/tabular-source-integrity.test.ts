import { describe, expect, it, vi } from "vitest";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { validateUnifiedSourceDocumentSchema } from "../../src/domain/source/schemaValidators";
import type {
  TabularStructuralEvidence,
  UnifiedSourceDocument,
} from "../../src/domain/source/types";
import { createGeminiTripParser } from "../../src/integrations/gemini/geminiTripParser";
import {
  validTabularSourceDocument,
  validMarkdownSourceDocument,
} from "../fixtures/contracts/sourceDocuments";

function table() {
  const source = structuredClone(validTabularSourceDocument);
  source.input_mode = "spreadsheet_file";
  source.excluded_sheets = ["Expenses"];
  return source;
}
function evidence(source: UnifiedSourceDocument, index = 1) {
  return source.evidence_units[index]!
    .structural_evidence[0] as TabularStructuralEvidence;
}

describe("tabular source input gates", () => {
  it("accepts selected scope, formatted text and auxiliary date hints without inventing a displayed year", () => {
    const source = table();
    source.evidence_units[0]!.display_value = "8/16";
    evidence(source, 0).typed_hint = {
      kind: "date_serial",
      value: 45885,
      date_system: "1900",
    };
    const gate = validateUnifiedSourceDocument(source, {
      source_id: source.source_id,
    });
    expect(gate.valid).toBe(true);
    expect(source.evidence_units[0]!.display_value).toBe("8/16");
    const invalidHint = structuredClone(source) as any;
    invalidHint.evidence_units[0].structural_evidence[0].typed_hint.confirmed_year = 2025;
    expect(validateUnifiedSourceDocumentSchema(invalidHint).valid).toBe(false);
  });

  const cases: Array<[string, (source: UnifiedSourceDocument) => void]> = [
    [
      "wrong sheet locator prefix",
      (source) => {
        source.evidence_units[1]!.locator = "sheet:Wrong!A2:B2";
        evidence(source).merge_ref = source.evidence_units[1]!.locator;
      },
    ],
    [
      "tabular evidence disguised as Markdown",
      (source) => {
        source.source_format = "markdown";
        evidence(source).row_start = 3;
      },
    ],
    [
      "reversed bounds",
      (source) => {
        evidence(source).row_start = 3;
      },
    ],
    [
      "out-of-range coordinates",
      (source) => {
        evidence(source).column_end = 16385;
      },
    ],
    [
      "wrong A1 locator",
      (source) => {
        source.evidence_units[1]!.locator = "sheet:Day1!A8:B8";
      },
    ],
    [
      "merge mismatch",
      (source) => {
        evidence(source).merge_ref = null;
      },
    ],
    [
      "sheet label drift",
      (source) => {
        evidence(source).sheet_name = "Different";
      },
    ],
    [
      "sheet order drift",
      (source) => {
        evidence(source).sheet_order = 1;
      },
    ],
    [
      "excluded sheet content",
      (source) => {
        source.excluded_sheets = ["Day1"];
      },
    ],
    [
      "future header",
      (source) => {
        evidence(source, 0).header_ref = source.evidence_units[1]!.id;
      },
    ],
    [
      "cross-sheet header",
      (source) => {
        evidence(source).sheet_id = "sheet:other";
        evidence(source).sheet_name = "Other";
        evidence(source).sheet_order = 1;
      },
    ],
    [
      "overlapping merged evidence",
      (source) => {
        evidence(source).row_start = 1;
        evidence(source).row_end = 1;
        source.evidence_units[1]!.locator = "sheet:Day1!A1:B1";
        evidence(source).merge_ref = source.evidence_units[1]!.locator;
        evidence(source).header_ref = null;
      },
    ],
    [
      "structural format mismatch",
      (source) => {
        source.evidence_units[1]!.structural_evidence = structuredClone(
          validMarkdownSourceDocument.evidence_units[0]!.structural_evidence,
        );
      },
    ],
  ];
  it.each(cases)(
    "rejects %s before any Gemini request",
    async (_label, change) => {
      const source = table();
      change(source);
      expect(validateUnifiedSourceDocumentSchema(source).valid).toBe(true);
      const gate = validateUnifiedSourceDocument(source, {
        source_id: source.source_id,
      });
      expect(gate).toMatchObject({
        valid: false,
        failures: expect.arrayContaining([
          { code: "invalid_tabular_evidence", message: expect.any(String) },
        ]),
      });
      const fetch = vi.fn();
      await expect(
        createGeminiTripParser({ model: "gemini-test-model", fetch })({
          source,
          sourceId: source.source_id,
          credential: "test-only-key",
        }),
      ).rejects.toMatchObject({ code: "source_document_invalid" });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects byte/evidence limits without truncation or mutation", () => {
    const source = table();
    const before = structuredClone(source);
    for (const limit of [
      { maxEvidenceUnits: 1 },
      { maxDocumentBytes: 1 },
      { maxEvidenceUnits: NaN },
    ]) {
      expect(
        validateUnifiedSourceDocument(source, {
          source_id: source.source_id,
          ...limit,
        }),
      ).toMatchObject({
        valid: false,
        failures: [{ code: "source_size_exceeded" }],
      });
    }
    expect(source).toEqual(before);
  });
});
