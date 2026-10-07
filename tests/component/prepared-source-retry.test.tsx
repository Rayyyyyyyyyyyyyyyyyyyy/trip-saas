import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParseTripError, type ParseTripRequest } from "../../src/app/parseTrip";
import {
  useTripIntakeWorkflow,
  type TripIntakeOptions,
  type PreparedSource,
} from "../../src/app/useTripIntakeWorkflow";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { normalizePastedMarkdown } from "../../src/features/import/textSourceInput";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type {
  UnifiedSourceDocument,
  ValidatedUnifiedSourceDocument,
} from "../../src/domain/source/types";
import {
  prepareSpreadsheetFile,
  type PreparedSpreadsheetFile,
} from "../../src/features/import/spreadsheetSourceAdapter";
import {
  IntakeFailureError,
  createIntakeFailure,
} from "../../src/features/import/intakeFailure";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import {
  validParsedTripDraft,
  validInsufficientInterpretationResult,
} from "../fixtures/contracts/validContracts";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";

vi.mock("../../src/features/import/spreadsheetSourceAdapter", () => ({
  prepareSpreadsheetFile: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

function dependencies(processing: TripIntakeOptions = {}) {
  let sequence = 0;
  let credentialLoads = 0;
  const read = vi.fn(async () =>
    normalizePastedMarkdown("# Trip\n\nWalk", {
      createSourceId: () => `source:preparation:${++sequence}`,
    }),
  );
  const extract = vi.fn(extractMarkdownSource);
  const load = vi.fn<GeminiCredentialRepository["load"]>(async () => ({
    status: "ready" as const,
    credential: `key:${++credentialLoads}`,
  }));
  const parseTrip = vi.fn(
    async (
      _request: ParseTripRequest,
    ): Promise<SemanticInterpretationResult> => {
      throw new ParseTripError(
        "provider_unreachable",
        "private provider details",
      );
    },
  );
  return {
    read,
    extract,
    load,
    parseTrip,
    options: {
      credentialRepository: { load } as unknown as GeminiCredentialRepository,
      parseTrip,
      processing: { read, extract, ...processing },
    },
  };
}

function gate(document: UnifiedSourceDocument): ValidatedUnifiedSourceDocument {
  const result = validateUnifiedSourceDocument(document, {
    source_id: document.source_id,
  });
  if (!result.valid) throw new Error("Invalid fixture");
  return result.document;
}

const paste = { mode: "paste" as const, paste: "# Trip\n\nWalk" };

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(prepareSpreadsheetFile).mockReset();
});

describe("application prepared-source retry", () => {
  it.each([
    "provider_unreachable",
    "invalid_response",
    "coverage_invalid",
    "draft_not_reviewable",
  ] as const)(
    "reuses validated input and evidence after %s while refreshing request ownership and credential",
    async (code) => {
      const deps = dependencies();
      deps.parseTrip.mockImplementation(async () => {
        throw new ParseTripError(code, "private");
      });
      const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
      await act(() => hook.result.current.submit(paste));
      const first = hook.result.current.workflow.candidate!;
      await act(() => hook.result.current.submit({ ...paste }));
      const second = hook.result.current.workflow.candidate!;
      expect(deps.read).toHaveBeenCalledOnce();
      expect(deps.extract).toHaveBeenCalledOnce();
      expect(deps.load).toHaveBeenCalledTimes(2);
      expect(deps.parseTrip).toHaveBeenCalledTimes(2);
      expect(second.source).toBe(first.source);
      expect(second.document).toBe(first.document);
      expect(second.sessionId).not.toBe(first.sessionId);
      expect(second.requestId).not.toBe(first.requestId);
      expect(deps.parseTrip.mock.calls[1][0]).toMatchObject({
        sourceId: deps.parseTrip.mock.calls[0][0].sourceId,
        source: deps.parseTrip.mock.calls[0][0].source,
        credential: "key:2",
      });
      expect(deps.parseTrip.mock.calls[1][0].signal).not.toBe(
        deps.parseTrip.mock.calls[0][0].signal,
      );
    },
  );

  it("matches the entire pasted string and the actual File object, never just a filename", async () => {
    const deps = dependencies();
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() => hook.result.current.submit(paste));
    await act(() =>
      hook.result.current.submit({ ...paste, paste: `${paste.paste} ` }),
    );
    await act(() => hook.result.current.submit(paste));
    const file = new File([paste.paste], "Trip.md");
    await act(() => hook.result.current.submit({ mode: "file", file }));
    await act(() => hook.result.current.submit({ mode: "file", file }));
    await act(() =>
      hook.result.current.submit({
        mode: "file",
        file: new File([paste.paste], "Trip.md"),
      }),
    );
    expect(deps.read).toHaveBeenCalledTimes(5);
    expect(
      new Set(deps.parseTrip.mock.calls.map(([request]) => request.sourceId))
        .size,
    ).toBe(5);
  });

  it.each(["edit", "replace", "remove", "clear"])(
    "explicit %s invalidation prevents reuse even if the previous selection is restored",
    async () => {
      const deps = dependencies();
      const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
      await act(() => hook.result.current.submit(paste));
      act(() => hook.result.current.invalidatePreparedSource());
      await act(() => hook.result.current.submit(paste));
      expect(deps.read).toHaveBeenCalledTimes(2);
      expect(deps.extract).toHaveBeenCalledTimes(2);
      expect(deps.parseTrip.mock.calls[0][0].sourceId).not.toBe(
        deps.parseTrip.mock.calls[1][0].sourceId,
      );
    },
  );

  it("does not cache a document that fails the authoritative source gate", async () => {
    const deps = dependencies();
    deps.extract.mockImplementationOnce((input) => ({
      ...extractMarkdownSource(input),
      source_id: "wrong-source",
    }));
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() => hook.result.current.submit(paste));
    expect(hook.result.current.workflow.failure?.code).toBe(
      "source_document_invalid",
    );
    expect(hook.result.current.workflow.candidate?.source).not.toBeNull();
    expect(deps.parseTrip).not.toHaveBeenCalled();
    await act(() => hook.result.current.submit(paste));
    expect(deps.read).toHaveBeenCalledTimes(2);
    expect(deps.extract).toHaveBeenCalledTimes(2);
    expect(deps.parseTrip).toHaveBeenCalledOnce();
  });

  it("reloads an unavailable credential without repeating completed source preparation", async () => {
    const deps = dependencies();
    deps.load.mockResolvedValueOnce({ status: "empty" });
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() => hook.result.current.submit(paste));
    expect(hook.result.current.workflow.failure?.code).toBe(
      "credential_unavailable",
    );
    expect(deps.parseTrip).not.toHaveBeenCalled();
    await act(() => hook.result.current.submit(paste));
    expect(deps.load).toHaveBeenCalledTimes(2);
    expect(deps.read).toHaveBeenCalledOnce();
    expect(deps.extract).toHaveBeenCalledOnce();
    expect(deps.parseTrip).toHaveBeenCalledOnce();
  });

  it("does not let a superseded validator refill the cache or replace the newer source", async () => {
    const pending = deferred<ValidatedUnifiedSourceDocument>();
    let oldDocument!: ValidatedUnifiedSourceDocument;
    const validate = vi.fn(async (document: UnifiedSourceDocument) => {
      if (validate.mock.calls.length === 1) {
        oldDocument = gate(document);
        return pending.promise;
      }
      return gate(document);
    });
    const deps = dependencies({ validate });
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    let oldRun!: Promise<void>;
    act(() => {
      oldRun = hook.result.current.submit(paste);
    });
    await waitFor(() => expect(validate).toHaveBeenCalledOnce());
    act(() => hook.result.current.invalidatePreparedSource());
    const replacement = { ...paste, paste: `${paste.paste}\nNew` };
    await act(() => hook.result.current.submit(replacement));
    const sourceId =
      hook.result.current.workflow.candidate!.document!.source_id;
    await act(async () => {
      pending.resolve(oldDocument);
      await oldRun;
    });
    await act(() => hook.result.current.submit(replacement));
    expect(deps.read).toHaveBeenCalledTimes(2);
    expect(
      deps.parseTrip.mock.calls.map(([request]) => request.sourceId),
    ).toEqual([sourceId, sourceId]);
    expect(hook.result.current.workflow.candidate!.document!.source_id).toBe(
      sourceId,
    );
  });

  it("retains prepared source after stop but ignores the old provider's late completion", async () => {
    const pending = deferred<SemanticInterpretationResult>();
    const deps = dependencies();
    deps.parseTrip.mockImplementationOnce(() => pending.promise);
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    const activeTrip = buildCanonicalTrip(validParsedTripDraft);
    act(() =>
      hook.result.current.dispatch({
        type: "active_trip_loaded",
        trip: activeTrip,
      }),
    );
    let oldRun!: Promise<void>;
    act(() => {
      oldRun = hook.result.current.submit(paste);
    });
    await waitFor(() => expect(deps.parseTrip).toHaveBeenCalledOnce());
    act(() => hook.result.current.stop());
    await act(() => oldRun);
    await act(() => hook.result.current.submit(paste));
    await act(async () => {
      pending.resolve(structuredClone(validInsufficientInterpretationResult));
      await Promise.resolve();
    });
    expect(deps.read).toHaveBeenCalledOnce();
    expect(deps.parseTrip).toHaveBeenCalledTimes(2);
    expect(hook.result.current.workflow.activeTrip).toBe(activeTrip);
    expect(hook.result.current.workflow.status).toBe("failed");
    // The old dependency ignores abort. Settlement cannot affect the
    // newer request; the processing run already detached its continuation.
    expect(deps.parseTrip.mock.calls[0][0].signal?.aborted).toBe(true);
  });

  it("cannot cache timed-out source preparation when the ignored dependency later resolves", async () => {
    vi.useFakeTimers();
    const pending = deferred<ValidatedUnifiedSourceDocument>();
    let lateDocument!: ValidatedUnifiedSourceDocument;
    const validate = vi.fn(async (document: UnifiedSourceDocument) => {
      lateDocument = gate(document);
      return validate.mock.calls.length === 1 ? pending.promise : lateDocument;
    });
    const deps = dependencies({
      validate,
      deadlines: { stageMs: { validating_source: 10 } },
    });
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    let attempt!: Promise<void>;
    await act(async () => {
      attempt = hook.result.current.submit(paste);
      await vi.advanceTimersByTimeAsync(11);
    });
    await act(() => attempt);
    expect(hook.result.current.workflow.failure?.code).toBe(
      "processing_timed_out",
    );
    await act(async () => {
      pending.resolve(lateDocument);
      await Promise.resolve();
    });
    await act(() => hook.result.current.submit(paste));
    expect(deps.read).toHaveBeenCalledTimes(2);
    expect(deps.parseTrip).toHaveBeenCalledOnce();
  });

  it("shares the cache with spreadsheet submissions and keeps real metadata without fake Markdown content", async () => {
    const deps = dependencies();
    const source: UnifiedSourceDocument = {
      schema_version: "unified-source-document.v1",
      source_id: "source:spreadsheet",
      source_format: "tabular",
      input_mode: "spreadsheet_file",
      display_name: "Trip.xlsx",
      extraction_findings: [],
      evidence_units: [
        {
          id: "source:cell",
          source_order: 0,
          parent_ref: null,
          locator: "sheet:Day!A1",
          raw_value: "8/16",
          display_value: "8/16",
          links: [],
          structural_evidence: [
            {
              evidence_kind: "tabular_region",
              sheet_id: "sheet:0",
              sheet_name: "Day",
              sheet_order: 0,
              row_start: 1,
              row_end: 1,
              column_start: 1,
              column_end: 1,
              header_ref: null,
              merge_ref: null,
            },
          ],
        },
      ],
    };
    const prepare = vi.fn(async () => ({
      input: {
        source_id: source.source_id,
        display_name: source.display_name,
        input_mode: "spreadsheet_file" as const,
      },
      document: gate(source),
    }));
    const selection = {};
    const submission = {
      mode: "prepared" as const,
      identity: selection,
      prepare,
    };
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() => hook.result.current.submit(submission));
    expect(hook.result.current.workflow.candidate?.source).toEqual({
      source_id: source.source_id,
      display_name: source.display_name,
      input_mode: "spreadsheet_file",
    });
    await act(() => hook.result.current.submit({ ...submission }));
    expect(prepare).toHaveBeenCalledOnce();
    expect(deps.read).not.toHaveBeenCalled();
    expect(deps.extract).not.toHaveBeenCalled();
    expect(hook.result.current.workflow.candidate?.source).toEqual({
      source_id: source.source_id,
      display_name: source.display_name,
      input_mode: "spreadsheet_file",
    });
    await act(() =>
      hook.result.current.submit({ ...submission, identity: {} }),
    );
    expect(prepare).toHaveBeenCalledTimes(2);
    await act(() => hook.result.current.submit(paste));
    await act(() => hook.result.current.submit(submission));
    expect(prepare).toHaveBeenCalledTimes(3);
  });

  it("gates prepared submissions locally instead of trusting an adapter's brand", async () => {
    const deps = dependencies();
    const input = normalizePastedMarkdown(paste.paste);
    const document = gate(extractMarkdownSource(input));
    const prepare = vi.fn(async () => ({
      input,
      document: { ...document, source_id: "mismatch" },
    }));
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() =>
      hook.result.current.submit({
        mode: "prepared",
        identity: "selection",
        prepare,
      }),
    );
    await act(() =>
      hook.result.current.submit({
        mode: "prepared",
        identity: "selection",
        prepare,
      }),
    );
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.parseTrip).not.toHaveBeenCalled();
    expect(hook.result.current.workflow.failure?.code).toBe(
      "source_document_invalid",
    );
  });

  it("runs actual prepared extraction under its configured extraction deadline and cannot cache late work", async () => {
    vi.useFakeTimers();
    const input = normalizePastedMarkdown(paste.paste);
    const source = { input, document: gate(extractMarkdownSource(input)) };
    const pending = deferred<PreparedSource>();
    const prepare = vi
      .fn<() => Promise<PreparedSource>>(async () => source)
      .mockImplementationOnce(() => pending.promise);
    const deps = dependencies({
      deadlines: { stageMs: { reading: 1000, extracting: 10 } },
    });
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    const submission = { mode: "prepared" as const, identity: {}, prepare };
    let attempt!: Promise<void>;
    await act(async () => {
      attempt = hook.result.current.submit(submission);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(hook.result.current.workflow.status).toBe("extracting");
    expect(hook.result.current.workflow.candidate?.source).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
      await attempt;
    });
    expect(hook.result.current.workflow.failure?.code).toBe(
      "processing_timed_out",
    );
    expect(hook.result.current.workflow.failure?.phase).toBe("extraction");
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.parseTrip).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve(source);
      await Promise.resolve();
    });
    await act(() => hook.result.current.submit(submission));
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(hook.result.current.workflow.candidate?.source).toEqual(input);
    expect(deps.parseTrip).toHaveBeenCalledOnce();
  });
});

describe("application spreadsheet inspection", () => {
  const metadata: PreparedSpreadsheetFile = {
    displayName: "Trip.xlsx",
    format: "xlsx",
    visibleSheets: [{ id: "sheet:0", name: "Day", order: 0 }],
  };
  const file = new File(["workbook"], "Trip.xlsx");

  it("ends the shared processing state with sheet metadata and never loads credentials or calls a provider", async () => {
    vi.mocked(prepareSpreadsheetFile).mockResolvedValue(metadata);
    const deps = dependencies();
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    const activeTrip = buildCanonicalTrip(validParsedTripDraft);
    act(() =>
      hook.result.current.dispatch({
        type: "active_trip_loaded",
        trip: activeTrip,
      }),
    );
    let inspected: PreparedSpreadsheetFile | null = null;
    await act(async () => {
      inspected = await hook.result.current.inspectSpreadsheetFile(file);
    });
    expect(inspected).toBe(metadata);
    expect(hook.result.current.workflow.status).toBe("prepared");
    expect(hook.result.current.workflow.candidate?.source).toBeNull();
    expect(hook.result.current.workflow.candidate?.document).toBeNull();
    expect(hook.result.current.workflow.activeTrip).toBe(activeTrip);
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.parseTrip).not.toHaveBeenCalled();
  });

  it("returns null after stop and cannot expose late sheet metadata", async () => {
    const pending = deferred<PreparedSpreadsheetFile>();
    vi.mocked(prepareSpreadsheetFile).mockReturnValue(pending.promise);
    const deps = dependencies();
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    let inspection!: Promise<PreparedSpreadsheetFile | null>;
    act(() => {
      inspection = hook.result.current.inspectSpreadsheetFile(file);
    });
    await waitFor(() => expect(prepareSpreadsheetFile).toHaveBeenCalledOnce());
    act(() => hook.result.current.stop());
    let inspected: PreparedSpreadsheetFile | null = metadata;
    await act(async () => {
      inspected = await inspection;
      pending.resolve(metadata);
      await Promise.resolve();
    });
    expect(inspected).toBeNull();
    expect(hook.result.current.workflow.status).toBe("cancelled");
    expect(deps.parseTrip).not.toHaveBeenCalled();
  });

  it("bounds ignored inspection with the reading deadline and safe failure copy", async () => {
    vi.useFakeTimers();
    const pending = deferred<PreparedSpreadsheetFile>();
    vi.mocked(prepareSpreadsheetFile).mockReturnValue(pending.promise);
    const deps = dependencies({ deadlines: { stageMs: { reading: 10 } } });
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    let inspection!: Promise<PreparedSpreadsheetFile | null>;
    await act(async () => {
      inspection = hook.result.current.inspectSpreadsheetFile(file);
      await vi.advanceTimersByTimeAsync(11);
    });
    let inspected: PreparedSpreadsheetFile | null = metadata;
    await act(async () => {
      inspected = await inspection;
      pending.resolve(metadata);
    });
    expect(inspected).toBeNull();
    expect(hook.result.current.workflow.failure?.code).toBe(
      "processing_timed_out",
    );
    expect(hook.result.current.workflow.failure?.phase).toBe("reading");
    expect(deps.load).not.toHaveBeenCalled();
  });

  it("returns null for superseded inspection while the new selection owns the shared workflow", async () => {
    const pending = deferred<PreparedSpreadsheetFile>();
    vi.mocked(prepareSpreadsheetFile)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(metadata);
    const deps = dependencies();
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    let oldInspection!: Promise<PreparedSpreadsheetFile | null>;
    act(() => {
      oldInspection = hook.result.current.inspectSpreadsheetFile(file);
    });
    await waitFor(() => expect(prepareSpreadsheetFile).toHaveBeenCalledOnce());
    await act(() =>
      hook.result.current.inspectSpreadsheetFile(
        new File(["new workbook"], "New.xlsx"),
      ),
    );
    const newSession = hook.result.current.workflow.candidate!.sessionId;
    let oldResult: PreparedSpreadsheetFile | null = metadata;
    await act(async () => {
      pending.resolve(metadata);
      oldResult = await oldInspection;
    });
    expect(oldResult).toBeNull();
    expect(hook.result.current.workflow.candidate!.sessionId).toBe(newSession);
    expect(hook.result.current.workflow.status).toBe("prepared");
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.parseTrip).not.toHaveBeenCalled();
  });

  it("reports adapter failure without exposing thrown source details", async () => {
    vi.mocked(prepareSpreadsheetFile).mockRejectedValue(
      new IntakeFailureError(createIntakeFailure("spreadsheet_empty")),
    );
    const deps = dependencies();
    const hook = renderHook(() => useTripIntakeWorkflow(deps.options));
    await act(() => hook.result.current.inspectSpreadsheetFile(file));
    expect(hook.result.current.workflow.failure?.code).toBe(
      "spreadsheet_empty",
    );
    vi.mocked(prepareSpreadsheetFile).mockRejectedValue(
      new Error("private workbook contents"),
    );
    await act(() => hook.result.current.inspectSpreadsheetFile(file));
    expect(hook.result.current.workflow.failure?.code).toBe(
      "spreadsheet_unreadable",
    );
    expect(hook.result.current.workflow.failure?.message).not.toContain(
      "private",
    );
  });
});
