import { createHash } from "node:crypto";
import {
  createInterpretTrip,
  DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES,
  DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS,
} from "../../../../src/app/interpretTrip";
import type { InterpretationTransport } from "../../../../src/app/interpretationTransport";
import { ParseTripError } from "../../../../src/app/parseTrip";
import { chunkSourceBySheet } from "../../../../src/domain/source/chunkSourceBySheet";
import { validateUnifiedSourceDocument } from "../../../../src/domain/source/validateUnifiedSourceDocument";
import type { ValidatedUnifiedSourceDocument } from "../../../../src/domain/source/types";
import type { SemanticInterpretationResult } from "../../../../src/domain/trip/types";
import {
  prepareSpreadsheetFile,
  extractSpreadsheetSource,
} from "../../../../src/features/import/spreadsheetSourceAdapter";
import { IntakeFailureError } from "../../../../src/features/import/intakeFailure";
import { GEMINI_ACCEPTANCE_CANDIDATE } from "../../../../src/integrations/gemini/geminiTransport";

export const SPREADSHEET_BENCHMARK_MODEL = GEMINI_ACCEPTANCE_CANDIDATE;
export const SPREADSHEET_BENCHMARK_FIXTURES = [
  {
    id: "busan",
    layout: "row-per-event",
    path: "temp/Odata/24 ares/Busan.xlsx",
  },
  {
    id: "penghu",
    layout: "calendar-grid",
    path: "temp/Odata/12-14 橘/2025澎湖史努比.xlsx",
  },
  {
    id: "nagoya",
    layout: "column-per-day",
    path: "temp/Odata/21-22 ethan/名古屋.xlsx",
  },
] as const;
export type SpreadsheetBenchmarkFixture = {
  id: string;
  layout: string;
  path: string;
};
export type SpreadsheetAnnotations = {
  status: "TODO" | "ready";
  source_id: string | null;
  critical_events: Array<{
    id: string;
    expectation: string;
    source_refs: string[];
  }>;
  unsupported_exact_constraints: Array<{
    id: string;
    rule: string;
    source_refs: string[];
  }>;
  ambiguities: Array<{
    id: string;
    expectation: string;
    source_refs: string[];
    finding_required: boolean;
  }>;
};
export type ParserAssessment = {
  original_interpretation_sha256: string | null;
  critical_events: Array<{
    annotation_id: string;
    present: boolean | null;
    entity_refs: string[];
    evidence: string | null;
  }>;
  invented_critical_events: number | null;
  invented_event_evidence: string | null;
  unsupported_exact_constraints: Array<{
    annotation_id: string;
    violated: boolean | null;
    evidence: string | null;
  }>;
  ambiguities: Array<{
    annotation_id: string;
    preserved: boolean | null;
    finding_surfaced: boolean | null;
    finding_refs: string[];
    evidence: string | null;
  }>;
};
export class SpreadsheetBenchmarkError extends Error {
  constructor(
    readonly code:
      | "live_not_authorized"
      | "model_invalid"
      | "credential_missing"
      | "annotation_invalid"
      | "artifact_unsafe"
      | "artifact_too_large"
      | "preflight_probe_failed",
    message: string,
  ) {
    super(message);
    this.name = "SpreadsheetBenchmarkError";
  }
}
type Budget = {
  request_bytes: number;
  estimated_input_tokens: number;
  within_budget: boolean;
};
export type SpreadsheetBenchmarkArtifact = {
  schema_version: "spreadsheet-local-benchmark.v1";
  rubric_version: "faithful-spreadsheet-rubric.v1";
  fixture: SpreadsheetBenchmarkFixture;
  model_id: typeof SPREADSHEET_BENCHMARK_MODEL;
  mode: "prepare" | "live";
  executed_at: string;
  execution_status: "not_run" | "prepared" | "succeeded" | "failed";
  acceptance_status: "pending" | "failed";
  failure_code: string | null;
  source: null | {
    source_id: string;
    file_sha256: string;
    file_bytes: number;
    visible_sheets: Array<{ id: string; name: string; order: number }>;
    evidence_unit_count: number;
    evidence_mapping: Array<{ source_ref: string; locator: string }>;
  };
  preflight: null | {
    full: Budget;
    sheets: Array<Budget & { sheet_id: string }>;
    strategy: "single-request" | "whole-sheet" | "region-needed";
  };
  provider_observations: {
    completed_responses: number;
    responses_using_ranges: number;
    range_entries: number;
    range_misuse: null | {
      failure_code: "coverage_invalid";
      evidence: "application_response_gate";
      finding_codes: string[];
    };
    coverage_failure_with_ranges: string[] | null;
  };
  original_interpretation: SemanticInterpretationResult | null;
  original_interpretation_sha256: string | null;
  automatic_metrics: null | {
    schema_valid: true;
    accounting_complete: true;
    disposition_count: number;
    unparsed_count: number;
    interpretation_status: "draft" | "insufficient";
  };
  annotations: SpreadsheetAnnotations;
  parser_quality: ParserAssessment & { status: "pending" | "failed" };
  review_recovery: {
    status: "not_run";
    corrections: [];
    authoritative_canonical_evidence: null;
    persistence_evidence: null;
    desktop_viewer_evidence: null;
    mobile_viewer_evidence: null;
  };
};
const MAX_ARTIFACT_BYTES = 8_000_000;
const digest = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const nonempty = (value: string | null | undefined) => !!value?.trim();

/** External JSON is untrusted, even while annotation work is still TODO. */
export function decodeSpreadsheetAnnotations(
  value: unknown,
): SpreadsheetAnnotations {
  const invalid = (): never => {
    throw new SpreadsheetBenchmarkError(
      "annotation_invalid",
      "Annotations must satisfy the bounded, closed-field contract.",
    );
  };
  const object = (candidate: unknown, keys: string[]) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return invalid();
    const record = candidate as Record<string, unknown>;
    const actual = Object.keys(record);
    if (
      actual.length !== keys.length ||
      actual.some((key) => !keys.includes(key))
    )
      return invalid();
    return record;
  };
  const text = (candidate: unknown, bound: number) => {
    if (
      typeof candidate !== "string" ||
      !candidate.trim() ||
      candidate.length > bound
    )
      return invalid();
    return candidate;
  };
  const array = (candidate: unknown, bound: number): unknown[] => {
    if (!Array.isArray(candidate) || candidate.length > bound) return invalid();
    return candidate;
  };
  const refs = (candidate: unknown) => {
    const projected = array(candidate, 50_000).map((ref) => text(ref, 1024));
    if (new Set(projected).size !== projected.length) return invalid();
    return projected;
  };
  const root = object(value, [
    "status",
    "source_id",
    "critical_events",
    "unsupported_exact_constraints",
    "ambiguities",
  ]);
  if (root.status !== "TODO" && root.status !== "ready") return invalid();
  const projected: SpreadsheetAnnotations = {
    status: root.status,
    source_id: root.source_id === null ? null : text(root.source_id, 1024),
    critical_events: array(root.critical_events, 10_000).map((entry) => {
      const item = object(entry, ["id", "expectation", "source_refs"]);
      return {
        id: text(item.id, 1024),
        expectation: text(item.expectation, 4000),
        source_refs: refs(item.source_refs),
      };
    }),
    unsupported_exact_constraints: array(
      root.unsupported_exact_constraints,
      10_000,
    ).map((entry) => {
      const item = object(entry, ["id", "rule", "source_refs"]);
      return {
        id: text(item.id, 1024),
        rule: text(item.rule, 4000),
        source_refs: refs(item.source_refs),
      };
    }),
    ambiguities: array(root.ambiguities, 10_000).map((entry) => {
      const item = object(entry, [
        "id",
        "expectation",
        "source_refs",
        "finding_required",
      ]);
      if (typeof item.finding_required !== "boolean") return invalid();
      return {
        id: text(item.id, 1024),
        expectation: text(item.expectation, 4000),
        source_refs: refs(item.source_refs),
        finding_required: item.finding_required,
      };
    }),
  };
  const entries = [
    ...projected.critical_events,
    ...projected.unsupported_exact_constraints,
    ...projected.ambiguities,
  ];
  if (
    entries.length > 10_000 ||
    new Set(entries.map((item) => item.id)).size !== entries.length ||
    Buffer.byteLength(JSON.stringify(projected)) > MAX_ARTIFACT_BYTES
  )
    return invalid();
  return projected;
}

export function parseSpreadsheetAnnotationsJson(
  content: string,
): SpreadsheetAnnotations {
  try {
    if (Buffer.byteLength(content) > MAX_ARTIFACT_BYTES) throw new Error();
    return decodeSpreadsheetAnnotations(JSON.parse(content));
  } catch {
    // JSON syntax diagnostics can echo private input; expose only a fixed error.
    throw new SpreadsheetBenchmarkError(
      "annotation_invalid",
      "Annotation JSON is invalid or exceeds its bound.",
    );
  }
}

export function readSpreadsheetBenchmarkConfiguration(
  environment: Record<string, string | undefined>,
) {
  const mode = environment.SPREADSHEET_BENCHMARK_MODE ?? "prepare";
  if (mode !== "prepare" && mode !== "live")
    throw new SpreadsheetBenchmarkError(
      "live_not_authorized",
      "Choose prepare or explicitly authorized live mode.",
    );
  const model =
    environment.SPREADSHEET_BENCHMARK_MODEL ??
    (mode === "prepare" ? SPREADSHEET_BENCHMARK_MODEL : "");
  if (model !== SPREADSHEET_BENCHMARK_MODEL)
    throw new SpreadsheetBenchmarkError(
      "model_invalid",
      "Specify the exact candidate model ID.",
    );
  if (mode === "prepare")
    return { mode, model, liveAuthorized: false } as const;
  if (environment.SPREADSHEET_BENCHMARK_LIVE !== "authorized")
    throw new SpreadsheetBenchmarkError(
      "live_not_authorized",
      "Live mode requires the explicit authorization flag.",
    );
  return {
    mode,
    model,
    liveAuthorized: true,
    credential: environment.GEMINI_API_KEY,
  } as const;
}

/** Human judgments apply to the exact pre-Review result, never its recovery. */
export function evaluateSpreadsheetParserQuality(
  annotations: SpreadsheetAnnotations,
  assessment: ParserAssessment,
  original: SemanticInterpretationResult,
): "pending" | "failed" | "passed" {
  try {
    annotations = decodeSpreadsheetAnnotations(annotations);
  } catch {
    return "pending";
  }
  if (
    annotations.status !== "ready" ||
    annotations.source_id !== original.source_id ||
    annotations.critical_events.length === 0 ||
    assessment.original_interpretation_sha256 !==
      digest(JSON.stringify(original))
  )
    return "pending";
  const sourceRefs = new Set(
    original.coverage.block_dispositions.map((item) => item.source_ref),
  );
  const annotated = [
    ...annotations.critical_events,
    ...annotations.unsupported_exact_constraints,
    ...annotations.ambiguities,
  ];
  const assessed = [
    ...assessment.critical_events,
    ...assessment.unsupported_exact_constraints,
    ...assessment.ambiguities,
  ];
  if (
    new Set(annotated.map((item) => item.id)).size !== annotated.length ||
    annotated.some(
      (item) =>
        !item.source_refs.length ||
        item.source_refs.some((ref) => !sourceRefs.has(ref)),
    ) ||
    assessed.length !== annotated.length ||
    new Set(assessed.map((item) => item.annotation_id)).size !==
      assessed.length ||
    assessed.some(
      (item) =>
        !annotated.some((annotation) => annotation.id === item.annotation_id),
    )
  )
    return "pending";
  const critical = annotations.critical_events.map((a) =>
    assessment.critical_events.find((v) => v.annotation_id === a.id),
  );
  const constraints = annotations.unsupported_exact_constraints.map((a) =>
    assessment.unsupported_exact_constraints.find(
      (v) => v.annotation_id === a.id,
    ),
  );
  const ambiguities = annotations.ambiguities.map((a) => ({
    annotation: a,
    judgment: assessment.ambiguities.find((v) => v.annotation_id === a.id),
  }));
  const originalFindings = [
    ...original.findings,
    ...(original.draft?.findings ?? []),
  ];
  const relatedFindings = (
    annotation: SpreadsheetAnnotations["ambiguities"][number],
  ) =>
    originalFindings.filter(
      (finding) =>
        nonempty(finding.id) &&
        finding.source_refs?.some((ref) =>
          annotation.source_refs.includes(ref),
        ),
    );
  if (
    critical.some((v) => v?.present === false) ||
    (assessment.invented_critical_events !== null &&
      assessment.invented_critical_events > 0) ||
    constraints.some((v) => v?.violated === true) ||
    ambiguities.some(
      ({ annotation, judgment }) =>
        judgment?.preserved === false ||
        (annotation.finding_required &&
          (judgment?.finding_surfaced === false ||
            relatedFindings(annotation).length === 0)),
    )
  )
    return "failed";
  const entityIds = new Set(original.draft?.entities.map((e) => e.id) ?? []);
  if (
    original.status !== "draft" ||
    critical.some(
      (v) =>
        v?.present !== true ||
        !nonempty(v.evidence) ||
        !v.entity_refs.length ||
        v.entity_refs.some((id) => !entityIds.has(id)),
    ) ||
    assessment.invented_critical_events !== 0 ||
    !nonempty(assessment.invented_event_evidence) ||
    constraints.some((v) => v?.violated !== false || !nonempty(v.evidence)) ||
    ambiguities.some(
      ({ annotation, judgment }) =>
        judgment?.preserved !== true ||
        !nonempty(judgment.evidence) ||
        (annotation.finding_required &&
          (judgment.finding_surfaced !== true ||
            !Array.isArray(judgment.finding_refs) ||
            !judgment.finding_refs.length ||
            new Set(judgment.finding_refs).size !==
              judgment.finding_refs.length ||
            judgment.finding_refs.some(
              (id) =>
                !relatedFindings(annotation).some(
                  (finding) => finding.id === id,
                ),
            ))),
    )
  )
    return "pending";
  return "passed";
}

function validateAnnotations(
  annotations: SpreadsheetAnnotations,
  source: ValidatedUnifiedSourceDocument,
) {
  if (annotations.status !== "ready") return;
  const ids = new Set(source.evidence_units.map((u) => u.id));
  const entries = [
    ...annotations.critical_events,
    ...annotations.unsupported_exact_constraints,
    ...annotations.ambiguities,
  ];
  if (
    annotations.source_id !== source.source_id ||
    !annotations.critical_events.length ||
    new Set(entries.map((a) => a.id)).size !== entries.length ||
    entries.some(
      (a) =>
        !a.source_refs.length || a.source_refs.some((ref) => !ids.has(ref)),
    )
  )
    throw new SpreadsheetBenchmarkError(
      "annotation_invalid",
      "Ready annotations must bind to this source and its evidence units.",
    );
}

// Invoke the real application prompt builder/source gate. Intercept its prepare
// seam after measuring the real envelope, so a probe cannot reach send.
async function measure(
  source: ValidatedUnifiedSourceDocument,
  transport: InterpretationTransport,
): Promise<Budget> {
  let measured: Budget | null = null;
  const parser = createInterpretTrip({
    transport: {
      prepare(prompt) {
        const envelope = transport.prepare(prompt);
        measured = {
          request_bytes: envelope.requestBytes,
          estimated_input_tokens: envelope.estimatedInputTokens,
          within_budget:
            Number.isFinite(envelope.requestBytes) &&
            envelope.requestBytes >= 0 &&
            Number.isFinite(envelope.estimatedInputTokens) &&
            envelope.estimatedInputTokens >= 0 &&
            envelope.requestBytes <= DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES &&
            envelope.estimatedInputTokens <=
              DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS,
        };
        throw new SpreadsheetBenchmarkError(
          "preflight_probe_failed",
          "Measurement stops before send.",
        );
      },
    },
  });
  try {
    await parser({ source, sourceId: source.source_id, credential: "" });
  } catch (cause) {
    if (
      !(cause instanceof ParseTripError) ||
      cause.code !== "preflight_limit" ||
      measured === null
    )
      throw cause;
  }
  if (!measured)
    throw new SpreadsheetBenchmarkError(
      "preflight_probe_failed",
      "No envelope was prepared.",
    );
  return measured;
}

function assertSafeArtifact(
  artifact: SpreadsheetBenchmarkArtifact,
  credential = "",
) {
  const visit = (value: unknown, depth: number) => {
    if (depth > 30)
      throw new SpreadsheetBenchmarkError(
        "artifact_too_large",
        "Artifact nesting is too deep.",
      );
    if (typeof value === "string" && credential && value.includes(credential))
      throw new SpreadsheetBenchmarkError(
        "artifact_unsafe",
        "Credential material cannot enter benchmark artifacts.",
      );
    if (Array.isArray(value)) {
      if (value.length > 50_000)
        throw new SpreadsheetBenchmarkError(
          "artifact_too_large",
          "Artifact collection exceeds its bound.",
        );
      value.forEach((v) => visit(v, depth + 1));
    } else if (value && typeof value === "object")
      Object.entries(value).forEach(([key, v]) => {
        if (
          /^(?:credential|api_?key|thoughtSignature|provider_envelope)$/iu.test(
            key,
          )
        )
          throw new SpreadsheetBenchmarkError(
            "artifact_unsafe",
            "Forbidden artifact field.",
          );
        visit(v, depth + 1);
      });
  };
  visit(artifact, 0);
  if (Buffer.byteLength(JSON.stringify(artifact)) > MAX_ARTIFACT_BYTES)
    throw new SpreadsheetBenchmarkError(
      "artifact_too_large",
      "Artifact exceeds its byte bound.",
    );
}

export async function runSpreadsheetBenchmark(options: {
  fixture: SpreadsheetBenchmarkFixture;
  mode: "prepare" | "live";
  model: string;
  liveAuthorized?: boolean;
  credential?: string;
  readBytes: (path: string) => Promise<Uint8Array>;
  transport: InterpretationTransport;
  annotations?: unknown;
  signal?: AbortSignal;
  now?: () => Date;
  onArtifact?: (artifact: SpreadsheetBenchmarkArtifact) => Promise<void>;
}): Promise<SpreadsheetBenchmarkArtifact> {
  // Reject before file access, transport preparation, or credential access.
  if (options.model !== SPREADSHEET_BENCHMARK_MODEL)
    throw new SpreadsheetBenchmarkError(
      "model_invalid",
      "Only the exact selected candidate ID is permitted.",
    );
  if (options.mode === "live" && options.liveAuthorized !== true)
    throw new SpreadsheetBenchmarkError(
      "live_not_authorized",
      "Live collection requires explicit authorization.",
    );
  const annotations = decodeSpreadsheetAnnotations(
    options.annotations ?? {
      status: "TODO" as const,
      source_id: null,
      critical_events: [],
      unsupported_exact_constraints: [],
      ambiguities: [],
    },
  );
  const artifact: SpreadsheetBenchmarkArtifact = {
    schema_version: "spreadsheet-local-benchmark.v1",
    rubric_version: "faithful-spreadsheet-rubric.v1",
    fixture: { ...options.fixture },
    model_id: SPREADSHEET_BENCHMARK_MODEL,
    mode: options.mode,
    executed_at: (options.now?.() ?? new Date()).toISOString(),
    execution_status: "not_run",
    acceptance_status: "pending",
    failure_code: null,
    source: null,
    preflight: null,
    provider_observations: {
      completed_responses: 0,
      responses_using_ranges: 0,
      range_entries: 0,
      range_misuse: null,
      coverage_failure_with_ranges: null,
    },
    original_interpretation: null,
    original_interpretation_sha256: null,
    automatic_metrics: null,
    annotations,
    parser_quality: {
      status: "pending",
      original_interpretation_sha256: null,
      critical_events: annotations.critical_events.map((a) => ({
        annotation_id: a.id,
        present: null,
        entity_refs: [],
        evidence: null,
      })),
      invented_critical_events: null,
      invented_event_evidence: null,
      unsupported_exact_constraints:
        annotations.unsupported_exact_constraints.map((a) => ({
          annotation_id: a.id,
          violated: null,
          evidence: null,
        })),
      ambiguities: annotations.ambiguities.map((a) => ({
        annotation_id: a.id,
        preserved: null,
        finding_surfaced: null,
        finding_refs: [],
        evidence: null,
      })),
    },
    review_recovery: {
      status: "not_run",
      corrections: [],
      authoritative_canonical_evidence: null,
      persistence_evidence: null,
      desktop_viewer_evidence: null,
      mobile_viewer_evidence: null,
    },
  };
  // Prepare mode never accesses the credential property, even if supplied.
  const credential =
    options.mode === "live" ? (options.credential?.trim() ?? "") : "";
  const checkpoint = async () => {
    assertSafeArtifact(artifact, credential);
    await options.onArtifact?.(structuredClone(artifact));
  };
  try {
    if (options.mode === "live" && !credential)
      throw new SpreadsheetBenchmarkError(
        "credential_missing",
        "A locally supplied credential is required.",
      );
    if (options.signal?.aborted)
      throw new ParseTripError("aborted", "Stopped benchmark.");
    const bytes = await options.readBytes(options.fixture.path);
    const buffer = bytes.slice().buffer;
    const name = options.fixture.path.split(/[\\/]/u).at(-1)!;
    const prepared = await prepareSpreadsheetFile({
      name,
      size: bytes.byteLength,
      arrayBuffer: async () => buffer,
    });
    const extracted = await extractSpreadsheetSource(prepared);
    const gate = validateUnifiedSourceDocument(extracted, {
      source_id: extracted.source_id,
    });
    if (!gate.valid)
      throw new ParseTripError(
        "source_document_invalid",
        "Benchmark source gate failed.",
      );
    const source = gate.document;
    validateAnnotations(annotations, source);
    artifact.source = {
      source_id: source.source_id,
      file_sha256: digest(bytes),
      file_bytes: bytes.byteLength,
      visible_sheets: prepared.visibleSheets.map((s) => ({ ...s })),
      evidence_unit_count: source.evidence_units.length,
      evidence_mapping: source.evidence_units.map((u) => ({
        source_ref: u.id,
        locator: u.locator,
      })),
    };
    const full = await measure(source, options.transport);
    const sheets: Array<Budget & { sheet_id: string }> = [];
    for (const chunk of chunkSourceBySheet(source)) {
      if (options.signal?.aborted)
        throw new ParseTripError("aborted", "Stopped benchmark.");
      const chunkGate = validateUnifiedSourceDocument(chunk, {
        source_id: source.source_id,
      });
      if (!chunkGate.valid)
        throw new ParseTripError(
          "source_document_invalid",
          "Chunk source gate failed.",
        );
      const evidence = chunk.evidence_units[0].structural_evidence[0];
      sheets.push({
        ...(await measure(chunkGate.document, options.transport)),
        sheet_id:
          evidence.evidence_kind === "tabular_region"
            ? evidence.sheet_id
            : "unknown",
      });
    }
    artifact.preflight = {
      full,
      sheets,
      strategy: full.within_budget
        ? "single-request"
        : sheets.length > 1 && sheets.every((s) => s.within_budget)
          ? "whole-sheet"
          : "region-needed",
    };
    artifact.execution_status = "prepared";
    await checkpoint();
    if (options.mode === "prepare") return artifact;
    const observed: InterpretationTransport = {
      prepare(prompt) {
        const envelope = options.transport.prepare(prompt);
        return {
          ...envelope,
          send: async (request) => {
            const value = await envelope.send(request);
            artifact.provider_observations.completed_responses++;
            const ranges = (
              value as {
                coverage?: { block_disposition_ranges?: unknown };
              } | null
            )?.coverage?.block_disposition_ranges;
            if (Array.isArray(ranges) && ranges.length) {
              artifact.provider_observations.responses_using_ranges++;
              artifact.provider_observations.range_entries += ranges.length;
            }
            return value;
          },
        };
      },
    };
    const result = await createInterpretTrip({ transport: observed })({
      source,
      sourceId: source.source_id,
      credential,
      signal: options.signal,
    });
    artifact.original_interpretation = structuredClone(result);
    artifact.original_interpretation_sha256 = digest(JSON.stringify(result));
    artifact.parser_quality.original_interpretation_sha256 =
      artifact.original_interpretation_sha256;
    artifact.automatic_metrics = {
      schema_valid: true,
      accounting_complete: true,
      disposition_count: result.coverage.block_dispositions.length,
      unparsed_count: result.coverage.unparsed_items.length,
      interpretation_status: result.status,
    };
    artifact.execution_status = "succeeded";
    if (result.status === "insufficient") {
      artifact.parser_quality.status = "failed";
      artifact.acceptance_status = "failed";
    }
    assertSafeArtifact(artifact, credential);
  } catch (cause) {
    artifact.execution_status = "failed";
    artifact.acceptance_status = "failed";
    artifact.failure_code =
      cause instanceof ParseTripError ||
      cause instanceof SpreadsheetBenchmarkError
        ? cause.code
        : cause instanceof IntakeFailureError
          ? cause.failure.code
          : "unknown";
    if (
      cause instanceof ParseTripError &&
      cause.code === "coverage_invalid" &&
      artifact.provider_observations.range_entries > 0
    ) {
      const allowed = new Set([
        "UNKNOWN_COVERAGE_RANGE_ENDPOINT",
        "REVERSED_COVERAGE_RANGE",
        "UNKNOWN_BLOCK_DISPOSITION",
        "DUPLICATE_BLOCK_DISPOSITION",
        "MISSING_BLOCK_DISPOSITION",
      ]);
      const codes = cause.findings
        .map((finding) => finding.code)
        .filter((code) => allowed.has(code));
      artifact.provider_observations.coverage_failure_with_ranges = codes;
      // Other coverage failures may be caused by individual dispositions. Do
      // not attribute them to ranges without range-specific gate evidence.
      if (
        codes.some(
          (code) =>
            code === "UNKNOWN_COVERAGE_RANGE_ENDPOINT" ||
            code === "REVERSED_COVERAGE_RANGE",
        )
      )
        artifact.provider_observations.range_misuse = {
          failure_code: "coverage_invalid",
          evidence: "application_response_gate",
          finding_codes: codes,
        };
    }
    // Unsafe/oversized data never blocks recording the bounded failure outcome.
    artifact.original_interpretation = null;
    artifact.original_interpretation_sha256 = null;
    artifact.automatic_metrics = null;
  }
  await checkpoint();
  return artifact;
}
