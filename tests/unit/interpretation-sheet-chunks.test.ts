import { describe, expect, it, vi } from "vitest";
import {
  createInterpretTrip,
  type InterpretTripRequest,
} from "../../src/app/interpretTrip";
import { ParseTripError } from "../../src/app/parseTrip";
import { chunkSourceBySheet } from "../../src/domain/source/chunkSourceBySheet";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { reconcileInterpretationChunks } from "../../src/domain/trip/reconcileInterpretationChunks";
import {
  buildCanonicalTrip,
  validateCanonicalTripAuthoritatively,
} from "../../src/domain/trip/buildCanonicalTrip";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function sourceDocument(): UnifiedSourceDocument {
  return {
    schema_version: "unified-source-document.v1",
    source_id: "source:whole-workbook",
    display_name: "Trip.xlsx",
    input_mode: "spreadsheet_file",
    source_format: "tabular",
    excluded_sheets: ["Excluded"],
    evidence_units: [0, 1].flatMap((sheet) =>
      [1, 2].map((row) => ({
        id: `source:sheet:${sheet}:A${row}`,
        source_order: sheet * 2 + row - 1,
        parent_ref: null,
        locator: `sheet:Sheet${sheet}!A${row}`,
        raw_value: row === 1 ? "2026-09-10" : `Activity ${sheet}`,
        display_value: row === 1 ? "2026-09-10" : `Activity ${sheet}`,
        links: [],
        structural_evidence: [
          {
            evidence_kind: "tabular_region" as const,
            sheet_id: `sheet:${sheet}`,
            sheet_name: `Sheet${sheet}`,
            sheet_order: sheet,
            row_start: row,
            row_end: row,
            column_start: 1,
            column_end: 1,
            header_ref: row === 2 ? `source:sheet:${sheet}:A1` : null,
            merge_ref: null,
          },
        ],
      })),
    ),
    extraction_findings: [],
  };
}
function response(source: UnifiedSourceDocument): SemanticInterpretationResult {
  const result = structuredClone(validDraftInterpretationResult);
  result.source_id = source.source_id;
  const refs = source.evidence_units.map((unit) => unit.id);
  const sheet = source.evidence_units[0].structural_evidence[0];
  const order =
    sheet.evidence_kind === "tabular_region" ? sheet.sheet_order : 0;
  result.coverage = {
    total_blocks: refs.length,
    block_dispositions: [],
    block_disposition_ranges: [
      { from_id: refs[0], to_id: refs.at(-1)!, disposition: "interpreted" },
    ],
    unparsed_items: [],
  };
  const draft = result.draft!;
  draft.trip.source_refs = refs;
  draft.days[0].source_refs = [refs[0]];
  draft.days[0].label = `Label ${order}`;
  draft.days[0].title = `Title ${order}`;
  draft.entities[0].title = `Activity ${order}`;
  draft.entities[0].source_refs = [refs[1]];
  return result;
}
function request(source = sourceDocument()) {
  const gate = validateUnifiedSourceDocument(source, {
    source_id: source.source_id,
  });
  if (!gate.valid) throw new Error(JSON.stringify(gate.failures));
  return {
    source: gate.document,
    sourceId: source.source_id,
    credential: "test-key",
  };
}
function sourceFromPrompt(prompt: string) {
  const marker = "\n\n## Source document\n\n";
  return JSON.parse(
    prompt.slice(prompt.lastIndexOf(marker) + marker.length),
  ) as UnifiedSourceDocument;
}
function transport(
  customize: (
    value: SemanticInterpretationResult,
    source: UnifiedSourceDocument,
  ) => unknown = (value) => value,
) {
  const events: string[] = [];
  const send = vi.fn(
    async (source: UnifiedSourceDocument, signal?: AbortSignal) => {
      events.push(`send:${source.evidence_units[0].id}`);
      return customize(response(source), source);
    },
  );
  const prepare = vi.fn((prompt: string) => {
    const source = sourceFromPrompt(prompt);
    events.push(`prepare:${source.evidence_units.length}`);
    const requestBytes = new TextEncoder().encode(
      JSON.stringify({ contents: [{ text: prompt }] }),
    ).byteLength;
    return {
      requestBytes,
      estimatedInputTokens: Math.ceil(requestBytes / 4),
      send: ({ signal }: { signal?: AbortSignal }) => send(source, signal),
    };
  });
  const chunks = chunkSourceBySheet(sourceDocument());
  const maxRequestBytes = Math.max(
    ...chunks.map((chunk) => prepareFixtureBytes(chunk)),
  );
  return { prepare, send, events, maxRequestBytes };
}
function prepareFixtureBytes(source: UnifiedSourceDocument) {
  // Use the actual prepared envelope, including the maintained prompt and its
  // JSON escaping; keep the test independent of an estimated source size.
  const probe = vi.fn((prompt: string) => ({
    requestBytes: new TextEncoder().encode(
      JSON.stringify({ contents: [{ text: prompt }] }),
    ).byteLength,
    estimatedInputTokens: 0,
    send: vi.fn(async () => response(source)),
  }));
  const parse = createInterpretTrip({
    transport: { prepare: probe },
    maxRequestBytes: 0,
  });
  void parse(request(source)).catch(() => {});
  return probe.mock.results[0].value.requestBytes;
}
async function parseChunks(
  mock = transport(),
  extra: Partial<InterpretTripRequest> = {},
) {
  return createInterpretTrip({
    transport: mock,
    maxRequestBytes: mock.maxRequestBytes,
  })({ ...request(), ...extra });
}

describe("whole-sheet interpretation", () => {
  it("validates whole sheets with original IDs and dense local order without mutating the document", () => {
    const source = sourceDocument();
    const before = structuredClone(source);
    const chunks = chunkSourceBySheet(source);
    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect(
        validateUnifiedSourceDocument(chunk, { source_id: source.source_id })
          .valid,
      ).toBe(true);
      expect(chunk.evidence_units.map((unit) => unit.source_order)).toEqual([
        0, 1,
      ]);
      expect(chunk.source_id).toBe(source.source_id);
      expect(chunk.excluded_sheets).toEqual(["Excluded"]);
    }
    expect(
      chunks.flatMap((chunk) => chunk.evidence_units.map((unit) => unit.id)),
    ).toEqual(source.evidence_units.map((unit) => unit.id));
    expect(source).toEqual(before);
  });

  it("accepts an envelope exactly at the budget and keeps in-budget multi-sheet requests unchanged", async () => {
    const mock = transport();
    const fullBytes = prepareFixtureBytes(sourceDocument());
    const result = await createInterpretTrip({
      transport: mock,
      maxRequestBytes: fullBytes,
    })(request());
    expect(result.status).toBe("draft");
    expect(mock.prepare).toHaveBeenCalledOnce();
    expect(mock.send).toHaveBeenCalledOnce();
    expect(mock.send.mock.calls[0][0].evidence_units).toHaveLength(4);
  });

  it("prepares every sheet before sending, expands ranges, merges dated Days and namespaces duplicate provider IDs", async () => {
    const mock = transport();
    const stages: string[] = [];
    const result = await parseChunks(mock, {
      onStage: (stage) => stages.push(stage),
    });
    expect(mock.events.slice(0, 3)).toEqual([
      "prepare:4",
      "prepare:2",
      "prepare:2",
    ]);
    expect(mock.events.slice(3)).toEqual([
      "send:source:sheet:0:A1",
      "send:source:sheet:1:A1",
    ]);
    expect(stages).toEqual([
      "source_validation",
      "interpreting",
      "output_validation",
    ]);
    expect(result.draft!.days).toHaveLength(1);
    expect(result.draft!.days[0]).toMatchObject({
      label: "Label 0 / Label 1",
      title: "Title 0 / Title 1",
      source_refs: ["source:sheet:0:A1", "source:sheet:1:A1"],
    });
    expect(result.draft!.entities.map((entity) => entity.day_id)).toEqual([
      result.draft!.days[0].id,
      result.draft!.days[0].id,
    ]);
    expect(
      new Set(result.draft!.entities.map((entity) => entity.id)).size,
    ).toBe(2);
    expect(
      result.coverage.block_dispositions.map((item) => item.source_ref),
    ).toEqual(sourceDocument().evidence_units.map((unit) => unit.id));
    expect(result.coverage.block_disposition_ranges).toBeUndefined();
  });

  it("rewrites parent/child, action, todo and finding references without changing source references", async () => {
    const mock = transport((result) => {
      const draft = result.draft!;
      const parent = draft.entities[0];
      const child = {
        ...structuredClone(parent),
        id: "entity:child",
        title: `${parent.title} program`,
      };
      parent.actions = [
        {
          id: "action:shared",
          kind: "reference",
          label: "Reference",
          url: "https://example.com",
        },
      ];
      parent.reservation = {
        status: "unknown",
        reference: null,
        detail: null,
        todo_id: "todo:shared",
      };
      parent.readiness = {
        kind: "reservation",
        status: "pending",
        detail: null,
        todo_id: "todo:shared",
      };
      draft.entities.push(child);
      draft.relationships = [
        {
          id: "relation:shared",
          type: "parent_child",
          member_entity_ids: [],
          parent_entity_id: parent.id,
          child_entity_ids: [child.id],
          condition: null,
          source_refs: parent.source_refs,
        },
      ];
      draft.findings = [
        {
          id: "finding:shared",
          severity: "review",
          code: "SOURCE_AMBIGUITY",
          message: "Check the program",
          blocking: true,
          entity_refs: [child.id],
          source_refs: child.source_refs,
        },
      ];
      return result;
    });
    const result = await parseChunks(mock);
    const draft = result.draft!;
    for (let index = 0; index < 2; index += 1) {
      const [parent, child] = draft.entities.slice(index * 2, index * 2 + 2);
      expect(draft.relationships[index]).toMatchObject({
        parent_entity_id: parent.id,
        child_entity_ids: [child.id],
      });
      expect(draft.findings[index].entity_refs).toEqual([child.id]);
      expect(parent.reservation!.todo_id).toBe(parent.readiness!.todo_id);
      expect(parent.actions[0].id).toMatch(/^chunk:/);
      expect(child.source_refs).toEqual([`source:sheet:${index}:A2`]);
    }
    expect(draft.entities[0].actions[0].id).not.toBe(
      draft.entities[2].actions[0].id,
    );
  });

  it("keeps namespaced identities bounded and distinct between unrelated workbook sources", async () => {
    const firstSource = sourceDocument();
    firstSource.source_id = `source:tabular:${"a".repeat(64)}`;
    const secondSource = structuredClone(firstSource);
    secondSource.source_id = `source:tabular:${"b".repeat(64)}`;
    const make = async (source: UnifiedSourceDocument) => {
      const mock = transport((value) => {
        value.draft!.trip.id = "p".repeat(128);
        value.draft!.entities[0].id = "e".repeat(128);
        return value;
      });
      mock.maxRequestBytes = Math.max(
        ...chunkSourceBySheet(source).map(prepareFixtureBytes),
      );
      return createInterpretTrip({
        transport: mock,
        maxRequestBytes: mock.maxRequestBytes,
      })(request(source));
    };
    const first = await make(firstSource);
    const second = await make(secondSource);
    expect(first.draft!.trip.id).not.toBe(second.draft!.trip.id);
    expect(first.draft!.entities[0].id).not.toBe(second.draft!.entities[0].id);
    expect(first.draft!.trip.id).toContain("a".repeat(64));
    for (const id of [
      first.draft!.trip.id,
      ...first.draft!.days.map((day) => day.id),
      ...first.draft!.entities.map((entity) => entity.id),
    ])
      expect(id.length).toBeLessThanOrEqual(128);
  });

  it("keeps unknown-date Days separate and keeps unknown trip bounds null", async () => {
    const mock = transport((result) => {
      result.draft!.days[0].date = null;
      result.draft!.trip.start_date = null;
      result.draft!.trip.end_date = null;
      return result;
    });
    const result = await parseChunks(mock);
    expect(result.draft!.days).toHaveLength(2);
    expect(result.draft!.trip.start_date).toBeNull();
    expect(result.draft!.trip.end_date).toBeNull();
  });

  it.each([false, true])(
    "does not merge the same inferred year across sheets when another sheet supports it: %s",
    async (secondSupportsYear) => {
      const source = sourceDocument();
      for (const unit of source.evidence_units) {
        if (unit.locator.endsWith("!A1")) {
          unit.raw_value = "45885";
          unit.display_value =
            secondSupportsYear && unit.id.includes(":1:")
              ? "2025-08-16"
              : "8/16";
          const evidence = unit.structural_evidence[0];
          if (evidence.evidence_kind === "tabular_region")
            evidence.typed_hint = {
              kind: "date_serial",
              value: 45885,
              date_system: "1900",
            };
        }
      }
      const mock = transport((result) => {
        result.draft!.days[0].date = "2025-08-16";
        result.draft!.trip.start_date = "2025-08-16";
        result.draft!.trip.end_date = "2025-08-16";
        return result;
      });
      mock.maxRequestBytes = Math.max(
        ...chunkSourceBySheet(source).map(prepareFixtureBytes),
      );
      const result = await createInterpretTrip({
        transport: mock,
        maxRequestBytes: mock.maxRequestBytes,
      })(request(source));
      expect(mock.send).toHaveBeenCalledTimes(2);
      expect(result.draft!.days).toHaveLength(2);
      expect(result.draft!.trip.start_date).toBeNull();
      expect(result.draft!.trip.end_date).toBeNull();
      expect(
        result.findings.filter((finding) => finding.code === "MISSING_YEAR"),
      ).toHaveLength(secondSupportsYear ? 2 : 4);
    },
  );

  it("combines complete trip bounds conservatively and exposes differing titles for Review", async () => {
    const mock = transport((result, source) => {
      if (source.evidence_units[0].id.includes(":1:")) {
        result.draft!.trip.title = "Another title";
        result.draft!.trip.start_date = null;
        result.draft!.trip.end_date = "2026-09-12";
      }
      return result;
    });
    const result = await parseChunks(mock);
    expect(result.draft!.trip.start_date).toBeNull();
    expect(result.draft!.trip.end_date).toBe("2026-09-12");
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "CHUNK_TRIP_TITLE_CONFLICT",
        blocking: true,
      }),
    );
  });

  it("preserves unsupported trip-only partial ranges through canonical confirmation without inventing a year", async () => {
    const source = sourceDocument();
    for (const unit of source.evidence_units) {
      if (unit.locator.endsWith("!A1")) {
        unit.raw_value = "45885";
        unit.display_value = "8/16–8/20";
      }
    }
    const originalResponses: SemanticInterpretationResult[] = [];
    const mock = transport((value) => {
      value.draft!.days = [];
      value.draft!.entities[0].day_id = null;
      value.draft!.trip.start_date = "2025-08-16";
      value.draft!.trip.end_date = "2025-08-20";
      originalResponses.push(value);
      return value;
    });
    mock.maxRequestBytes = Math.max(
      ...chunkSourceBySheet(source).map(prepareFixtureBytes),
    );
    const result = await createInterpretTrip({
      transport: mock,
      maxRequestBytes: mock.maxRequestBytes,
    })(request(source));
    const draft = result.draft!;
    expect(draft.trip).toMatchObject({ start_date: null, end_date: null });
    expect(draft.days).toEqual([]);
    expect(draft.entities.every((entity) => entity.day_id === null)).toBe(true);
    expect(draft.supporting_items.map((item) => item.text)).toEqual([
      "8/16–8/20",
      "8/16–8/20",
    ]);
    expect(draft.supporting_items.map((item) => item.source_refs)).toEqual([
      ["source:sheet:0:A1", "source:sheet:0:A2"],
      ["source:sheet:1:A1", "source:sheet:1:A2"],
    ]);
    const findings = result.findings.filter(
      (finding) => finding.code === "MISSING_YEAR",
    );
    expect(findings).toHaveLength(2);
    expect(
      findings.every(
        (finding) => !finding.blocking && finding.message.includes("保留原文"),
      ),
    ).toBe(true);
    expect(findings.map((finding) => finding.source_refs)).toEqual(
      draft.supporting_items.map((item) => item.source_refs),
    );
    const canonical = buildCanonicalTrip(draft, { sourceId: source.source_id });
    expect(validateCanonicalTripAuthoritatively(canonical).valid).toBe(true);
    const reloaded = JSON.parse(JSON.stringify(canonical));
    expect(
      reloaded.supporting_items.map((item: { text: string }) => item.text),
    ).toEqual(["8/16–8/20", "8/16–8/20"]);
    expect(JSON.stringify(reloaded)).not.toContain("2025");
    expect(
      originalResponses.every(
        (value) =>
          value.draft!.trip.start_date === "2025-08-16" &&
          value.draft!.supporting_items.length === 0,
      ),
    ).toBe(true);
  });

  it("combines fully supported complete bounds with the earliest start and latest end", async () => {
    const source = sourceDocument();
    source.evidence_units[2].display_value = "2026-09-12";
    source.evidence_units[2].raw_value = "2026-09-12";
    const mock = transport((result, sheet) => {
      if (sheet.evidence_units[0].id.includes(":1:")) {
        result.draft!.days[0].date = "2026-09-12";
        result.draft!.trip.start_date = "2026-09-12";
        result.draft!.trip.end_date = "2026-09-12";
      }
      return result;
    });
    const result = await createInterpretTrip({
      transport: mock,
      maxRequestBytes: mock.maxRequestBytes,
    })(request(source));
    expect(result.draft!.trip).toMatchObject({
      start_date: "2026-09-10",
      end_date: "2026-09-12",
    });
    expect(result.draft!.days).toHaveLength(2);
  });

  it("keeps every conflicting leave-by source and never restores a precise time from a later sheet", async () => {
    const source = sourceDocument();
    source.evidence_units.push(
      ...structuredClone(source.evidence_units.slice(2)).map((unit, index) => {
        const evidence = unit.structural_evidence[0];
        if (evidence.evidence_kind !== "tabular_region")
          throw new Error("tabular fixture");
        return {
          ...unit,
          id: unit.id.replace(":1:", ":2:"),
          source_order: index + 4,
          locator: unit.locator.replace("Sheet1", "Sheet2"),
          structural_evidence: [
            {
              ...evidence,
              sheet_id: "sheet:2",
              sheet_name: "Sheet2",
              sheet_order: 2,
              header_ref: evidence.header_ref?.replace(":1:", ":2:") ?? null,
            },
          ],
        };
      }),
    );
    const mock = transport((result, sheet) => {
      result.draft!.days[0].label = "Shared label";
      result.draft!.days[0].leave_by = sheet.evidence_units[0].id.includes(
        ":0:",
      )
        ? "08:00"
        : sheet.evidence_units[0].id.includes(":1:")
          ? "09:00"
          : "07:00";
      return result;
    });
    const result = await createInterpretTrip({
      transport: mock,
      maxRequestBytes: mock.maxRequestBytes,
    })(request(source));
    expect(result.draft!.days[0]).toMatchObject({
      label: "Shared label",
      leave_by: null,
    });
    expect(result.draft!.days[0].source_refs).toHaveLength(3);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "CHUNK_DAY_LEAVE_BY_CONFLICT",
        message: expect.stringContaining("08:00 / 09:00 / 07:00"),
        source_refs: [
          "source:sheet:0:A1",
          "source:sheet:1:A1",
          "source:sheet:2:A1",
        ],
      }),
    );
  });

  it("rejects a single oversized sheet before any send", async () => {
    const mock = transport();
    await expect(
      createInterpretTrip({
        transport: mock,
        maxRequestBytes: mock.maxRequestBytes - 1,
      })(request()),
    ).rejects.toMatchObject({ code: "preflight_limit" });
    expect(mock.send).not.toHaveBeenCalled();
  });

  it("uses actual prepared token estimates for whole-sheet chunking", async () => {
    const mock = transport();
    const result = await createInterpretTrip({
      transport: mock,
      maxRequestBytes: 10_000_000,
      maxEstimatedInputTokens: Math.ceil(mock.maxRequestBytes / 4),
    })(request());
    expect(result.status).toBe("draft");
    expect(mock.send).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid chunk-local cross-sheet parent before any send", async () => {
    const source = sourceDocument();
    source.evidence_units[2].parent_ref = source.evidence_units[0].id;
    const mock = transport();
    await expect(
      createInterpretTrip({
        transport: mock,
        maxRequestBytes: mock.maxRequestBytes,
      })(request(source)),
    ).rejects.toMatchObject({ code: "source_document_invalid" });
    expect(mock.send).not.toHaveBeenCalled();
  });

  it("rejects a later sheet preparation failure before sending earlier prepared sheets", async () => {
    const mock = transport();
    const original = mock.prepare.getMockImplementation()!;
    mock.prepare.mockImplementation((prompt) => {
      const source = sourceFromPrompt(prompt);
      if (
        source.evidence_units.length === 2 &&
        source.evidence_units[0].id.includes(":1:")
      )
        throw new Error("cannot prepare");
      return original(prompt);
    });
    await expect(parseChunks(mock)).rejects.toMatchObject({
      code: "preflight_limit",
    });
    expect(mock.send).not.toHaveBeenCalled();
  });

  it("returns a global insufficient outcome with complete coverage and the original reasons", async () => {
    const mock = transport((result, source) => {
      if (source.evidence_units[0].id.includes(":1:")) {
        result.status = "insufficient";
        result.draft = null;
        result.findings = [
          {
            id: "finding:missing",
            severity: "error",
            code: "MISSING_TRIP_STRUCTURE",
            message: "No trip structure in sheet 1",
            blocking: true,
            entity_refs: [],
            source_refs: source.evidence_units.map((unit) => unit.id),
          },
        ];
      }
      return result;
    });
    const result = await parseChunks(mock);
    expect(result.status).toBe("insufficient");
    expect(result.draft).toBeNull();
    expect(result.coverage.total_blocks).toBe(4);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "MISSING_TRIP_STRUCTURE",
        source_refs: ["source:sheet:1:A1", "source:sheet:1:A2"],
      }),
    );
    expect(mock.send).toHaveBeenCalledTimes(2);
  });

  it.each(["coverage", "schema", "provider"])(
    "rejects a later %s failure without returning a partial draft",
    async (failure) => {
      const mock = transport((result, source) => {
        if (source.evidence_units[0].id.includes(":1:")) {
          if (failure === "provider")
            throw new ParseTripError("rate_limited", "limited");
          if (failure === "schema") return {};
          result.coverage.block_disposition_ranges![0].from_id = "unknown";
        }
        return result;
      });
      await expect(parseChunks(mock)).rejects.toMatchObject({
        code:
          failure === "coverage"
            ? "coverage_invalid"
            : failure === "schema"
              ? "invalid_response"
              : "rate_limited",
      });
      expect(mock.send).toHaveBeenCalledTimes(2);
    },
  );

  it("stops before the next sheet after cancellation and rejects a late successful response", async () => {
    const controller = new AbortController();
    const mock = transport((result) => {
      controller.abort();
      return result;
    });
    await expect(
      parseChunks(mock, { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(mock.send).toHaveBeenCalledOnce();
    expect(mock.send.mock.calls[0][1]).toBe(controller.signal);
  });

  it("fails global duplicate semantics rather than silently deleting an event", async () => {
    const mock = transport((result) => {
      result.draft!.entities[0].title = "Same activity";
      return result;
    });
    await expect(parseChunks(mock)).rejects.toMatchObject({
      code: "draft_not_reviewable",
      findings: expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ENTITY_CANDIDATE" }),
      ]),
    });
  });

  it("fails conflicting non-null timezones and reports failure once", async () => {
    const mock = transport((result, source) => {
      if (source.evidence_units[0].id.includes(":1:"))
        result.draft!.trip.timezone = "Asia/Seoul";
      return result;
    });
    const onFailure = vi.fn();
    await expect(
      createInterpretTrip({
        transport: mock,
        maxRequestBytes: mock.maxRequestBytes,
        onFailure,
      })(request()),
    ).rejects.toMatchObject({
      code: "draft_not_reviewable",
      findings: [
        {
          code: "CHUNK_TIMEZONE_CONFLICT",
          message: expect.any(String),
          blocking: true,
        },
      ],
    });
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it("removes local fidelity findings before recomputing them against the complete source", async () => {
    const source = sourceDocument();
    for (const unit of source.evidence_units) {
      if (
        unit.structural_evidence[0].evidence_kind === "tabular_region" &&
        unit.structural_evidence[0].row_start === 2
      ) {
        unit.raw_value = `7點 ${unit.raw_value}`;
        unit.display_value = unit.raw_value;
      }
    }
    const mock = transport((result) => {
      result.draft!.entities[0].time = {
        kind: "exact",
        start: "07:00",
        end: null,
        daypart: null,
        raw_text: "7點",
        crosses_midnight: false,
      };
      return result;
    });
    mock.maxRequestBytes = Math.max(
      ...chunkSourceBySheet(source).map(prepareFixtureBytes),
    );
    const result = await parseChunks(mock, request(source));
    const findings = result.findings.filter(
      (finding) => finding.code === "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
    );
    expect(findings).toHaveLength(2);
    expect(
      findings.every((finding) =>
        finding.id?.startsWith("finding:local-fidelity:"),
      ),
    ).toBe(true);
    expect(findings.map((finding) => finding.entity_refs![0])).toEqual(
      result.draft!.entities.map((entity) => entity.id),
    );
  });

  it("preserves blocking provider ambiguities whose opaque IDs resemble local findings", async () => {
    const mock = transport((result) => {
      const draft = result.draft!;
      const finding = {
        id: "finding:local-fidelity:provider-ambiguity",
        severity: "review" as const,
        code: "SOURCE_AMBIGUITY",
        message: "Source contains incompatible program choices",
        blocking: true,
        entity_refs: [draft.entities[0].id],
        source_refs: [...draft.entities[0].source_refs],
      };
      result.findings.push(structuredClone(finding));
      draft.findings.push(structuredClone(finding));
      return result;
    });
    const result = await parseChunks(mock);
    const findings = result.findings.filter(
      (finding) => finding.code === "SOURCE_AMBIGUITY",
    );
    expect(findings).toHaveLength(2);
    expect(
      result.draft!.findings.filter(
        (finding) => finding.code === "SOURCE_AMBIGUITY",
      ),
    ).toHaveLength(2);
    expect(findings.every((finding) => finding.blocking)).toBe(true);
    expect(findings.map((finding) => finding.entity_refs![0])).toEqual(
      result.draft!.entities.map((entity) => entity.id),
    );
    expect(findings.map((finding) => finding.source_refs)).toEqual([
      ["source:sheet:0:A2"],
      ["source:sheet:1:A2"],
    ]);
  });

  it("rejects an empty reconciliation without fabricating a draft", () => {
    expect(reconcileInterpretationChunks([], request().source)).toMatchObject({
      valid: false,
    });
  });

  it.each(["identity", "version", "unknown", "duplicate", "missing"])(
    "explicitly rejects global %s coverage before union",
    (failure) => {
      const source = request().source;
      const values = chunkSourceBySheet(source).map((chunk) => {
        const value = response(chunk);
        value.coverage.block_disposition_ranges = undefined;
        value.coverage.block_dispositions = chunk.evidence_units.map(
          (unit) => ({ source_ref: unit.id, disposition: "interpreted" }),
        );
        return value;
      });
      if (failure === "identity") values[1].source_id = "other-source";
      if (failure === "version")
        values[1].source_schema_version = "other-version";
      if (failure === "unknown")
        values[1].coverage.block_dispositions[0].source_ref =
          "unknown-source-unit";
      if (failure === "duplicate")
        values[1].coverage.block_dispositions[0].source_ref =
          values[0].coverage.block_dispositions[0].source_ref;
      if (failure === "missing") values.pop();
      const before = structuredClone(values);
      expect(reconcileInterpretationChunks(values, source)).toMatchObject({
        valid: false,
        findings: [{ blocking: true }],
      });
      expect(values).toEqual(before);
    },
  );
});
