import { describe, expect, it } from "vitest";
import { validateInterpretationResponse } from "../../src/domain/trip/validateInterpretationResponse";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

const expectedSource = {
  source_id: "source:fixture-001",
  schema_version: "unified-source-document.v1",
  block_ids: ["source-block:001"],
};

describe("deterministic interpretation response validation", () => {
  it("accepts matching source identity and complete coverage", () => {
    expect(
      validateInterpretationResponse(
        validDraftInterpretationResult,
        expectedSource,
      ),
    ).toEqual({ valid: true, findings: [], schemaErrors: [] });
  });

  it("reports source identity and version mismatches", () => {
    const result = structuredClone(validDraftInterpretationResult);
    result.source_id = "source:other";

    expect(
      validateInterpretationResponse(result, {
        ...expectedSource,
        schema_version: "unified-source-document.v2",
      }).findings.map((item) => item.code),
    ).toEqual(["SOURCE_ID_MISMATCH", "SOURCE_VERSION_MISMATCH"]);
  });

  it("reports missing, duplicate, unknown, and inconsistent coverage", () => {
    const result = structuredClone(validDraftInterpretationResult);
    result.coverage.total_blocks = 3;
    result.coverage.block_dispositions = [
      { source_ref: "source-block:001", disposition: "interpreted" },
      { source_ref: "source-block:001", disposition: "supporting" },
      { source_ref: "source-block:unknown", disposition: "supporting" },
    ];

    const codes = validateInterpretationResponse(result, {
      ...expectedSource,
      block_ids: ["source-block:001", "source-block:002"],
    }).findings.map((item) => item.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_BLOCK_DISPOSITION",
        "DUPLICATE_BLOCK_DISPOSITION",
        "MISSING_BLOCK_DISPOSITION",
        "COVERAGE_TOTAL_MISMATCH",
      ]),
    );
  });

  it("requires exact unparsed-item accounting", () => {
    const result = structuredClone(validDraftInterpretationResult);
    result.coverage.block_dispositions[0].disposition = "unparsed";

    expect(
      validateInterpretationResponse(result, expectedSource).findings.map(
        (item) => item.code,
      ),
    ).toContain("UNPARSED_ITEM_INCOMPLETE");
  });
});
