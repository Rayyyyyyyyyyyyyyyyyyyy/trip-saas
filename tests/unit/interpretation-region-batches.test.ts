import { describe, expect, it, vi } from "vitest";
import { createInterpretTrip } from "../../src/app/interpretTrip";
import { ParseTripError } from "../../src/app/parseTrip";
import type { InterpretationCheckpoint } from "../../src/app/parseTrip";
import {
  createGeminiTransport,
  GEMINI_ACCEPTANCE_CANDIDATE,
} from "../../src/integrations/gemini/geminiTransport";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import { validTabularSourceDocument } from "../fixtures/contracts/sourceDocuments";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function sourceDocument() {
  const source = structuredClone(validTabularSourceDocument);
  source.extraction_findings = [];
  source.evidence_units = Array.from({ length: 30 }, (_, index) => {
    const unit = structuredClone(source.evidence_units[0]!);
    const evidence = unit.structural_evidence[0]!;
    if (evidence.evidence_kind !== "tabular_region")
      throw new Error("Invalid fixture");
    unit.id = `cell:${index}`;
    unit.source_order = index;
    unit.parent_ref = null;
    unit.locator = `sheet:${evidence.sheet_name}!A${index + 1}`;
    unit.raw_value = unit.display_value =
      index === 0 ? "2026-09-10" : `Activity ${index}`;
    unit.links = [];
    unit.structural_evidence = [
      {
        ...evidence,
        row_start: index + 1,
        row_end: index + 1,
        column_start: 1,
        column_end: 1,
        merge_ref: null,
        header_ref: index === 0 ? null : "cell:0",
      },
    ];
    return unit;
  });
  return source;
}
function fixture() {
  const source = sourceDocument();
  const gate = validateUnifiedSourceDocument(source, {
    source_id: source.source_id,
  });
  if (!gate.valid) throw new Error("Source fixture failed");
  const fetch = vi.fn();
  const actual = createGeminiTransport({
    model: GEMINI_ACCEPTANCE_CANDIDATE,
    fetch,
  });
  const events: string[] = [];
  const send = vi.fn(
    async (prompt: string, signal?: AbortSignal): Promise<unknown> => {
      const marker = "\n\n## Source document\n\n";
      const chunk = JSON.parse(
        prompt.slice(prompt.lastIndexOf(marker) + marker.length),
      ) as UnifiedSourceDocument;
      const scopeMarker = "\n\n## Interpretation batch scope\n\n";
      const scopeOffset = prompt.lastIndexOf(scopeMarker);
      const owned: string[] =
        scopeOffset < 0
          ? chunk.evidence_units.map((unit) => unit.id)
          : JSON.parse(
              prompt.slice(
                scopeOffset + scopeMarker.length,
                prompt.lastIndexOf(marker),
              ),
            ).owned_source_refs;
      const result = structuredClone(validDraftInterpretationResult);
      result.source_id = chunk.source_id;
      result.coverage = {
        total_blocks: chunk.evidence_units.length,
        block_dispositions: chunk.evidence_units.map((unit) => ({
          source_ref: unit.id,
          disposition: "interpreted",
        })),
        unparsed_items: [],
      };
      const draft = result.draft!;
      draft.trip.source_refs = ["cell:0"];
      draft.days[0]!.source_refs = ["cell:0"];
      draft.days[0]!.label = "2026-09-10";
      const template = draft.entities[0]!;
      draft.entities = chunk.evidence_units
        .filter((unit) => owned.includes(unit.id) && unit.id !== "cell:0")
        .map((unit) => ({
          ...structuredClone(template),
          id: `entity:${unit.id}`,
          title: unit.display_value,
          source_refs: [unit.id],
          raw_label: unit.display_value,
          time: {
            kind: "none",
            start: null,
            end: null,
            daypart: null,
            raw_text: null,
            crosses_midnight: false,
          },
        }));
      events.push("send");
      return result;
    },
  );
  const prepare = vi.fn((prompt: string) => {
    events.push("prepare");
    return {
      ...actual.prepare(prompt),
      send: ({ signal }: { signal?: AbortSignal }) => send(prompt, signal),
    };
  });
  return { source, gate, fetch, send, prepare, events };
}

describe("serial regional interpretation workflow", () => {
  it("preflights every batch, keeps owned coverage exact and joins all activities into one dated Day", async () => {
    const value = fixture();
    const original = structuredClone(value.source);
    const progress: Array<{ completed: number; total: number }> = [];
    const stages: string[] = [];
    const result = await createInterpretTrip({ transport: value })({
      source: value.gate.document,
      sourceId: value.source.source_id,
      credential: "synthetic-key",
      onProgress: (next) => progress.push(next),
      onStage: (stage) => stages.push(stage),
    });
    expect(result.status).toBe("draft");
    expect(value.send).toHaveBeenCalledTimes(2);
    expect(result.draft!.entities).toHaveLength(29);
    expect(result.draft!.days).toHaveLength(1);
    expect(
      new Set(result.draft!.entities.map((entity) => entity.day_id)),
    ).toEqual(new Set([result.draft!.days[0]!.id]));
    expect(
      result.coverage.block_dispositions.map((item) => item.source_ref),
    ).toEqual(original.evidence_units.map((unit) => unit.id));
    expect(result.findings).toContainEqual(
      expect.objectContaining({ code: "CHUNK_SEAM_REVIEW", blocking: true }),
    );
    expect(progress).toEqual([
      { completed: 0, total: 2 },
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
    expect(stages).toEqual([
      "source_validation",
      "interpreting",
      "output_validation",
    ]);
    expect(value.events.slice(value.events.indexOf("send"))).toEqual([
      "send",
      "send",
    ]);
    expect(value.source).toEqual(original);
    expect(value.fetch).not.toHaveBeenCalled();
  });
  it("retains completed responses and retries only unfinished batches after a later failure", async () => {
    const value = fixture();
    const original = value.send.getMockImplementation()!;
    value.send
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new ParseTripError("provider_unavailable", "503"));
    const progress = vi.fn();
    let checkpoint: InterpretationCheckpoint | undefined;
    const parse = createInterpretTrip({ transport: value });
    await expect(
      parse({
        source: value.gate.document,
        sourceId: value.source.source_id,
        credential: "synthetic-key",
        onProgress: progress,
        onCheckpoint: (next) => { checkpoint = next; },
      }),
    ).rejects.toMatchObject({ code: "provider_unavailable" });
    expect(progress.mock.calls.map(([item]) => item.completed)).toEqual([0, 1]);
    expect(checkpoint?.completed).toHaveLength(1);
    const result = await parse({ source: value.gate.document, sourceId: value.source.source_id,
      credential: "fresh-credential", checkpoint, onProgress: progress, onCheckpoint: (next) => { checkpoint = next; } });
    expect(value.send).toHaveBeenCalledTimes(3);
    expect(result.draft!.entities).toHaveLength(29);
    expect(checkpoint?.completed).toHaveLength(2);
    expect(progress.mock.calls.slice(2).map(([item]) => item.completed)).toEqual([1, 1, 2]);
  });
  it("does not reuse responses after the model, request contents, or checkpoint source identity changes", async () => {
    const value = fixture();
    let checkpoint: InterpretationCheckpoint | undefined;
    const parse = createInterpretTrip({ transport: value });
    await parse({ source: value.gate.document, sourceId: value.source.source_id, credential: "synthetic-key", onCheckpoint: (next) => { checkpoint = next; } });
    const saved = structuredClone(checkpoint!);
    saved.requestIdentities = saved.requestIdentities.map((identity) => `another-model\n${identity}`);
    await parse({ source: value.gate.document, sourceId: value.source.source_id, credential: "synthetic-key", checkpoint: saved });
    expect(value.send).toHaveBeenCalledTimes(4);
    saved.sourceId = "source:unrelated";
    await parse({ source: value.gate.document, sourceId: value.source.source_id, credential: "synthetic-key", checkpoint: saved });
    expect(value.send).toHaveBeenCalledTimes(6);
  });
  it("rejects a late successful response after stop and sends no next batch", async () => {
    const value = fixture();
    const controller = new AbortController();
    const original = value.send.getMockImplementation()!;
    value.send.mockImplementationOnce(async (...args) => {
      const response = await original(...args);
      controller.abort();
      return response;
    });
    await expect(
      createInterpretTrip({ transport: value })({
        source: value.gate.document,
        sourceId: value.source.source_id,
        credential: "synthetic-key",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(value.send).toHaveBeenCalledOnce();
  });
  it("fails the entire preflight before any send for an indivisible oversized cell", async () => {
    const value = fixture();
    value.source.evidence_units[20]!.raw_value =
      value.source.evidence_units[20]!.display_value = "a".repeat(100_000);
    const gate = validateUnifiedSourceDocument(value.source, {
      source_id: value.source.source_id,
    });
    if (!gate.valid)
      throw new Error("Oversized fixture must pass source limits");
    await expect(
      createInterpretTrip({ transport: value })({
        source: gate.document,
        sourceId: value.source.source_id,
        credential: "synthetic-key",
      }),
    ).rejects.toMatchObject({ code: "preflight_limit" });
    expect(value.send).not.toHaveBeenCalled();
  });
});
