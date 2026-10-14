import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ParseTripError,
  type InterpretationCheckpoint,
  type ParseTrip,
  type ParseTripRequest,
} from "../../src/app/parseTrip";
import { useTripIntakeWorkflow } from "../../src/app/useTripIntakeWorkflow";
import { useMarkdownIntake } from "../../src/features/import/useMarkdownIntake";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";
import {
  validDraftInterpretationResult,
  validParsedTripDraft,
} from "../fixtures/contracts/validContracts";

const submission = { mode: "paste" as const, paste: "# Trip\n\nWalk" };
const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const pending = () => new Promise<never>(() => {});
function checkpointFor(request: ParseTripRequest): InterpretationCheckpoint {
  return {
    sourceId: request.sourceId,
    requestIdentities: ["fixture:batch:0", "fixture:batch:1"],
    completed: [
      { index: 0, result: structuredClone(validDraftInterpretationResult) },
    ],
  };
}
function dependencies(parser: ParseTrip) {
  let loadCount = 0;
  const load = vi.fn(async () => ({
    status: "ready" as const,
    credential: `key:${++loadCount}`,
  }));
  return {
    credentialRepository: { load } as unknown as GeminiCredentialRepository,
    parseTrip: parser,
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("session-only validated batch checkpoints", () => {
  it("reuses completed batches after provider failure with a fresh credential and request, without persisting them", async () => {
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const requests: ParseTripRequest[] = [];
    let emitted!: InterpretationCheckpoint;
    const parser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      if (requests.length === 1) {
        emitted = checkpointFor(request);
        request.onCheckpoint?.(emitted);
      }
      throw new ParseTripError("provider_unavailable", "provider unavailable");
    });
    const deps = dependencies(parser);
    const hook = renderHook(() => useTripIntakeWorkflow(deps));
    act(() =>
      hook.result.current.dispatch({
        type: "active_trip_loaded",
        trip: activeTrip,
      }),
    );
    await act(() => hook.result.current.submit(submission));
    expect(requests[0]!.checkpoint).toBeUndefined();
    const saved = structuredClone(emitted);
    emitted.completed[0]!.result.findings.push({
      id: "mutated",
      code: "MUTATED",
      message: "private",
      severity: "info",
      blocking: false,
      source_refs: [],
      entity_refs: [],
    });
    await act(() => hook.result.current.submit(submission));
    expect(requests[1]!.checkpoint).toEqual(saved);
    expect(requests[1]!.credential).toBe("key:2");
    expect(requests[1]!.source).toBe(requests[0]!.source);
    expect(requests[1]!.signal).not.toBe(requests[0]!.signal);
    expect(hook.result.current.workflow.activeTrip).toBe(activeTrip);
    expect(hook.result.current.workflow.candidate).not.toHaveProperty(
      "checkpoint",
    );
    expect(hook.result.current.workflow.activeTrip).not.toHaveProperty(
      "checkpoint",
    );
    expect(writes).not.toHaveBeenCalled();
    // Injected consumers cannot mutate the retained checkpoint through retry input.
    requests[1]!.checkpoint!.completed[0]!.result.findings.push({
      id: "consumer-mutated",
      code: "MUTATED",
      message: "private",
      severity: "info",
      blocking: false,
      source_refs: [],
      entity_refs: [],
    });
    await act(() => hook.result.current.submit(submission));
    expect(requests[2]!.checkpoint).toEqual(saved);
  });

  it("retains completed batches on stop and ignores late callbacks from the stopped attempt", async () => {
    const requests: ParseTripRequest[] = [];
    const parser: ParseTrip = vi.fn((request) => {
      requests.push(request);
      if (requests.length === 1) request.onCheckpoint?.(checkpointFor(request));
      return pending();
    });
    const hook = renderHook(() => useTripIntakeWorkflow(dependencies(parser)));
    let first!: Promise<void>;
    await act(async () => {
      first = hook.result.current.submit(submission);
    });
    const saved = checkpointFor(requests[0]!);
    await act(async () => {
      hook.result.current.stop();
      await first;
    });
    requests[0]!.onCheckpoint?.({ ...saved, completed: [] });
    let second!: Promise<void>;
    await act(async () => {
      second = hook.result.current.submit(submission);
    });
    expect(requests[1]!.checkpoint).toEqual(saved);
    requests[0]!.onCheckpoint?.({ ...saved, completed: [] });
    await act(async () => {
      hook.result.current.stop();
      await second;
    });
    let third!: Promise<void>;
    await act(async () => {
      third = hook.result.current.submit(submission);
    });
    expect(requests[2]!.checkpoint).toEqual(saved);
    await act(async () => {
      hook.result.current.stop();
      await third;
    });
  });

  it("retains completed batches after timeout without accepting a late checkpoint or extending deadlines", async () => {
    vi.useFakeTimers();
    const requests: ParseTripRequest[] = [];
    const parser: ParseTrip = vi.fn((request) => {
      requests.push(request);
      if (requests.length === 1) request.onCheckpoint?.(checkpointFor(request));
      return pending();
    });
    const deps = {
      ...dependencies(parser),
      processing: { deadlines: { stageMs: { parsing: 20 } } },
    };
    const hook = renderHook(() => useTripIntakeWorkflow(deps));
    let attempt!: Promise<void>;
    await act(async () => {
      attempt = hook.result.current.submit(submission);
    });
    const saved = checkpointFor(requests[0]!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15);
      requests[0]!.onCheckpoint?.(saved);
      await vi.advanceTimersByTimeAsync(6);
      await attempt;
    });
    expect(hook.result.current.workflow.failure?.code).toBe(
      "processing_timed_out",
    );
    requests[0]!.onCheckpoint?.({ ...saved, completed: [] });
    let retry!: Promise<void>;
    await act(async () => {
      retry = hook.result.current.submit(submission);
    });
    expect(requests[1]!.checkpoint).toEqual(saved);
    await act(async () => {
      hook.result.current.stop();
      await retry;
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["selection", "clear"] as const)(
    "clears checkpoint on %s invalidation even when the original source is restored",
    async (operation) => {
      const requests: ParseTripRequest[] = [];
      const parser: ParseTrip = vi.fn(async (request) => {
        requests.push(request);
        request.onCheckpoint?.(checkpointFor(request));
        throw new ParseTripError("provider_unavailable", "unavailable");
      });
      const deps = dependencies(parser);
      const hook = renderHook(() => {
        const controller = useTripIntakeWorkflow(deps);
        return { controller, intake: useMarkdownIntake(controller) };
      });
      await act(() => hook.result.current.controller.submit(submission));
      act(() =>
        operation === "clear"
          ? hook.result.current.intake.clearSelection()
          : hook.result.current.intake.changePaste(
              `${submission.paste}\nChanged`,
            ),
      );
      await act(() => hook.result.current.controller.submit(submission));
      expect(requests[1]!.checkpoint).toBeUndefined();
      expect(requests[1]!.sourceId).not.toBe(requests[0]!.sourceId);
    },
  );

  it("invalidates checkpoint when submission identity changes", async () => {
    const requests: ParseTripRequest[] = [];
    const parser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      request.onCheckpoint?.(checkpointFor(request));
      throw new ParseTripError("provider_unavailable", "unavailable");
    });
    const hook = renderHook(() => useTripIntakeWorkflow(dependencies(parser)));
    await act(() => hook.result.current.submit(submission));
    await act(() =>
      hook.result.current.submit({
        ...submission,
        paste: `${submission.paste} `,
      }),
    );
    expect(requests[1]!.checkpoint).toBeUndefined();
    await act(() => hook.result.current.submit(submission));
    expect(requests[2]!.checkpoint).toBeUndefined();
  });

  it("does not reuse a checkpoint across parser changes or restore it by switching back", async () => {
    const requests: ParseTripRequest[] = [];
    const firstParser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      if (requests.length === 1) request.onCheckpoint?.(checkpointFor(request));
      throw new ParseTripError("provider_unavailable", "unavailable");
    });
    const secondParser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      throw new ParseTripError("provider_unavailable", "unavailable");
    });
    const credentialRepository = dependencies(firstParser).credentialRepository;
    const hook = renderHook(
      ({ parseTrip }) =>
        useTripIntakeWorkflow({ credentialRepository, parseTrip }),
      { initialProps: { parseTrip: firstParser } },
    );
    await act(() => hook.result.current.submit(submission));
    hook.rerender({ parseTrip: secondParser });
    await act(() => hook.result.current.submit(submission));
    expect(requests[1]!.checkpoint).toBeUndefined();
    hook.rerender({ parseTrip: firstParser });
    await act(() => hook.result.current.submit(submission));
    expect(requests[2]!.checkpoint).toBeUndefined();
  });

  it("rejects checkpoints for another source", async () => {
    const requests: ParseTripRequest[] = [];
    const parser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      request.onCheckpoint?.({
        ...checkpointFor(request),
        sourceId: "wrong-source",
      });
      throw new ParseTripError("provider_unavailable", "unavailable");
    });
    const deps = dependencies(parser);
    const first = renderHook(() => useTripIntakeWorkflow(deps));
    await act(() => first.result.current.submit(submission));
    await act(() => first.result.current.submit(submission));
    expect(requests[1]!.checkpoint).toBeUndefined();
    first.unmount();
    const second = renderHook(() => useTripIntakeWorkflow(deps));
    await act(() => second.result.current.submit(submission));
    expect(requests[2]!.checkpoint).toBeUndefined();
    await waitFor(() =>
      expect(second.result.current.workflow.status).toBe("failed"),
    );
  });

  it("clears retained batches on unmount instead of recovering them from storage", async () => {
    const requests: ParseTripRequest[] = [];
    const parser: ParseTrip = vi.fn(async (request) => {
      requests.push(request);
      request.onCheckpoint?.(checkpointFor(request));
      throw new ParseTripError("provider_unavailable", "unavailable");
    });
    const deps = dependencies(parser);
    const first = renderHook(() => useTripIntakeWorkflow(deps));
    await act(() => first.result.current.submit(submission));
    await act(() => first.result.current.submit(submission));
    expect(requests[1]!.checkpoint?.completed).toHaveLength(1);
    first.unmount();
    const second = renderHook(() => useTripIntakeWorkflow(deps));
    await act(() => second.result.current.submit(submission));
    expect(requests[2]!.checkpoint).toBeUndefined();
  });
});
