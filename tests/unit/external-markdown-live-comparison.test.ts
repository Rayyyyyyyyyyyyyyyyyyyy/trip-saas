import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { ParseTripError, type ParseTrip } from "../../src/app/parseTrip";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import {
  EXTERNAL_MARKDOWN_001_MODEL,
  EXTERNAL_MARKDOWN_001_THINKING_LEVELS,
  assertLiveBenchmarkExecution,
  evaluateOriginalParserQuality,
  mapFrozenBenchmarkBlocks,
  readLiveBenchmarkCredential,
  runExternalMarkdownBenchmark001LiveComparison,
  type LiveBenchmarkDefinition,
} from "../fixtures/benchmarks/external-markdown-001/liveComparisonRunner";

const fixtureUrl = new URL(
  "../fixtures/benchmarks/external-markdown-001/",
  import.meta.url,
);
const benchmark = JSON.parse(
  readFileSync(fileURLToPath(new URL("benchmark.json", fixtureUrl)), "utf8"),
) as LiveBenchmarkDefinition;
const sourceContent = readFileSync(
  fileURLToPath(new URL("source.md", fixtureUrl)),
  "utf8",
);

function completeResult(
  sourceId: string,
  blockIds: string[],
): SemanticInterpretationResult {
  return {
    schema_version: "semantic-interpretation-result.v2",
    source_schema_version: "unified-source-document.v1",
    source_id: sourceId,
    status: "insufficient",
    draft: null,
    findings: [
      {
        code: "STRUCTURE_INSUFFICIENT",
        message: "Human review is still required.",
        blocking: true,
      },
    ],
    coverage: {
      total_blocks: blockIds.length,
      block_dispositions: blockIds.map((sourceRef) => ({
        source_ref: sourceRef,
        disposition: "supporting",
      })),
      unparsed_items: [],
    },
  };
}

describe("External Markdown Benchmark #001 live comparison runner", () => {
  it("requires an explicitly injected environment credential", () => {
    expect(() => readLiveBenchmarkCredential({})).toThrowError(
      expect.objectContaining({ code: "credential_missing" }),
    );
    expect(
      readLiveBenchmarkCredential({ GEMINI_API_KEY: "  injected-key  " }),
    ).toBe("injected-key");
  });

  it("validates a complete deterministic frozen-to-runtime block mapping", () => {
    const document = extractMarkdownSource({
      schema_version: "text-source-input.v1",
      source_id: benchmark.source_id,
      input_mode: "markdown_file",
      media_type: "text/markdown",
      content: sourceContent,
      display_name: "external-markdown-001.md",
    });
    const mapping = mapFrozenBenchmarkBlocks(benchmark, document);

    expect(mapping).toHaveLength(35);
    expect(mapping[8]).toMatchObject({
      annotation_block_id: "b009",
      frozen_kind: "image",
      runtime_kind: "paragraph",
    });
    expect(mapping[31]).toMatchObject({
      annotation_block_id: "b032",
      frozen_kind: "blockquote_like",
      runtime_kind: "blockquote",
    });

    const incomplete = structuredClone(benchmark);
    incomplete.blocks[0]!.lines = [1, 2];
    expect(() => mapFrozenBenchmarkBlocks(incomplete, document)).toThrowError(
      expect.objectContaining({ code: "mapping_invalid" }),
    );
  });

  it("runs low, medium, and high with the exact candidate model and emits a pending bounded artifact", async () => {
    const calls: Array<{ model: string; thinkingLevel: string }> = [];
    const credential = "credential-must-not-appear";
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential,
      sourceContent,
      now: () => new Date("2026-09-02T09:00:00.000Z"),
      createParser: ({ model, thinkingLevel }) => {
        calls.push({ model, thinkingLevel });
        const parser: ParseTrip = async ({ source }) =>
          completeResult(
            source.source_id,
            source.evidence_units.map((unit) => unit.id),
          );
        return parser;
      },
    });

    expect(calls).toEqual(
      EXTERNAL_MARKDOWN_001_THINKING_LEVELS.map((thinkingLevel) => ({
        model: EXTERNAL_MARKDOWN_001_MODEL,
        thinkingLevel,
      })),
    );
    expect(artifact.runs.map((run) => run.thinking_level)).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(artifact).toMatchObject({
      schema_version: "external-markdown-live-comparison.v3",
      rubric_version: "faithful-markdown-rubric.v2",
    });
    expect(
      artifact.runs.every(
        (run) =>
          run.execution_status === "succeeded" &&
          run.human_review.status === "pending",
      ),
    ).toBe(true);
    expect(
      artifact.runs.every(
        (run) =>
          run.execution_status === "succeeded" &&
          run.human_review.pass === null,
      ),
    ).toBe(true);
    expect(JSON.stringify(artifact)).not.toContain(credential);
  });

  it("retains safe parser failures and continues the other levels before aggregate failure", async () => {
    const saved: unknown[] = [];
    const secret = "credential-secret-sentinel";
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: secret,
      sourceContent,
      onArtifact: async (partial) => {
        saved.push(structuredClone(partial));
      },
      createParser:
        ({ thinkingLevel }) =>
        async ({ source }) => {
          if (thinkingLevel === "low")
            throw new ParseTripError(
              "invalid_response",
              `${secret}:raw-provider-payload`,
            );
          return completeResult(
            source.source_id,
            source.evidence_units.map((unit) => unit.id),
          );
        },
    });
    expect(artifact.runs.map((run) => run.execution_status)).toEqual([
      "failed",
      "succeeded",
      "succeeded",
    ]);
    expect(artifact.runs[0]).toMatchObject({
      failure: {
        code: "invalid_response",
        phase: "response_validation",
        http_status: null,
      },
    });
    expect(saved.length).toBeGreaterThanOrEqual(3);
    expect(saved[1]).toMatchObject({
      runs: [
        { execution_status: "failed" },
        { execution_status: "not_run" },
        { execution_status: "not_run" },
      ],
    });
    expect(JSON.stringify(artifact)).not.toContain(secret);
    expect(JSON.stringify(artifact)).not.toContain("raw-provider-payload");
    expect(() => assertLiveBenchmarkExecution(artifact)).toThrowError(
      expect.objectContaining({ code: "execution_failed" }),
    );
  });

  it("keeps unknown exceptions unknown without retaining their arbitrary messages", async () => {
    const createParser = vi.fn((): ParseTrip => async () => {
      throw new Error("secret:raw-provider-payload");
    });
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "secret",
      sourceContent,
      createParser,
    });
    expect(artifact.runs[0]).toMatchObject({
      failure: { code: "unknown", phase: "unknown" },
    });
    expect(JSON.stringify(artifact)).not.toContain("raw-provider-payload");
    expect(createParser).toHaveBeenCalledTimes(3);
  });

  it.each(["authentication_failed", "aborted"] as const)(
    "stops on %s while preserving the completed level",
    async (code) => {
      const createParser = vi.fn(
        ({ thinkingLevel }): ParseTrip =>
          async ({ source }) => {
            if (thinkingLevel === "medium")
              throw new ParseTripError(code, "do not retain");
            return completeResult(
              source.source_id,
              source.evidence_units.map((unit) => unit.id),
            );
          },
      );
      const artifact = await runExternalMarkdownBenchmark001LiveComparison({
        benchmark,
        credential: "injected-key",
        sourceContent,
        createParser,
      });
      expect(artifact.runs.map((run) => run.execution_status)).toEqual([
        "succeeded",
        "failed",
        "not_run",
      ]);
      expect(artifact.runs[2]).toMatchObject({ reason: code });
      expect(createParser).toHaveBeenCalledTimes(2);
      expect(() => assertLiveBenchmarkExecution(artifact)).toThrow();
    },
  );

  it("records missing credential and invalid mapping as setup failures with no calls", async () => {
    const createParser = vi.fn();
    for (const options of [
      { credential: "", benchmark },
      { credential: "injected-key", benchmark: { ...benchmark, blocks: [] } },
    ]) {
      const artifact = await runExternalMarkdownBenchmark001LiveComparison({
        ...options,
        sourceContent,
        createParser,
      });
      expect(
        artifact.runs.every((run) => run.execution_status === "not_run"),
      ).toBe(true);
      expect(artifact.setup_failure?.phase).toBe("setup");
      expect(() => assertLiveBenchmarkExecution(artifact)).toThrow();
    }
    expect(createParser).not.toHaveBeenCalled();
  });

  it("propagates abort to the active parser and leaves the remaining levels not run", async () => {
    const controller = new AbortController();
    const createParser = vi.fn((): ParseTrip => async ({ signal }) => {
      controller.abort();
      expect(signal?.aborted).toBe(true);
      throw new DOMException("arbitrary abort message", "AbortError");
    });
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "key",
      sourceContent,
      createParser,
      signal: controller.signal,
    });
    expect(artifact.runs.map((run) => run.execution_status)).toEqual([
      "failed",
      "not_run",
      "not_run",
    ]);
    expect(artifact.runs[0]).toMatchObject({ failure: { code: "aborted" } });
    expect(createParser).toHaveBeenCalledOnce();
  });

  it("retains only allowlisted diagnostics and safe HTTP status", async () => {
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "secret",
      sourceContent,
      createParser:
        ({ diagnosticSink }): ParseTrip =>
        async () => {
          diagnosticSink.record({
            schemaVersion: "gemini-diagnostic.v1",
            event: "gemini_request_failed",
            phase: "request",
            category: "credential_unavailable",
            httpStatus: 403,
            retryAttempt: 0,
            unsafe: "secret",
          } as never);
          throw new ParseTripError("authentication_failed", "secret");
        },
    });
    expect(artifact.runs[0]).toMatchObject({
      failure: {
        code: "authentication_failed",
        phase: "credential",
        http_status: 403,
      },
    });
    expect(JSON.stringify(artifact)).not.toContain("secret");
    expect(JSON.stringify(artifact)).not.toContain("unsafe");
  });

  it("records a broken returned coverage mapping without erasing the comparison", async () => {
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "injected-key",
      sourceContent,
      createParser:
        (): ParseTrip =>
        async ({ source }) => {
          const result = completeResult(
            source.source_id,
            source.evidence_units.map((unit) => unit.id),
          );
          result.coverage.block_dispositions.pop();
          return result;
        },
    });
    expect(artifact.runs).toHaveLength(3);
    expect(
      artifact.runs.every((run) => run.execution_status === "failed"),
    ).toBe(true);
    expect(artifact.runs[0]).toMatchObject({
      failure: { code: "mapping_invalid", phase: "artifact" },
    });
  });

  it("bounds oversized results and diagnostics without losing preceding outcomes", async () => {
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "injected-key",
      sourceContent,
      createParser:
        ({ thinkingLevel, diagnosticSink }): ParseTrip =>
        async ({ source }) => {
          const result = completeResult(
            source.source_id,
            source.evidence_units.map((unit) => unit.id),
          );
          if (thinkingLevel === "medium")
            result.findings[0]!.message = "x".repeat(2001);
          for (let index = 0; index < 30; index += 1)
            diagnosticSink.record({
              schemaVersion: "gemini-diagnostic.v1",
              event: "gemini_request_failed",
              phase: "request",
              category: "rate_limited",
              httpStatus: 429,
              retryAttempt: index,
            });
          return result;
        },
    });
    expect(artifact.runs.map((run) => run.execution_status)).toEqual([
      "succeeded",
      "failed",
      "succeeded",
    ]);
    expect(artifact.runs[1]).toMatchObject({
      failure: { code: "artifact_too_large", phase: "artifact" },
    });
    for (const run of artifact.runs)
      if (run.execution_status !== "not_run")
        expect(run.safe_diagnostics).toHaveLength(20);
    expect(Buffer.byteLength(JSON.stringify(artifact), "utf8")).toBeLessThan(
      512000,
    );
  });

  it("does not continue when parser construction fails, or invoke it for an already aborted comparison", async () => {
    const createParser = vi.fn(() => {
      throw new Error("arbitrary setup secret");
    });
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "key",
      sourceContent,
      createParser,
    });
    expect(artifact.runs.map((run) => run.execution_status)).toEqual([
      "failed",
      "not_run",
      "not_run",
    ]);
    expect(artifact.runs[0]).toMatchObject({
      failure: { code: "unknown", phase: "setup" },
    });
    expect(createParser).toHaveBeenCalledOnce();
    createParser.mockClear();
    const stopped = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "key",
      sourceContent,
      createParser,
      signal: AbortSignal.abort(),
    });
    expect(
      stopped.runs.every(
        (run) => run.execution_status === "not_run" && run.reason === "aborted",
      ),
    ).toBe(true);
    expect(createParser).not.toHaveBeenCalled();
  });

  it("does not confuse collected responses or later corrections with original parser acceptance", async () => {
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential: "injected-key",
      sourceContent,
      createParser:
        (): ParseTrip =>
        async ({ source }) =>
          completeResult(
            source.source_id,
            source.evidence_units.map((unit) => unit.id),
          ),
    });
    expect(() => assertLiveBenchmarkExecution(artifact)).not.toThrow();
    const run = artifact.runs[0]!;
    if (run.execution_status !== "succeeded")
      throw new Error("Expected successful collection");
    expect(run.original_interpretation.status).toBe("insufficient");
    expect(evaluateOriginalParserQuality(run.human_review)).toBe("pending");
    const original = structuredClone(run.original_interpretation);
    run.human_review.critical_events.forEach((item) => {
      item.result = "present";
    });
    run.human_review.invented_critical_events = 0;
    run.human_review.unsupported_exact_constraints.forEach((item) => {
      item.violated = false;
    });
    run.human_review.ambiguities.forEach((item) => {
      item.representation = "pass";
      item.finding_surfaced = true;
      item.evidence = "Checked against the expected representation.";
    });
    expect(evaluateOriginalParserQuality(run.human_review)).toBe("passed");
    const notRequired = run.human_review.ambiguities.find(
      (item) => item.finding_requirement === "not_required",
    );
    if (!notRequired) throw new Error("Expected a non-finding annotation");
    notRequired.finding_surfaced = null;
    expect(evaluateOriginalParserQuality(run.human_review)).toBe("passed");
    run.human_review.unsupported_exact_constraints[0]!.violated = true;
    run.review_recovery.corrections = [
      { note: "Corrected the unsupported precise time" },
    ];
    expect(evaluateOriginalParserQuality(run.human_review)).toBe("failed");
    expect(run.original_interpretation).toEqual(original);
  });
});
