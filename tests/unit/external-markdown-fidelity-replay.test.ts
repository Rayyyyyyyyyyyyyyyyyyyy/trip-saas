import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validateInterpretationFidelity } from "../../src/domain/source/validateInterpretationFidelity";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

type CapturedArtifact = {
  runs: Array<{
    thinking_level: string;
    execution_status: string;
    original_interpretation?: SemanticInterpretationResult;
  }>;
};

const root = process.cwd();
const sourceId = "benchmark:external-markdown-001:source";
const sourceContent = readFileSync(
  resolve(root, "tests/fixtures/benchmarks/external-markdown-001/source.md"),
  "utf8",
);
const extracted = extractMarkdownSource({
  schema_version: "text-source-input.v1",
  source_id: sourceId,
  input_mode: "markdown_file",
  media_type: "text/markdown",
  content: sourceContent,
  display_name: "source.md",
});
const sourceGate = validateUnifiedSourceDocument(extracted, {
  source_id: sourceId,
});
if (!sourceGate.valid)
  throw new Error("Benchmark source fixture must validate.");

describe("captured External Markdown #001 fidelity replay", () => {
  it.each([
    "external-markdown-001-post-guidance.json",
    "external-markdown-001-integrated-prompt.json",
  ])(
    "keeps source-supported Day-binding and daypart defects distinct in %s",
    (name) => {
      const artifact = JSON.parse(
        readFileSync(resolve(root, "temp/validation", name), "utf8"),
      ) as CapturedArtifact;
      const findings = Object.fromEntries(
        artifact.runs
          .filter(
            (run) =>
              run.execution_status === "succeeded" &&
              run.original_interpretation,
          )
          .map((run) => [
            run.thinking_level,
            validateInterpretationFidelity(
              run.original_interpretation!,
              sourceGate.document,
            ).map((finding) => finding.code),
          ]),
      );

      expect(findings.high).toEqual(
        expect.arrayContaining([
          "DAY_BINDING_NOT_SOURCE_SUPPORTED",
          "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
        ]),
      );
      expect(findings.medium).not.toContain("SOURCE_NAME_NOT_PRESERVED");
      expect(findings.high).not.toContain("SOURCE_NAME_NOT_PRESERVED");
    },
  );

  it("does not treat ordinary Hangul or an explicit daypart clock as a blocking defect", () => {
    const document = extractMarkdownSource({
      schema_version: "text-source-input.v1",
      source_id: "source:fidelity-control",
      input_mode: "pasted_markdown",
      media_type: "text/markdown",
      content: "# 行程\n\n저녁 식사 晚上 6:30",
      display_name: "Pasted itinerary",
    });
    const gate = validateUnifiedSourceDocument(document, {
      source_id: document.source_id,
    });
    if (!gate.valid) throw new Error("Control source must validate.");
    const result = structuredClone(validDraftInterpretationResult);
    result.source_id = document.source_id;
    result.draft!.trip.source_refs = [document.evidence_units[0].id];
    result.draft!.days = [];
    result.draft!.entities[0].day_id = null;
    result.draft!.entities[0].source_refs = [document.evidence_units[1].id];
    result.draft!.entities[0].time = {
      kind: "exact",
      start: "18:30",
      end: null,
      daypart: "evening",
      raw_text: "晚上 6:30",
      crosses_midnight: false,
    };

    expect(validateInterpretationFidelity(result, gate.document)).toEqual([]);
  });
});
