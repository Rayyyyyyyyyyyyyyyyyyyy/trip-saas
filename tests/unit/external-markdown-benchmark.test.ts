import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scoreExternalMarkdownBenchmark001 } from "../fixtures/benchmarks/external-markdown-001/scorer";
import type {
  BenchmarkDefinition,
  BenchmarkEvaluation,
} from "../fixtures/benchmarks/external-markdown-001/scorer";

const fixtureUrl = new URL(
  "../fixtures/benchmarks/external-markdown-001/",
  import.meta.url,
);
const readJson = <T>(name: string): T =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(name, fixtureUrl)), "utf8"),
  ) as T;

describe("External Markdown Benchmark #001 scorer", () => {
  const benchmark = readJson<BenchmarkDefinition>("benchmark.json");
  const passingEvaluation = readJson<BenchmarkEvaluation>(
    "evaluation.example.json",
  );

  it("pins the fidelity rubric and expected representation for every original annotation", () => {
    expect(benchmark.rubric_version).toBe("faithful-markdown-rubric.v2");
    expect(benchmark.ambiguities).toHaveLength(15);
    expect(
      benchmark.ambiguities.every(
        (annotation) =>
          annotation.classification &&
          annotation.expected_representation &&
          annotation.finding_requirement,
      ),
    ).toBe(true);
  });

  it("accepts a report that satisfies every parser-quality gate", () => {
    const report = scoreExternalMarkdownBenchmark001(
      benchmark,
      passingEvaluation,
    );

    expect(report.pass).toBe(true);
    expect(report.metrics).toMatchObject({
      ambiguityRepresentationRecall: 1,
      missingRequiredFindingIds: [],
      sourceCoverage: 1,
      inventedCriticalEventCount: 0,
      unsupportedExactFactCount: 0,
      silentlyOmittedBlockIds: [],
      incompleteUnparsedBlockIds: [],
    });
  });

  it("reports missing, invented, unsupported, ambiguous, and silent failures", () => {
    const failingEvaluation = structuredClone(passingEvaluation);
    failingEvaluation.critical_event_results =
      failingEvaluation.critical_event_results.slice(1);
    failingEvaluation.invented_critical_events = [{ title: "Invented tour" }];
    failingEvaluation.unsupported_exact_facts = [
      { constraint_id: "unsupported-002", value: "TPE to ICN" },
    ];
    failingEvaluation.ambiguity_results = failingEvaluation.ambiguity_results.map(
      (result) =>
        result.annotation_id === "ambiguity-011"
          ? { ...result, status: "fail" as const }
          : result,
    );
    failingEvaluation.surfaced_ambiguity_ids =
      failingEvaluation.surfaced_ambiguity_ids.filter(
        (annotationId) => annotationId !== "ambiguity-007",
      );
    failingEvaluation.block_dispositions =
      failingEvaluation.block_dispositions.filter(
        (item) => item.block_id !== "b035",
      );

    const report = scoreExternalMarkdownBenchmark001(
      benchmark,
      failingEvaluation,
    );

    expect(report.pass).toBe(false);
    expect(report.metrics.missingCriticalEventIds).toContain("critical-001");
    expect(report.metrics.inventedCriticalEventCount).toBe(1);
    expect(report.metrics.unsupportedExactFactCount).toBe(1);
    expect(report.metrics.failedAmbiguityRepresentationIds).toContain(
      "ambiguity-011",
    );
    expect(report.metrics.missingRequiredFindingIds).toContain("ambiguity-007");
    expect(report.metrics.silentlyOmittedBlockIds).toContain("b035");
  });

  it("does not require a finding when rubric v2 says the faithful representation is enough", () => {
    const evaluation = structuredClone(passingEvaluation);
    evaluation.surfaced_ambiguity_ids =
      evaluation.surfaced_ambiguity_ids.filter(
        (annotationId) => annotationId !== "ambiguity-001",
      );

    const report = scoreExternalMarkdownBenchmark001(benchmark, evaluation);

    expect(report.pass).toBe(true);
    expect(report.metrics.missingRequiredFindingIds).not.toContain(
      "ambiguity-001",
    );
  });
});
