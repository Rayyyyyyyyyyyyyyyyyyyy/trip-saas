import { createHash } from "node:crypto";

import type {
  ParseTrip,
  ParseTripFailureCode,
} from "../../../../src/app/parseTrip";
import type {
  ParsedTripDraft,
  SemanticInterpretationResult,
  TripFinding,
} from "../../../../src/domain/trip/types";
import type {
  MarkdownStructuralEvidence,
  SourceEvidenceUnit,
  UnifiedSourceDocument,
} from "../../../../src/domain/source/types";
import { extractMarkdownSource } from "../../../../src/features/import/markdownSourceAdapter";
import type {
  GeminiDiagnosticSink,
  SafeGeminiDiagnostic,
} from "../../../../src/integrations/gemini/createSafeGeminiDiagnostic";
import { GEMINI_ACCEPTANCE_CANDIDATE } from "../../../../src/integrations/gemini/geminiTransport";

export const EXTERNAL_MARKDOWN_001_MODEL = GEMINI_ACCEPTANCE_CANDIDATE;
export const EXTERNAL_MARKDOWN_001_THINKING_LEVELS = [
  "low",
  "medium",
  "high",
] as const;
export const EXTERNAL_MARKDOWN_001_CREDENTIAL_ENV = "GEMINI_API_KEY";
export const EXTERNAL_MARKDOWN_001_OUTPUT_ENV =
  "EXTERNAL_MARKDOWN_BENCHMARK_OUTPUT";

type ThinkingLevel = (typeof EXTERNAL_MARKDOWN_001_THINKING_LEVELS)[number];

type FrozenBlock = {
  id: string;
  kind: string;
  lines: [number, number];
};

type FrozenAnnotation = {
  expectation: string;
  id: string;
  source_refs: string[];
};

type FrozenAmbiguity = FrozenAnnotation & {
  classification: string;
  expected_representation: string;
  finding_requirement: string;
};

type UnsupportedExactConstraint = {
  id: string;
  rule: string;
  source_refs: string[];
};

export type LiveBenchmarkDefinition = {
  ambiguities: FrozenAmbiguity[];
  benchmark_id: string;
  blocks: FrozenBlock[];
  critical_events: FrozenAnnotation[];
  rubric_version: string;
  schema_version: string;
  source_id: string;
  unsupported_exact_constraints: UnsupportedExactConstraint[];
};

export type BenchmarkBlockMapping = {
  annotation_block_id: string;
  frozen_kind: string;
  lines: [number, number];
  runtime_kind: MarkdownStructuralEvidence["block_type"];
  runtime_source_ref: string;
};

export class LiveBenchmarkError extends Error {
  constructor(
    readonly code:
      | "artifact_too_large"
      | "credential_missing"
      | "mapping_invalid"
      | "artifact_unsafe"
      | "execution_failed",
    message: string,
  ) {
    super(message);
    this.name = "LiveBenchmarkError";
  }
}

type ParserFactory = (options: {
  diagnosticSink: GeminiDiagnosticSink;
  model: typeof EXTERNAL_MARKDOWN_001_MODEL;
  thinkingLevel: ThinkingLevel;
}) => ParseTrip;

type Environment = Record<string, string | undefined>;

const MAX_ARTIFACT_BYTES = 512_000;
const MAX_TEXT_LENGTH = 2_000;
const MAX_COLLECTION_SIZE = 500;

function failMapping(message: string): never {
  throw new LiveBenchmarkError("mapping_invalid", message);
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    failMapping(`${label} contains duplicate values.`);
  }
}

function lineKey(lines: readonly [number, number]) {
  return `${lines[0]}:${lines[1]}`;
}

// The frozen benchmark annotates Markdown blocks, so alignment reads the
// Markdown structural evidence of each unit rather than the source-neutral
// envelope. A non-Markdown unit cannot align with this fixture.
function markdownEvidence(
  unit: SourceEvidenceUnit,
): MarkdownStructuralEvidence {
  const evidence = unit.structural_evidence.find(
    (item): item is MarkdownStructuralEvidence =>
      item.evidence_kind === "markdown_block",
  );
  if (!evidence) {
    return failMapping(
      `Evidence unit ${unit.id} carries no Markdown evidence.`,
    );
  }
  return evidence;
}

function compatibleKind(frozen: FrozenBlock, runtime: SourceEvidenceUnit) {
  const blockType = markdownEvidence(runtime).block_type;
  if (frozen.kind === "image") {
    return (
      blockType === "paragraph" &&
      runtime.links.some((link) => link.kind === "image")
    );
  }
  if (frozen.kind === "blockquote_like") return blockType === "blockquote";
  return frozen.kind === blockType;
}

function validateAnnotationReferences(
  benchmark: LiveBenchmarkDefinition,
  blockIds: Set<string>,
) {
  const annotations = [
    ...benchmark.critical_events,
    ...benchmark.ambiguities,
    ...benchmark.unsupported_exact_constraints,
  ];
  for (const annotation of annotations) {
    if (annotation.source_refs.length === 0) {
      failMapping(`${annotation.id} has no frozen source references.`);
    }
    for (const sourceRef of annotation.source_refs) {
      if (!blockIds.has(sourceRef)) {
        failMapping(`${annotation.id} references unknown block ${sourceRef}.`);
      }
    }
  }
}

export function mapFrozenBenchmarkBlocks(
  benchmark: LiveBenchmarkDefinition,
  document: UnifiedSourceDocument,
): BenchmarkBlockMapping[] {
  assertUnique(
    benchmark.blocks.map((block) => block.id),
    "Frozen benchmark block IDs",
  );
  assertUnique(
    benchmark.blocks.map((block) => lineKey(block.lines)),
    "Frozen benchmark line ranges",
  );
  assertUnique(
    document.evidence_units.map((unit) => unit.id),
    "Runtime source evidence unit IDs",
  );
  assertUnique(
    document.evidence_units.map((unit) => {
      const evidence = markdownEvidence(unit);
      return lineKey([evidence.line_start, evidence.line_end]);
    }),
    "Runtime source line ranges",
  );

  if (benchmark.source_id !== document.source_id) {
    failMapping("Frozen and runtime source identities do not match.");
  }
  if (benchmark.blocks.length !== document.evidence_units.length) {
    failMapping("Frozen and runtime block counts do not match.");
  }

  const frozenBlockIds = new Set(benchmark.blocks.map((block) => block.id));
  validateAnnotationReferences(benchmark, frozenBlockIds);
  const runtimeByLines = new Map(
    document.evidence_units.map((unit) => {
      const evidence = markdownEvidence(unit);
      return [lineKey([evidence.line_start, evidence.line_end]), unit] as const;
    }),
  );

  return benchmark.blocks.map((frozen) => {
    const runtime = runtimeByLines.get(lineKey(frozen.lines));
    if (!runtime) {
      return failMapping(`No runtime block matches frozen block ${frozen.id}.`);
    }
    if (!compatibleKind(frozen, runtime)) {
      return failMapping(
        `Frozen block ${frozen.id} kind ${frozen.kind} does not match runtime kind ${markdownEvidence(runtime).block_type}.`,
      );
    }
    return {
      annotation_block_id: frozen.id,
      frozen_kind: frozen.kind,
      lines: frozen.lines,
      runtime_kind: markdownEvidence(runtime).block_type,
      runtime_source_ref: runtime.id,
    };
  });
}

export function readLiveBenchmarkCredential(environment: Environment) {
  const credential = environment[EXTERNAL_MARKDOWN_001_CREDENTIAL_ENV]?.trim();
  if (!credential) {
    throw new LiveBenchmarkError(
      "credential_missing",
      `${EXTERNAL_MARKDOWN_001_CREDENTIAL_ENV} is required for the live benchmark.`,
    );
  }
  return credential;
}

function boundedText(value: string | null, label: string) {
  if (value !== null && value.length > MAX_TEXT_LENGTH) {
    throw new LiveBenchmarkError(
      "artifact_too_large",
      `${label} exceeds the bounded benchmark artifact limit.`,
    );
  }
  return value;
}

function boundedCollection<T>(values: T[], label: string) {
  if (values.length > MAX_COLLECTION_SIZE) {
    throw new LiveBenchmarkError(
      "artifact_too_large",
      `${label} exceeds the bounded benchmark artifact limit.`,
    );
  }
  return values;
}

function summarizeFinding(finding: TripFinding) {
  return {
    blocking: finding.blocking,
    code: boundedText(finding.code, "finding code"),
    message: boundedText(finding.message, "finding message"),
    severity: finding.severity ?? null,
    source_refs: finding.source_refs ?? finding.refs ?? [],
  };
}

function summarizeDraft(draft: ParsedTripDraft | null) {
  if (!draft) return null;
  return {
    trip: {
      title: boundedText(draft.trip.title, "trip title"),
      start_date: draft.trip.start_date,
      end_date: draft.trip.end_date,
      timezone: boundedText(draft.trip.timezone, "trip timezone"),
      geography: boundedCollection(draft.trip.geography, "trip geography"),
      source_refs: draft.trip.source_refs,
    },
    days: boundedCollection(draft.days, "days").map((day) => ({
      id: day.id,
      date: day.date,
      label: boundedText(day.label, "day label"),
      title: boundedText(day.title, "day title"),
      subtitle: boundedText(day.subtitle, "day subtitle"),
      source_order: day.source_order,
      source_refs: day.source_refs,
    })),
    entities: boundedCollection(draft.entities, "entities").map((entity) => ({
      id: entity.id,
      day_id: entity.day_id,
      semantic_type: entity.semantic_type,
      title: boundedText(entity.title, "entity title"),
      raw_label: boundedText(entity.raw_label, "entity raw label"),
      place: {
        name: boundedText(entity.place.name, "place name"),
        address: boundedText(entity.place.address, "place address"),
        raw_text: boundedText(entity.place.raw_text, "place raw text"),
        url: boundedText(entity.place.url, "place URL"),
        unresolved: entity.place.unresolved,
      },
      time: {
        ...entity.time,
        raw_text: boundedText(entity.time.raw_text, "time raw text"),
      },
      state: entity.state,
      reservation: entity.reservation,
      ticket: entity.ticket,
      readiness: entity.readiness,
      notes: boundedCollection(entity.notes, "entity notes").map((note) =>
        boundedText(note, "entity note"),
      ),
      confidence: entity.confidence,
      unresolved_fields: entity.unresolved_fields,
      source_refs: entity.source_refs,
    })),
    relationships: boundedCollection(draft.relationships, "relationships").map(
      (relationship) => ({
        id: relationship.id,
        type: relationship.type,
        member_entity_ids: relationship.member_entity_ids,
        parent_entity_id: relationship.parent_entity_id,
        child_entity_ids: relationship.child_entity_ids,
        condition: boundedText(
          relationship.condition,
          "relationship condition",
        ),
        source_refs: relationship.source_refs,
      }),
    ),
    supporting_items: boundedCollection(
      draft.supporting_items,
      "supporting items",
    ).map((item) => ({
      id: item.id,
      kind: item.kind,
      text: boundedText(item.text, "supporting item text"),
      url: boundedText(item.url, "supporting item URL"),
      unresolved: item.unresolved,
      source_refs: item.source_refs,
    })),
    findings: boundedCollection(draft.findings, "draft findings").map(
      summarizeFinding,
    ),
  };
}

function buildRunArtifact(
  benchmark: LiveBenchmarkDefinition,
  mapping: BenchmarkBlockMapping[],
  thinkingLevel: ThinkingLevel,
  result: SemanticInterpretationResult,
  diagnostics: unknown[],
) {
  const frozenIdByRuntimeId = new Map(
    mapping.map((item) => [item.runtime_source_ref, item.annotation_block_id]),
  );
  const dispositionByRuntimeId = new Map<string, string>();
  for (const disposition of result.coverage.block_dispositions) {
    if (!frozenIdByRuntimeId.has(disposition.source_ref)) {
      failMapping(
        "Provider result contains an unknown runtime source reference.",
      );
    }
    if (dispositionByRuntimeId.has(disposition.source_ref)) {
      failMapping("Provider result contains duplicate block dispositions.");
    }
    dispositionByRuntimeId.set(disposition.source_ref, disposition.disposition);
  }
  const blockDispositions = mapping.map((item) => {
    const disposition = dispositionByRuntimeId.get(item.runtime_source_ref);
    if (!disposition) {
      return failMapping(
        `Provider result omits mapped block ${item.annotation_block_id}.`,
      );
    }
    return {
      block_id: item.annotation_block_id,
      disposition,
    };
  });
  const sourceCoverage =
    mapping.length === 0 ? 1 : blockDispositions.length / mapping.length;

  return {
    thinking_level: thinkingLevel,
    execution_status: "succeeded" as const,
    automatic_metrics: {
      schema_valid: true,
      response_envelope_valid: true,
      source_coverage: sourceCoverage,
      mapped_block_count: mapping.length,
      silently_omitted_block_ids: [],
    },
    block_dispositions: blockDispositions,
    unparsed_items: result.coverage.unparsed_items.map((item) => {
      const blockId = frozenIdByRuntimeId.get(item.source_ref);
      if (!blockId) {
        return failMapping(
          "Provider result contains an unparsed item for an unknown runtime source reference.",
        );
      }
      return {
        block_id: blockId,
        locator: item.locator,
        reason_code: item.reason_code,
        severity: item.severity,
        message: boundedText(item.message, "unparsed item message"),
      };
    }),
    // This is an interpretation of the explicitly sanitized benchmark fixture,
    // never a provider envelope or a production ReviewSession. Keep the original
    // separate from any later human corrections.
    original_interpretation: structuredClone(result),
    review_recovery: {
      status: "not_run" as "not_run" | "failed" | "passed",
      corrections: [] as Array<{ note: string }>,
      canonical_evidence: null as string | null,
    },
    interpretation_summary: {
      status: result.status,
      findings: boundedCollection(result.findings, "result findings").map(
        summarizeFinding,
      ),
      draft: summarizeDraft(result.draft),
    },
    safe_diagnostics: diagnostics,
    human_review: {
      status: "pending" as const,
      rubric_version: benchmark.rubric_version,
      critical_events: benchmark.critical_events.map((annotation) => ({
        annotation_id: annotation.id,
        expectation: annotation.expectation,
        source_refs: annotation.source_refs,
        result: null as "present" | "missing" | null,
      })),
      invented_critical_events: null as number | null,
      unsupported_exact_constraints:
        benchmark.unsupported_exact_constraints.map((constraint) => ({
          constraint_id: constraint.id,
          rule: constraint.rule,
          source_refs: constraint.source_refs,
          violated: null as boolean | null,
          observed_fact: null as string | null,
        })),
      ambiguities: benchmark.ambiguities.map((annotation) => ({
        annotation_id: annotation.id,
        classification: annotation.classification,
        expectation: annotation.expectation,
        expected_representation: annotation.expected_representation,
        finding_requirement: annotation.finding_requirement,
        source_refs: annotation.source_refs,
        representation: null as "pass" | "fail" | null,
        finding_surfaced: null as boolean | null,
        evidence: null as string | null,
      })),
      ambiguity_representation_recall: null,
      pass: null,
    },
  };
}

type SuccessfulRun = ReturnType<typeof buildRunArtifact>;
type SafeFailure = {
  code:
    | ParseTripFailureCode
    | "unknown"
    | "credential_missing"
    | "mapping_invalid"
    | "artifact_too_large"
    | "artifact_unsafe";
  phase:
    | "setup"
    | "credential"
    | "source"
    | "preflight"
    | "request"
    | "response_validation"
    | "review_gate"
    | "artifact"
    | "unknown";
  http_status: number | null;
};
type RunOutcome =
  | SuccessfulRun
  | {
      thinking_level: ThinkingLevel;
      execution_status: "failed";
      failure: SafeFailure;
      safe_diagnostics: SafeGeminiDiagnostic[];
    }
  | {
      thinking_level: ThinkingLevel;
      execution_status: "not_run";
      reason: SafeFailure["code"] | "pending";
    };
export type LiveComparisonArtifact = {
  schema_version: "external-markdown-live-comparison.v3";
  benchmark_id: string;
  benchmark_schema_version: string;
  rubric_version: string;
  model_id: typeof EXTERNAL_MARKDOWN_001_MODEL;
  thinking_levels: typeof EXTERNAL_MARKDOWN_001_THINKING_LEVELS;
  executed_at: string;
  source_sha256: string;
  block_mapping: BenchmarkBlockMapping[];
  setup_failure: SafeFailure | null;
  execution_status: "incomplete" | "failed" | "succeeded";
  acceptance_status: "pending";
  runs: RunOutcome[];
};

const FAILURE_PHASES: Record<ParseTripFailureCode, SafeFailure["phase"]> = {
  aborted: "request",
  authentication_failed: "credential",
  coverage_invalid: "response_validation",
  draft_not_reviewable: "review_gate",
  invalid_response: "response_validation",
  malformed_response: "response_validation",
  preflight_limit: "preflight",
  provider_rejected: "request",
  provider_timeout: "request",
  provider_unavailable: "request",
  provider_unreachable: "request",
  rate_limited: "request",
  source_document_invalid: "source",
};
const DIAGNOSTIC_PHASES = [
  "credential",
  "preflight",
  "request",
  "response",
  "source",
];
const DIAGNOSTIC_CATEGORIES = [
  "aborted",
  "credential_unavailable",
  "network_failure",
  "provider_rejected",
  "provider_unavailable",
  "rate_limited",
  "timed_out",
  "unexpected",
];
function safeDiagnostic(
  value: SafeGeminiDiagnostic,
): SafeGeminiDiagnostic | null {
  if (
    !DIAGNOSTIC_PHASES.includes(value.phase) ||
    !DIAGNOSTIC_CATEGORIES.includes(value.category)
  )
    return null;
  return {
    schemaVersion: "gemini-diagnostic.v1",
    event: "gemini_request_failed",
    phase: value.phase,
    category: value.category,
    httpStatus:
      Number.isInteger(value.httpStatus) &&
      value.httpStatus! >= 100 &&
      value.httpStatus! <= 599
        ? value.httpStatus
        : null,
    retryAttempt:
      Number.isInteger(value.retryAttempt) &&
      value.retryAttempt! >= 0 &&
      value.retryAttempt! <= 10
        ? value.retryAttempt
        : null,
  };
}
function classifyFailure(
  error: unknown,
  diagnostics: SafeGeminiDiagnostic[],
): SafeFailure {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : null;
  const http_status = diagnostics.at(-1)?.httpStatus ?? null;
  if (typeof code === "string" && Object.hasOwn(FAILURE_PHASES, code)) {
    const safeCode = code as ParseTripFailureCode;
    return { code: safeCode, phase: FAILURE_PHASES[safeCode], http_status };
  }
  if (error instanceof DOMException && error.name === "AbortError")
    return { code: "aborted", phase: "request", http_status };
  if (
    error instanceof LiveBenchmarkError &&
    error.code !== "execution_failed"
  ) {
    return {
      code: error.code,
      phase: error.code === "credential_missing" ? "setup" : "artifact",
      http_status: null,
    };
  }
  return { code: "unknown", phase: "unknown", http_status };
}

// This function scores only an assessment of the ORIGINAL output. A correction
// or a renderable CanonicalTrip cannot change these observations retroactively.
export function evaluateOriginalParserQuality(
  review: SuccessfulRun["human_review"],
): "pending" | "failed" | "passed" {
  const findingRequired = (requirement: string) =>
    requirement === "required" ||
    requirement === "required_for_ambiguous_clock_only";
  if (
    review.critical_events.some((item) => item.result === "missing") ||
    (review.invented_critical_events !== null &&
      review.invented_critical_events > 0) ||
    review.unsupported_exact_constraints.some(
      (item) => item.violated === true,
    ) ||
    review.ambiguities.some(
      (item) =>
        item.representation === "fail" ||
        (findingRequired(item.finding_requirement) &&
          item.finding_surfaced === false),
    )
  )
    return "failed";
  if (
    review.critical_events.some((item) => item.result !== "present") ||
    review.invented_critical_events !== 0 ||
    review.unsupported_exact_constraints.some(
      (item) => item.violated !== false,
    ) ||
    review.ambiguities.some(
      (item) =>
        item.representation !== "pass" ||
        (findingRequired(item.finding_requirement) &&
          item.finding_surfaced !== true),
    )
  )
    return "pending";
  return "passed";
}

export function assertLiveBenchmarkExecution(
  artifact: LiveComparisonArtifact,
): void {
  if (artifact.execution_status !== "succeeded") {
    throw new LiveBenchmarkError(
      "execution_failed",
      "Live comparison incomplete or failed. Inspect the saved per-level outcomes; acceptance remains pending.",
    );
  }
}

function assertBoundedInterpretation(value: unknown, credential: string): void {
  if (typeof value === "string") {
    boundedText(value, "interpretation text");
    if (credential && value.includes(credential))
      throw new LiveBenchmarkError(
        "artifact_unsafe",
        "Benchmark output contains credential material.",
      );
  } else if (Array.isArray(value)) {
    boundedCollection(value, "interpretation collection").forEach((item) =>
      assertBoundedInterpretation(item, credential),
    );
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) =>
      assertBoundedInterpretation(item, credential),
    );
  }
}

export async function runExternalMarkdownBenchmark001LiveComparison(options: {
  benchmark: LiveBenchmarkDefinition;
  createParser: ParserFactory;
  credential: string;
  now?: () => Date;
  sourceContent: string;
  signal?: AbortSignal;
  onArtifact?: (artifact: LiveComparisonArtifact) => Promise<void>;
}): Promise<LiveComparisonArtifact> {
  const artifact: LiveComparisonArtifact = {
    schema_version: "external-markdown-live-comparison.v3",
    benchmark_id: options.benchmark.benchmark_id,
    benchmark_schema_version: options.benchmark.schema_version,
    rubric_version: options.benchmark.rubric_version,
    model_id: EXTERNAL_MARKDOWN_001_MODEL,
    thinking_levels: EXTERNAL_MARKDOWN_001_THINKING_LEVELS,
    executed_at: (options.now ?? (() => new Date()))().toISOString(),
    source_sha256: createHash("sha256")
      .update(options.sourceContent, "utf8")
      .digest("hex"),
    block_mapping: [],
    setup_failure: null,
    execution_status: "incomplete",
    acceptance_status: "pending",
    runs: EXTERNAL_MARKDOWN_001_THINKING_LEVELS.map((thinking_level) => ({
      thinking_level,
      execution_status: "not_run",
      reason: "pending",
    })),
  };
  const save = async () => {
    if (
      Buffer.byteLength(JSON.stringify(artifact, null, 2), "utf8") >
      MAX_ARTIFACT_BYTES
    )
      throw new LiveBenchmarkError(
        "artifact_too_large",
        "Live benchmark artifact exceeds the bounded output limit.",
      );
    await options.onArtifact?.(structuredClone(artifact));
  };
  const stopRemaining = (reason: SafeFailure["code"]) => {
    artifact.runs.forEach((run) => {
      if (run.execution_status === "not_run") run.reason = reason;
    });
  };
  let document: UnifiedSourceDocument;
  try {
    readLiveBenchmarkCredential({ GEMINI_API_KEY: options.credential });
    document = extractMarkdownSource({
      schema_version: "text-source-input.v1",
      source_id: options.benchmark.source_id,
      input_mode: "markdown_file",
      media_type: "text/markdown",
      content: options.sourceContent,
      display_name: "external-markdown-001.md",
    });
    artifact.block_mapping = mapFrozenBenchmarkBlocks(
      options.benchmark,
      document,
    );
  } catch (error) {
    artifact.setup_failure = { ...classifyFailure(error, []), phase: "setup" };
    artifact.execution_status = "failed";
    stopRemaining(artifact.setup_failure.code);
    await save();
    return artifact;
  }
  await save();
  for (const [
    index,
    thinkingLevel,
  ] of EXTERNAL_MARKDOWN_001_THINKING_LEVELS.entries()) {
    if (options.signal?.aborted) {
      stopRemaining("aborted");
      break;
    }
    const diagnostics: SafeGeminiDiagnostic[] = [];
    let phase: "setup" | "parse" | "artifact" = "setup";
    try {
      const parser = options.createParser({
        model: EXTERNAL_MARKDOWN_001_MODEL,
        thinkingLevel,
        diagnosticSink: {
          record(diagnostic) {
            const safe = safeDiagnostic(diagnostic);
            if (safe && diagnostics.length < 20) diagnostics.push(safe);
          },
        },
      });
      phase = "parse";
      const result = await parser({
        credential: options.credential,
        source: document,
        sourceId: document.source_id,
        signal: options.signal,
      });
      if (options.signal?.aborted)
        throw new DOMException("Benchmark stopped.", "AbortError");
      phase = "artifact";
      assertBoundedInterpretation(result, options.credential);
      const run = buildRunArtifact(
        options.benchmark,
        artifact.block_mapping,
        thinkingLevel,
        result,
        diagnostics,
      );
      // A rejected oversized run cannot crowd out already completed outcomes.
      if (Buffer.byteLength(JSON.stringify(run, null, 2), "utf8") > 150_000)
        throw new LiveBenchmarkError(
          "artifact_too_large",
          "Per-level benchmark artifact exceeds its limit.",
        );
      artifact.runs[index] = run;
    } catch (error) {
      const failure = classifyFailure(error, diagnostics);
      if (phase === "setup") failure.phase = "setup";
      artifact.runs[index] = {
        thinking_level: thinkingLevel,
        execution_status: "failed",
        failure,
        safe_diagnostics: diagnostics,
      };
      if (
        phase === "setup" ||
        [
          "authentication_failed",
          "aborted",
          "source_document_invalid",
          "preflight_limit",
        ].includes(failure.code)
      ) {
        stopRemaining(failure.code);
        await save();
        break;
      }
    }
    await save();
  }
  artifact.execution_status = artifact.runs.every(
    (run) => run.execution_status === "succeeded",
  )
    ? "succeeded"
    : "failed";
  await save();
  return artifact;
}
