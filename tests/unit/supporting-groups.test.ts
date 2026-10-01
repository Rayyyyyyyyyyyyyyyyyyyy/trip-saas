import { describe, expect, it } from "vitest";

import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { deriveSupportingGroups } from "../../src/domain/trip/deriveSupportingGroups";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

function validated(document: UnifiedSourceDocument) {
  const result = validateUnifiedSourceDocument(document, {
    source_id: document.source_id,
  });
  if (!result.valid) throw new Error("fixture must be a valid source document");
  return result.document;
}

function supportingItem(id: string, sourceRefs: string[]) {
  return {
    id,
    kind: "note" as const,
    text: id,
    url: null,
    unresolved: false,
    source_refs: sourceRefs,
  };
}

describe("deterministic supporting group derivation", () => {
  it("uses the nearest Markdown ancestor heading and leaves mixed or heading-less references ungrouped", () => {
    const document = validated(
      extractMarkdownSource({
        schema_version: "text-source-input.v1",
        source_id: "source:groups-markdown",
        input_mode: "pasted_markdown",
        media_type: "text/markdown",
        display_name: "Grouped notes",
        content:
          "Heading-less intro\n\n# Travel notes\n\n## Food list\n\n- Pizza\n- Ramen\n\n## Packing\n\n- Umbrella",
      }),
    );
    const ref = (displayValue: string) =>
      document.evidence_units.find(
        (unit) => unit.display_value === displayValue,
      )!.id;
    const foodHeading = document.evidence_units.find(
      (unit) => unit.display_value === "Food list",
    )!;
    const packingHeading = document.evidence_units.find(
      (unit) => unit.display_value === "Packing",
    )!;
    const draft = structuredClone(validParsedTripDraft);
    draft.supporting_items = [
      supportingItem("support:food", [ref("Pizza"), ref("Ramen")]),
      supportingItem("support:packing", [ref("Umbrella")]),
      supportingItem("support:mixed", [ref("Pizza"), ref("Umbrella")]),
      supportingItem("support:intro", [ref("Heading-less intro")]),
    ];

    const grouped = deriveSupportingGroups(draft, document);

    expect(grouped.supporting_items.map((item) => item.group)).toEqual([
      {
        id: `heading:${foodHeading.id}`,
        label: "Food list",
        order: foodHeading.source_order,
      },
      {
        id: `heading:${packingHeading.id}`,
        label: "Packing",
        order: packingHeading.source_order,
      },
      null,
      null,
    ]);
    expect(
      draft.supporting_items.every((item) => item.group === undefined),
    ).toBe(true);
  });

  it("uses sheet identity for tabular evidence and rejects multi-sheet grouping", () => {
    const document = validated({
      schema_version: "unified-source-document.v1",
      source_id: "source:groups-table",
      display_name: "Workbook",
      input_mode: "pasted_markdown",
      source_format: "tabular",
      evidence_units: [
        {
          id: "cell:food:a1",
          source_order: 0,
          parent_ref: null,
          locator: "Food!A1",
          raw_value: "Pizza",
          display_value: "Pizza",
          links: [],
          structural_evidence: [
            {
              evidence_kind: "tabular_region",
              sheet_id: "food",
              sheet_name: "美食清單",
              sheet_order: 2,
              row_start: 1,
              row_end: 1,
              column_start: 1,
              column_end: 1,
              header_ref: null,
              merge_ref: null,
            },
          ],
        },
        {
          id: "cell:packing:a1",
          source_order: 1,
          parent_ref: null,
          locator: "Packing!A1",
          raw_value: "Umbrella",
          display_value: "Umbrella",
          links: [],
          structural_evidence: [
            {
              evidence_kind: "tabular_region",
              sheet_id: "packing",
              sheet_name: "行李清單",
              sheet_order: 5,
              row_start: 1,
              row_end: 1,
              column_start: 1,
              column_end: 1,
              header_ref: null,
              merge_ref: null,
            },
          ],
        },
      ],
      extraction_findings: [],
    });
    const draft = structuredClone(validParsedTripDraft);
    draft.supporting_items = [
      supportingItem("support:food", ["cell:food:a1"]),
      supportingItem("support:packing", ["cell:packing:a1"]),
      supportingItem("support:mixed", ["cell:food:a1", "cell:packing:a1"]),
    ];

    expect(
      deriveSupportingGroups(draft, document).supporting_items.map(
        (item) => item.group,
      ),
    ).toEqual([
      { id: "sheet:food", label: "美食清單", order: 2 },
      { id: "sheet:packing", label: "行李清單", order: 5 },
      null,
    ]);
  });
});
