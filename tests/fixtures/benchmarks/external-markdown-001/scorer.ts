const dispositions = new Set(["interpreted", "supporting", "unparsed"]);

interface BenchmarkAnnotation {
  id: string;
  classification?: string;
  expected_representation?: string;
  finding_requirement?: string;
}

export interface BenchmarkDefinition {
  benchmark_id: string;
  rubric_version?: string;
  blocks: Array<{ id: string }>;
  critical_events: BenchmarkAnnotation[];
  ambiguities: BenchmarkAnnotation[];
}

export interface BenchmarkEvaluation {
  schema_valid: boolean;
  response_envelope_valid: boolean;
  block_dispositions: Array<{
    block_id: string;
    disposition: string;
  }>;
  unparsed_items: Array<{
    block_id: string;
    reason_code: string;
    severity: string;
    message: string;
  }>;
  critical_event_results: Array<{
    annotation_id: string;
    status: string;
  }>;
  ambiguity_results: Array<{
    annotation_id: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  surfaced_ambiguity_ids: string[];
  invented_critical_events: unknown[];
  unsupported_exact_facts: unknown[];
}

export function scoreExternalMarkdownBenchmark001(
  benchmark: BenchmarkDefinition,
  evaluation: BenchmarkEvaluation,
) {
  const blockIds = new Set(benchmark.blocks.map((block) => block.id));
  const dispositionCounts = new Map<string, number>();
  for (const item of evaluation.block_dispositions) {
    if (!blockIds.has(item.block_id) || !dispositions.has(item.disposition))
      continue;
    dispositionCounts.set(
      item.block_id,
      (dispositionCounts.get(item.block_id) ?? 0) + 1,
    );
  }

  const silentlyOmittedBlockIds = [...blockIds].filter(
    (blockId) => !dispositionCounts.has(blockId),
  );
  const duplicateDispositionBlockIds = [...dispositionCounts]
    .filter(([, count]) => count !== 1)
    .map(([blockId]) => blockId);
  const unparsedBlockIds = new Set(
    evaluation.block_dispositions
      .filter((item) => item.disposition === "unparsed")
      .map((item) => item.block_id),
  );
  const completeUnparsedBlockIds = new Set(
    evaluation.unparsed_items
      .filter(
        (item) =>
          unparsedBlockIds.has(item.block_id) &&
          item.reason_code &&
          item.severity &&
          item.message,
      )
      .map((item) => item.block_id),
  );
  const incompleteUnparsedBlockIds = [...unparsedBlockIds].filter(
    (blockId) => !completeUnparsedBlockIds.has(blockId),
  );

  const criticalResultById = new Map(
    evaluation.critical_event_results.map((result) => [
      result.annotation_id,
      result,
    ]),
  );
  const missingCriticalEventIds = benchmark.critical_events
    .filter(
      (annotation) =>
        criticalResultById.get(annotation.id)?.status !== "present",
    )
    .map((annotation) => annotation.id);
  const ambiguityResultCounts = new Map<string, number>();
  const passingAmbiguityIds = new Set<string>();
  for (const result of evaluation.ambiguity_results) {
    ambiguityResultCounts.set(
      result.annotation_id,
      (ambiguityResultCounts.get(result.annotation_id) ?? 0) + 1,
    );
    if (result.status === "pass" && result.evidence.trim()) {
      passingAmbiguityIds.add(result.annotation_id);
    }
  }
  const failedAmbiguityRepresentationIds = benchmark.ambiguities
    .filter((annotation) => !passingAmbiguityIds.has(annotation.id))
    .map((annotation) => annotation.id);
  const duplicateAmbiguityResultIds = [...ambiguityResultCounts]
    .filter(([, count]) => count !== 1)
    .map(([annotationId]) => annotationId);
  const benchmarkAmbiguityIds = new Set(
    benchmark.ambiguities.map((annotation) => annotation.id),
  );
  const unknownAmbiguityResultIds = [...ambiguityResultCounts.keys()].filter(
    (annotationId) => !benchmarkAmbiguityIds.has(annotationId),
  );
  const ambiguityRepresentationRecall =
    benchmark.ambiguities.length === 0
      ? 1
      : (benchmark.ambiguities.length -
          failedAmbiguityRepresentationIds.length) /
        benchmark.ambiguities.length;
  const surfacedAmbiguityIds = new Set(evaluation.surfaced_ambiguity_ids);
  const requiredFindingIds = benchmark.ambiguities
    .filter(
      (annotation) =>
        annotation.finding_requirement === "required" ||
        annotation.finding_requirement ===
          "required_for_ambiguous_clock_only",
    )
    .map((annotation) => annotation.id);
  const missingRequiredFindingIds = requiredFindingIds.filter(
    (annotationId) => !surfacedAmbiguityIds.has(annotationId),
  );
  const accountedBlockCount = [...blockIds].filter(
    (blockId) => dispositionCounts.get(blockId) === 1,
  ).length;
  const sourceCoverage =
    benchmark.blocks.length === 0
      ? 1
      : accountedBlockCount / benchmark.blocks.length;

  const metrics = {
    schemaValid: evaluation.schema_valid,
    responseEnvelopeValid: evaluation.response_envelope_valid,
    missingCriticalEventIds,
    inventedCriticalEventCount: evaluation.invented_critical_events.length,
    unsupportedExactFactCount: evaluation.unsupported_exact_facts.length,
    failedAmbiguityRepresentationIds,
    ambiguityRepresentationRecall,
    missingRequiredFindingIds,
    duplicateAmbiguityResultIds,
    unknownAmbiguityResultIds,
    sourceCoverage,
    silentlyOmittedBlockIds,
    duplicateDispositionBlockIds,
    incompleteUnparsedBlockIds,
  };

  return {
    benchmarkId: benchmark.benchmark_id,
    pass:
      metrics.schemaValid &&
      metrics.responseEnvelopeValid &&
      metrics.missingCriticalEventIds.length === 0 &&
      metrics.inventedCriticalEventCount === 0 &&
      metrics.unsupportedExactFactCount === 0 &&
      metrics.ambiguityRepresentationRecall === 1 &&
      metrics.missingRequiredFindingIds.length === 0 &&
      metrics.duplicateAmbiguityResultIds.length === 0 &&
      metrics.unknownAmbiguityResultIds.length === 0 &&
      metrics.sourceCoverage === 1 &&
      metrics.silentlyOmittedBlockIds.length === 0 &&
      metrics.duplicateDispositionBlockIds.length === 0 &&
      metrics.incompleteUnparsedBlockIds.length === 0,
    metrics,
  };
}
