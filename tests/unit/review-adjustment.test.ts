import { describe, expect, it } from "vitest";

import type {
  SemanticInterpretationResult,
  TimeKind,
} from "../../src/domain/trip/types";
import {
  applyConservativeReviewAdjustments,
  type ReviewAdjustmentResult,
} from "../../src/features/review/reviewAdjustment";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function interpretationWithUnsupportedClock(
  kind: Extract<TimeKind, "exact" | "approximate" | "daypart">,
): SemanticInterpretationResult {
  const interpretation = structuredClone(validDraftInterpretationResult);
  const entity = interpretation.draft!.entities[0]!;
  entity.time = {
    kind,
    start: kind === "daypart" ? null : "06:30",
    end: null,
    daypart: kind === "daypart" ? "morning" : null,
    raw_text: "6:30",
    crosses_midnight: false,
  };
  interpretation.findings = [
    {
      id: "finding:local-fidelity:ambiguous_clock_precision_inferred:test",
      blocking: true,
      code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
      message: "6:30 has no supported meridiem.",
      severity: "review",
      entity_refs: [entity.id],
      source_refs: entity.source_refs,
    },
  ];
  return interpretation;
}

describe("closed conservative Review adjustment", () => {
  it.each(["exact", "approximate", "daypart"] as const)(
    "downgrades a locally proven unsupported %s clock without mutating the provider result",
    (kind) => {
      const interpretation = interpretationWithUnsupportedClock(kind);
      const recordedProviderResult = structuredClone(interpretation);

      const result: ReviewAdjustmentResult =
        applyConservativeReviewAdjustments(interpretation);

      expect(interpretation).toEqual(recordedProviderResult);
      expect(result.candidate).not.toBe(interpretation.draft);
      expect(result.candidate.entities[0]!.time).toEqual({
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: "6:30",
        crosses_midnight: false,
      });
      expect(result.candidate.entities[0]).toMatchObject({
        state: { unresolved: true },
        unresolved_fields: [kind === "daypart" ? "time.daypart" : "time.start"],
      });
      expect(result.adjustments).toEqual([
        expect.objectContaining({
          kind: "unsupported_clock_precision_downgrade",
          entity_id: interpretation.draft!.entities[0]!.id,
          finding_id:
            "finding:local-fidelity:ambiguous_clock_precision_inferred:test",
          source_refs: interpretation.draft!.entities[0]!.source_refs,
          before: recordedProviderResult.draft!.entities[0]!.time,
          after: result.candidate.entities[0]!.time,
        }),
      ]);
    },
  );

  it("does not treat a provider-authored lookalike code as permission to repair", () => {
    const interpretation = interpretationWithUnsupportedClock("exact");
    interpretation.findings[0]!.id = "finding:provider:claimed-fidelity";

    const result = applyConservativeReviewAdjustments(interpretation);

    expect(result.adjustments).toEqual([]);
    expect(result.candidate).toEqual(interpretation.draft);
    expect(result.candidate).not.toBe(interpretation.draft);
  });

  it("leaves findings outside the closed allowlist unchanged", () => {
    const interpretation = interpretationWithUnsupportedClock("exact");
    interpretation.findings[0] = {
      ...interpretation.findings[0]!,
      id: "finding:local-fidelity:day_binding_not_source_supported:test",
      code: "DAY_BINDING_NOT_SOURCE_SUPPORTED",
    };

    const result = applyConservativeReviewAdjustments(interpretation);

    expect(result.adjustments).toEqual([]);
    expect(result.candidate).toEqual(interpretation.draft);
  });
});
