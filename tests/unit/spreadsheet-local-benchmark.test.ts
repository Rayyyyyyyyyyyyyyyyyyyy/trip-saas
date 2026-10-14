import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it, vi } from "vitest";
import type { InterpretationTransport } from "../../src/app/interpretationTransport";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { createGeminiTransport } from "../../src/integrations/gemini/geminiTransport";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";
import {
  SPREADSHEET_BENCHMARK_MODEL,
  evaluateSpreadsheetParserQuality,
  readSpreadsheetBenchmarkConfiguration,
  parseSpreadsheetAnnotationsJson,
  runSpreadsheetBenchmark,
  type ParserAssessment,
  type SpreadsheetAnnotations,
} from "../fixtures/benchmarks/spreadsheet-travel-table/localBenchmarkRunner";
import { writeSpreadsheetBenchmarkArtifact } from "../fixtures/benchmarks/spreadsheet-travel-table/writeLocalArtifact";

function workbook() {
  const book = XLSX.utils.book_new();
  for (const name of ["First", "Second"])
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([["2026-09-10"], [`${name} activity`]]),
      name,
    );
  return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }));
}
function setup(
  change: (value: typeof validDraftInterpretationResult) => unknown = (value) =>
    value,
) {
  const bytes = workbook();
  const readBytes = vi.fn(async () => bytes);
  const fetch = vi.fn();
  const actual = createGeminiTransport({
    model: SPREADSHEET_BENCHMARK_MODEL,
    fetch,
  });
  const send = vi.fn(async (source: UnifiedSourceDocument) => {
    const value = structuredClone(validDraftInterpretationResult);
    value.source_id = source.source_id;
    value.coverage = {
      total_blocks: source.evidence_units.length,
      block_dispositions: [],
      block_disposition_ranges: [
        {
          from_id: source.evidence_units[0].id,
          to_id: source.evidence_units.at(-1)!.id,
          disposition: "interpreted",
        },
      ],
      unparsed_items: [],
    };
    const first = source.evidence_units[0];
    value.draft!.trip.source_refs = [first.id];
    value.draft!.days[0].source_refs = [first.id];
    value.draft!.entities[0].source_refs = [source.evidence_units[1].id];
    value.draft!.entities[0].title = source.evidence_units[1].display_value;
    return change(value);
  });
  const transport: InterpretationTransport = {
    prepare: vi.fn((prompt) => {
      const source = JSON.parse(
        prompt.slice(
          prompt.lastIndexOf("\n\n## Source document\n\n") +
            "\n\n## Source document\n\n".length,
        ),
      ) as UnifiedSourceDocument;
      return { ...actual.prepare(prompt), send: async () => send(source) };
    }),
  };
  return {
    readBytes,
    transport,
    send,
    fetch,
    fixture: {
      id: "synthetic",
      layout: "row-per-event",
      path: "synthetic.xlsx",
    },
    model: SPREADSHEET_BENCHMARK_MODEL,
  };
}

describe("local spreadsheet benchmark safety and evidence", () => {
  it("decodes only declared annotation fields and hides malformed JSON content", () => {
    const safe = {
      status: "TODO",
      source_id: null,
      critical_events: [
        { id: "event", expectation: "Synthetic expectation", source_refs: [] },
      ],
      unsupported_exact_constraints: [],
      ambiguities: [],
    };
    const decoded = parseSpreadsheetAnnotationsJson(JSON.stringify(safe));
    expect(decoded).toEqual(safe);
    decoded.critical_events[0].expectation = "Changed judgment";
    expect(safe.critical_events[0].expectation).toBe("Synthetic expectation");
    const privateText = "synthetic-private-json-content";
    for (const text of [`{${privateText}`, " ".repeat(8_000_001)]) {
      try {
        parseSpreadsheetAnnotationsJson(text);
        expect.fail("Invalid annotation JSON must be rejected");
      } catch (cause) {
        expect(cause).toMatchObject({ code: "annotation_invalid" });
        expect((cause as Error).message).not.toContain(privateText);
      }
    }
  });
  it("prepares through the real adapter/application prompt without reading a credential or sending", async () => {
    const options = setup();
    const checkpoints: unknown[] = [];
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "prepare",
      get credential(): string {
        throw new Error("credential must not be read");
      },
      onArtifact: async (value) => {
        checkpoints.push(value);
      },
    });
    expect(artifact.execution_status).toBe("prepared");
    expect(artifact.source?.evidence_unit_count).toBe(4);
    expect(artifact.source?.source_id).toMatch(/^source:tabular:[a-f0-9]{64}$/);
    expect(artifact.preflight?.strategy).toBe("single-request");
    expect(artifact.preflight?.sheets).toHaveLength(2);
    expect(artifact.preflight!.full.request_bytes).toBeGreaterThan(
      artifact.preflight!.sheets[0].request_bytes,
    );
    expect(options.send).not.toHaveBeenCalled();
    expect(options.fetch).not.toHaveBeenCalled();
    expect(checkpoints).toHaveLength(1);
    expect(artifact.parser_quality.invented_critical_events).toBeNull();
    expect(artifact.parser_quality.status).toBe("pending");
    expect(artifact.acceptance_status).toBe("pending");
    expect(artifact.original_interpretation).toBeNull();
    expect(JSON.stringify(artifact)).not.toContain("First activity");
  });
  it("does not read key configuration until exact-model authorized live mode", () => {
    const environment = {
      get GEMINI_API_KEY(): string {
        throw new Error("key accessed");
      },
    };
    expect(readSpreadsheetBenchmarkConfiguration(environment).mode).toBe(
      "prepare",
    );
    expect(() =>
      readSpreadsheetBenchmarkConfiguration({
        SPREADSHEET_BENCHMARK_MODE: "live",
        get GEMINI_API_KEY(): string {
          throw new Error("key accessed");
        },
      }),
    ).toThrow("exact candidate");
    const unauthorized = {
      SPREADSHEET_BENCHMARK_MODE: "live",
      SPREADSHEET_BENCHMARK_MODEL: SPREADSHEET_BENCHMARK_MODEL,
      get GEMINI_API_KEY(): string {
        throw new Error("key accessed");
      },
    };
    expect(() => readSpreadsheetBenchmarkConfiguration(unauthorized)).toThrow(
      "authorization flag",
    );
    expect(() =>
      readSpreadsheetBenchmarkConfiguration({
        SPREADSHEET_BENCHMARK_MODE: "live",
        SPREADSHEET_BENCHMARK_MODEL: "gemini-latest",
        SPREADSHEET_BENCHMARK_LIVE: "authorized",
      }),
    ).toThrow("exact candidate");
  });
  it.each(["authorization", "model"])(
    "rejects invalid %s before reads or provider preparation",
    async (reason) => {
      const options = setup();
      await expect(
        runSpreadsheetBenchmark({
          ...options,
          mode: "live",
          liveAuthorized: reason !== "authorization",
          model: reason === "model" ? "gemini-latest" : options.model,
        }),
      ).rejects.toMatchObject({
        code: reason === "model" ? "model_invalid" : "live_not_authorized",
      });
      expect(options.readBytes).not.toHaveBeenCalled();
      expect(options.transport.prepare).not.toHaveBeenCalled();
      expect(options.send).not.toHaveBeenCalled();
    },
  );
  it("collects the strict pipeline result and range accounting without inventing semantic scores", async () => {
    const options = setup();
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "live",
      liveAuthorized: true,
      credential: "synthetic-credential",
    });
    expect(artifact.execution_status).toBe("succeeded");
    expect(artifact.automatic_metrics).toMatchObject({
      schema_valid: true,
      accounting_complete: true,
      disposition_count: 4,
      unparsed_count: 0,
    });
    expect(artifact.provider_observations).toMatchObject({
      completed_responses: 2,
      responses_using_ranges: 2,
      range_entries: 2,
      range_misuse: null,
    });
    expect(
      artifact.original_interpretation?.coverage.block_disposition_ranges,
    ).toBeUndefined();
    expect(artifact.original_interpretation_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.acceptance_status).toBe("pending");
    expect(artifact.annotations.status).toBe("TODO");
    expect(artifact.review_recovery.status).toBe("not_run");
    expect(options.fetch).not.toHaveBeenCalled();
  });
  it("records actual range-gate failure and never saves a partial interpretation", async () => {
    const options = setup((value) => {
      value.coverage.block_disposition_ranges![0].from_id = "unknown";
      return value;
    });
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "live",
      liveAuthorized: true,
      credential: "synthetic-credential",
    });
    expect(artifact.failure_code).toBe("coverage_invalid");
    expect(artifact.acceptance_status).toBe("failed");
    expect(artifact.provider_observations.range_misuse).toEqual({
      failure_code: "coverage_invalid",
      evidence: "application_response_gate",
      finding_codes: ["UNKNOWN_COVERAGE_RANGE_ENDPOINT"],
    });
    expect(artifact.original_interpretation).toBeNull();
    expect(artifact.automatic_metrics).toBeNull();
  });
  it("filters thrown messages and refuses credential material in captured results", async () => {
    const secret = "synthetic-secret-credential";
    const options = setup((value) => {
      value.draft!.trip.title = secret;
      return value;
    });
    const checkpoints: unknown[] = [];
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "live",
      liveAuthorized: true,
      credential: secret,
      onArtifact: async (value) => {
        checkpoints.push(value);
      },
    });
    expect(artifact.failure_code).toBe("artifact_unsafe");
    expect(artifact.original_interpretation).toBeNull();
    expect(JSON.stringify(checkpoints)).not.toContain(secret);
    const failure = setup();
    failure.readBytes.mockRejectedValueOnce(new Error(secret));
    const failed = await runSpreadsheetBenchmark({
      ...failure,
      mode: "prepare",
    });
    expect(failed.failure_code).toBe("unknown");
    expect(JSON.stringify(failed)).not.toContain(secret);
  });
  it("rejects ready annotations with stale identities before any provider send", async () => {
    const options = setup();
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "live",
      liveAuthorized: true,
      credential: "synthetic-credential",
      annotations: {
        status: "ready",
        source_id: "stale",
        critical_events: [
          {
            id: "critical",
            expectation: "Synthetic event",
            source_refs: ["unknown"],
          },
        ],
        unsupported_exact_constraints: [],
        ambiguities: [],
      },
    });
    expect(artifact.failure_code).toBe("annotation_invalid");
    expect(options.send).not.toHaveBeenCalled();
  });
  it.each([
    ["top-level raw source", { raw_source: "synthetic private source" }],
    [
      "production ReviewSession",
      { production_review_session: { evidence: "synthetic private evidence" } },
    ],
    [
      "provider envelope",
      { providerEnvelope: { candidates: ["synthetic provider data"] } },
    ],
    [
      "nested raw source",
      {
        critical_events: [
          {
            id: "event",
            expectation: "Synthetic event",
            source_refs: [],
            raw_source: "synthetic private source",
          },
        ],
      },
    ],
    [
      "nested provider envelope",
      {
        ambiguities: [
          {
            id: "ambiguity",
            expectation: "Synthetic ambiguity",
            source_refs: [],
            finding_required: true,
            providerEnvelope: {},
          },
        ],
      },
    ],
    [
      "oversized expectation",
      {
        critical_events: [
          { id: "event", expectation: "x".repeat(4001), source_refs: [] },
        ],
      },
    ],
    [
      "malformed refs",
      {
        unsupported_exact_constraints: [
          { id: "constraint", rule: "Synthetic rule", source_refs: [3] },
        ],
      },
    ],
    [
      "oversized collection",
      {
        critical_events: Array.from({ length: 10_001 }, (_, index) => ({
          id: `event:${index}`,
          expectation: "Synthetic expectation",
          source_refs: [],
        })),
      },
    ],
    [
      "malformed finding rule",
      {
        ambiguities: [
          {
            id: "ambiguity",
            expectation: "Synthetic ambiguity",
            source_refs: [],
            finding_required: "true",
          },
        ],
      },
    ],
    [
      "duplicate annotation IDs",
      {
        critical_events: [
          { id: "same", expectation: "Synthetic expectation", source_refs: [] },
        ],
        ambiguities: [
          {
            id: "same",
            expectation: "Synthetic ambiguity",
            source_refs: [],
            finding_required: true,
          },
        ],
      },
    ],
  ])(
    "rejects TODO %s annotations before saving or reading a source",
    async (_label, extra) => {
      const options = setup();
      const onArtifact = vi.fn();
      const annotations = JSON.parse(
        JSON.stringify({
          status: "TODO",
          source_id: null,
          critical_events: [],
          unsupported_exact_constraints: [],
          ambiguities: [],
          ...extra,
        }),
      ) as SpreadsheetAnnotations;
      await expect(
        runSpreadsheetBenchmark({
          ...options,
          mode: "prepare",
          annotations,
          onArtifact,
        }),
      ).rejects.toMatchObject({ code: "annotation_invalid" });
      expect(onArtifact).not.toHaveBeenCalled();
      expect(options.readBytes).not.toHaveBeenCalled();
      expect(options.send).not.toHaveBeenCalled();
    },
  );
  it("marks oversized whole sheets as region-needed with zero sends", async () => {
    const options = setup();
    const original = options.transport.prepare;
    options.transport.prepare = (prompt) => ({
      ...original(prompt),
      requestBytes: 3_000_001,
    });
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "prepare",
    });
    expect(artifact.preflight?.strategy).toBe("region-needed");
    expect(options.send).not.toHaveBeenCalled();
  });
  it("records whole-sheet sizing when the complete envelope alone exceeds budget", async () => {
    const options = setup();
    const original = options.transport.prepare;
    options.transport.prepare = (prompt) => ({
      ...original(prompt),
      requestBytes: prompt.includes('"source_order":3') ? 3_000_001 : 100_000,
    });
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "prepare",
    });
    expect(artifact.preflight?.strategy).toBe("whole-sheet");
    expect(options.send).not.toHaveBeenCalled();
  });
  it("does not blame individual disposition errors on range usage", async () => {
    const options = setup((value) => {
      value.coverage.block_dispositions = [
        { source_ref: "unknown", disposition: "interpreted" },
      ];
      return value;
    });
    const artifact = await runSpreadsheetBenchmark({
      ...options,
      mode: "live",
      liveAuthorized: true,
      credential: "synthetic-credential",
    });
    expect(artifact.failure_code).toBe("coverage_invalid");
    expect(artifact.provider_observations.coverage_failure_with_ranges).toEqual(
      ["UNKNOWN_BLOCK_DISPOSITION"],
    );
    expect(artifact.provider_observations.range_misuse).toBeNull();
  });
  it.each(["credential", "abort"])(
    "records %s setup failure before file access or send",
    async (reason) => {
      const options = setup();
      const controller = new AbortController();
      if (reason === "abort") controller.abort();
      const artifact = await runSpreadsheetBenchmark({
        ...options,
        mode: "live",
        liveAuthorized: true,
        credential: reason === "credential" ? "" : "synthetic-credential",
        signal: controller.signal,
      });
      expect(artifact.failure_code).toBe(
        reason === "credential" ? "credential_missing" : "aborted",
      );
      expect(options.readBytes).not.toHaveBeenCalled();
      expect(options.send).not.toHaveBeenCalled();
    },
  );
  it("writes atomic private artifacts only into real OS temporary parents", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "spreadsheet-benchmark-test-"),
    );
    try {
      const artifact = await runSpreadsheetBenchmark({
        ...setup(),
        mode: "prepare",
      });
      const path = join(directory, "artifact.json");
      await writeSpreadsheetBenchmarkArtifact(path, artifact);
      expect((await stat(path)).mode & 0o777).toBe(0o600);
      expect(JSON.parse(await readFile(path, "utf8")).execution_status).toBe(
        "prepared",
      );
      await expect(
        writeSpreadsheetBenchmarkArtifact(
          join(process.cwd(), "artifact.json"),
          artifact,
        ),
      ).rejects.toThrow("OS temporary");
      await symlink(process.cwd(), join(directory, "escaped"));
      await expect(
        writeSpreadsheetBenchmarkArtifact(
          join(directory, "escaped", "artifact.json"),
          artifact,
        ),
      ).rejects.toThrow("OS temporary");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("faithful spreadsheet parser scoring", () => {
  function assessment() {
    const original = structuredClone(validDraftInterpretationResult);
    original.findings = [
      {
        id: "finding:ambiguity",
        code: "SOURCE_AMBIGUITY",
        message: "Synthetic ambiguity needs review",
        blocking: false,
        source_refs: original.draft!.entities[0].source_refs,
      },
    ];
    const annotations: SpreadsheetAnnotations = {
      status: "ready",
      source_id: original.source_id,
      critical_events: [
        {
          id: "event",
          expectation: "Supported arrival",
          source_refs: original.draft!.entities[0].source_refs,
        },
      ],
      unsupported_exact_constraints: [
        {
          id: "exact",
          rule: "No invented fact",
          source_refs: original.draft!.entities[0].source_refs,
        },
      ],
      ambiguities: [
        {
          id: "ambiguity",
          expectation: "Unknown remains readable",
          source_refs: original.draft!.entities[0].source_refs,
          finding_required: true,
        },
      ],
    };
    const review: ParserAssessment = {
      original_interpretation_sha256: createHash("sha256")
        .update(JSON.stringify(original))
        .digest("hex"),
      critical_events: [
        {
          annotation_id: "event",
          present: true,
          entity_refs: [original.draft!.entities[0].id],
          evidence: "Original entity preserves cited arrival",
        },
      ],
      invented_critical_events: 0,
      invented_event_evidence:
        "Compared all original entities against all fixture cells",
      unsupported_exact_constraints: [
        {
          annotation_id: "exact",
          violated: false,
          evidence: "Compared exact time and place with cited cells",
        },
      ],
      ambiguities: [
        {
          annotation_id: "ambiguity",
          preserved: true,
          finding_surfaced: true,
          finding_refs: ["finding:ambiguity"],
          evidence: "Original finding and unknown representation inspected",
        },
      ],
    };
    return { original, annotations, review };
  }
  it("requires evidence and the exact original hash before a semantic pass", () => {
    const { original, annotations, review } = assessment();
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("passed");
    review.invented_event_evidence = null;
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("pending");
    review.invented_event_evidence = "Compared originals";
    review.original_interpretation_sha256 = "other";
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("pending");
  });
  it("fails a required ambiguity when no associated original finding exists despite a positive claim", () => {
    const { original, annotations, review } = assessment();
    original.findings = [];
    original.draft!.findings = [];
    review.original_interpretation_sha256 = createHash("sha256")
      .update(JSON.stringify(original))
      .digest("hex");
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("failed");
  });
  it("fails when the only original finding belongs to unrelated source evidence", () => {
    const { original, annotations, review } = assessment();
    original.findings[0].source_refs = ["unrelated"];
    review.original_interpretation_sha256 = createHash("sha256")
      .update(JSON.stringify(original))
      .digest("hex");
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("failed");
  });
  it.each([
    { refs: [] },
    { refs: ["unknown"] },
    { refs: ["finding:unrelated"] },
    { refs: ["finding:ambiguity", "finding:ambiguity"] },
  ])(
    "keeps missing or unmatched finding references pending: $refs",
    ({ refs }) => {
      const { original, annotations, review } = assessment();
      original.findings.push({
        id: "finding:unrelated",
        code: "SOURCE_AMBIGUITY",
        message: "Different source context",
        blocking: false,
        source_refs: ["unrelated"],
      });
      review.original_interpretation_sha256 = createHash("sha256")
        .update(JSON.stringify(original))
        .digest("hex");
      review.ambiguities[0].finding_refs = refs;
      expect(
        evaluateSpreadsheetParserQuality(annotations, review, original),
      ).toBe("pending");
    },
  );
  it("accepts actual related draft findings as evidence without mutating the original", () => {
    const { original, annotations, review } = assessment();
    original.draft!.findings = [
      {
        ...original.findings[0],
        id: "finding:ambiguity",
        source_refs: original.draft!.entities[0].source_refs,
      },
    ];
    original.findings = [];
    review.original_interpretation_sha256 = createHash("sha256")
      .update(JSON.stringify(original))
      .digest("hex");
    const before = JSON.stringify(original);
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("passed");
    expect(JSON.stringify(original)).toBe(before);
  });
  it("does not turn TODOs, nulls or unknown entity references into zero/pass", () => {
    const { original, annotations, review } = assessment();
    annotations.status = "TODO";
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("pending");
    annotations.status = "ready";
    review.invented_critical_events = null;
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("pending");
    review.invented_critical_events = 0;
    review.critical_events[0].entity_refs = ["unknown"];
    expect(
      evaluateSpreadsheetParserQuality(annotations, review, original),
    ).toBe("pending");
  });
  it.each(["missing", "invented", "unsupported", "ambiguity"])(
    "fails assessed %s independently of Review recovery",
    (criterion) => {
      const { original, annotations, review } = assessment();
      if (criterion === "missing") review.critical_events[0].present = false;
      if (criterion === "invented") review.invented_critical_events = 1;
      if (criterion === "unsupported")
        review.unsupported_exact_constraints[0].violated = true;
      if (criterion === "ambiguity") review.ambiguities[0].preserved = false;
      expect(
        evaluateSpreadsheetParserQuality(annotations, review, original),
      ).toBe("failed");
    },
  );
});
