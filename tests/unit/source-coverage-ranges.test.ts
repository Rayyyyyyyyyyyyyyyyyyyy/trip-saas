import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { expandSourceCoverage } from "../../src/domain/source/sourceCoverage";
import { validateSemanticInterpretationResultSchema } from "../../src/domain/trip/schemaValidators";
import { validateInterpretationResponse } from "../../src/domain/trip/validateInterpretationResponse";
import type {
  BlockDispositionRange,
  Coverage,
} from "../../src/domain/trip/types";
import { createGeminiSchemaProjection } from "../../src/integrations/gemini/createGeminiSchemaProjection";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

// IDs are opaque; lexical/numeric sorting would expand these incorrectly.
const ids = ["unit:z", "unit:2", "unit:100", "unit:a"];
function coverage(ranges: BlockDispositionRange[]): Coverage {
  return {
    total_blocks: ids.length,
    block_dispositions: [],
    block_disposition_ranges: ranges,
    unparsed_items: [],
  };
}
const wholeRange: BlockDispositionRange = {
  from_id: ids[0]!,
  to_id: ids[3]!,
  disposition: "supporting",
};
const expected = {
  source_id: validDraftInterpretationResult.source_id,
  schema_version: "unified-source-document.v1",
  block_ids: ids,
};

describe("source-order range coverage", () => {
  it("expands inclusive ranges mixed with individual and unparsed dispositions without mutating the response", () => {
    const input = coverage([
      { from_id: ids[1]!, to_id: ids[2]!, disposition: "supporting" },
    ]);
    input.block_dispositions = [
      { source_ref: ids[3]!, disposition: "unparsed" },
      { source_ref: ids[0]!, disposition: "interpreted" },
    ];
    input.unparsed_items = [
      {
        source_ref: ids[3]!,
        locator: "source:line:4",
        reason_code: "unclear",
        severity: "warning",
        message: "Keep for Review.",
      },
    ];
    const before = structuredClone(input);
    const expanded = expandSourceCoverage(input, ids);
    expect(expanded).toEqual({
      valid: true,
      coverage: {
        total_blocks: 4,
        block_dispositions: [
          { source_ref: ids[0], disposition: "interpreted" },
          { source_ref: ids[1], disposition: "supporting" },
          { source_ref: ids[2], disposition: "supporting" },
          { source_ref: ids[3], disposition: "unparsed" },
        ],
        unparsed_items: before.unparsed_items,
      },
    });
    expect(input).toEqual(before);
    if (expanded.valid) {
      expanded.coverage.unparsed_items[0]!.message = "Changed clone";
      expect(input).toEqual(before);
    }
    expect(
      validateInterpretationResponse(
        { ...validDraftInterpretationResult, coverage: before },
        expected,
      ).valid,
    ).toBe(true);
  });
  it.each([
    [
      "unknown start",
      { ...wholeRange, from_id: "unit:missing" },
      "UNKNOWN_COVERAGE_RANGE_ENDPOINT",
    ],
    [
      "unknown end",
      { ...wholeRange, to_id: "unit:missing" },
      "UNKNOWN_COVERAGE_RANGE_ENDPOINT",
    ],
    [
      "reversed",
      { ...wholeRange, from_id: ids[3]!, to_id: ids[0]! },
      "REVERSED_COVERAGE_RANGE",
    ],
    ["gap", { ...wholeRange, to_id: ids[2]! }, "MISSING_BLOCK_DISPOSITION"],
  ] as const)("rejects %s", (_label, range, code) => {
    expect(expandSourceCoverage(coverage([range]), ids)).toMatchObject({
      valid: false,
      findings: [{ code }],
    });
  });
  it("rejects overlapping ranges and individual/range collisions", () => {
    const overlapping = coverage([wholeRange, wholeRange]);
    const collision = coverage([wholeRange]);
    collision.block_dispositions.push({
      source_ref: ids[1]!,
      disposition: "interpreted",
    });
    for (const input of [overlapping, collision]) {
      expect(expandSourceCoverage(input, ids)).toMatchObject({
        valid: false,
        findings: [{ code: "DUPLICATE_BLOCK_DISPOSITION" }],
      });
    }
  });
  it("rejects unknown individual references even when ranges otherwise cover the source", () => {
    const input = coverage([wholeRange]);
    input.block_dispositions.push({
      source_ref: "unit:missing",
      disposition: "supporting",
    });
    expect(expandSourceCoverage(input, ids)).toMatchObject({
      valid: false,
      findings: [{ code: "UNKNOWN_BLOCK_DISPOSITION" }],
    });
  });
  it("handles singleton ranges and bounds output by the actual document size", () => {
    const manyIds = Array.from({ length: 5000 }, (_, index) => `unit:${index}`);
    const input = coverage([
      {
        from_id: manyIds[0]!,
        to_id: manyIds.at(-1)!,
        disposition: "interpreted",
      },
    ]);
    const expanded = expandSourceCoverage(input, manyIds);
    expect(expanded.valid && expanded.coverage.block_dispositions.length).toBe(
      5000,
    );
    expect(
      expandSourceCoverage(coverage([{ ...wholeRange, to_id: ids[0]! }]), [
        ids[0]!,
      ]),
    ).toMatchObject({
      valid: true,
      coverage: {
        block_dispositions: [{ source_ref: ids[0], disposition: "supporting" }],
      },
    });
  });
  it("keeps individual-only v2 responses valid, and still checks totals and unparsed reasons after expansion", () => {
    expect(
      expandSourceCoverage(validDraftInterpretationResult.coverage, [
        "source-block:001",
      ]),
    ).toEqual({
      valid: true,
      coverage: validDraftInterpretationResult.coverage,
    });
    const result = {
      ...validDraftInterpretationResult,
      coverage: coverage([wholeRange]),
    };
    result.coverage.total_blocks = 3;
    expect(
      validateInterpretationResponse(result, expected).findings.map(
        (finding) => finding.code,
      ),
    ).toContain("COVERAGE_TOTAL_MISMATCH");
    result.coverage.total_blocks = 4;
    result.coverage.block_disposition_ranges![0]!.to_id = ids[2]!;
    result.coverage.block_dispositions = [
      { source_ref: ids[3]!, disposition: "unparsed" },
    ];
    expect(
      validateInterpretationResponse(result, expected).findings.map(
        (finding) => finding.code,
      ),
    ).toContain("UNPARSED_ITEM_INCOMPLETE");
  });
});

describe("v2 range schema and provider projection", () => {
  const providerValidator = new Ajv2020({ strict: true }).compile(
    createGeminiSchemaProjection(),
  );
  it("accepts range responses in both generated local and provider schemas", () => {
    const result = {
      ...validDraftInterpretationResult,
      coverage: coverage([wholeRange]),
    };
    expect(validateSemanticInterpretationResultSchema(result).valid).toBe(true);
    expect(providerValidator(result)).toBe(true);
  });
  it.each([
    { ...wholeRange, disposition: "unparsed" },
    { from_id: ids[0], disposition: "supporting" },
    { ...wholeRange, unexpected: "field" },
  ])("rejects malformed or unparsed range %j", (range) => {
    const result = {
      ...validDraftInterpretationResult,
      coverage: { ...coverage([]), block_disposition_ranges: [range] },
    };
    expect(validateSemanticInterpretationResultSchema(result).valid).toBe(
      false,
    );
    expect(providerValidator(result)).toBe(false);
  });
  it("rejects historical v1 responses for new v2 requests", () => {
    const historical = {
      ...validDraftInterpretationResult,
      schema_version: "semantic-interpretation-result.v1",
    };
    expect(validateSemanticInterpretationResultSchema(historical).valid).toBe(
      false,
    );
    expect(providerValidator(historical)).toBe(false);
  });
});
