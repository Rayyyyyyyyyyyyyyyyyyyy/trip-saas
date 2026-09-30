import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useTripIntakeWorkflow,
  type TripIntakeOptions,
} from "../../src/app/useTripIntakeWorkflow";
import type { ParseTrip } from "../../src/app/parseTrip";
import type { ProcessingStage } from "../../src/app/tripProcessingRun";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import {
  validDraftInterpretationResult,
  validParsedTripDraft,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const pending = () => new Promise<never>(() => {});
const readyCredential = {
  load: async () => ({ status: "ready", credential: "test-only" }),
} as GeminiCredentialRepository;
const stages: ProcessingStage[] = [
  "reading",
  "extracting",
  "validating_source",
  "loading_credential",
  "parsing",
  "validating_draft",
];
function setup(stage: ProcessingStage, overall = false) {
  const parseTrip: ParseTrip = vi.fn(async (request) => {
    if (stage === "validating_draft") request.onStage?.("output_validation");
    return pending();
  });
  const processing: TripIntakeOptions = {
    deadlines: overall ? { overallMs: 20 } : { stageMs: { [stage]: 20 } },
    read:
      stage === "reading"
        ? pending
        : () => structuredClone(validTextSourceInput),
    extract: stage === "extracting" ? pending : undefined,
    validate: stage === "validating_source" ? pending : undefined,
  };
  const hook = renderHook(() =>
    useTripIntakeWorkflow({
      credentialRepository:
        stage === "loading_credential"
          ? ({ load: pending } as unknown as GeminiCredentialRepository)
          : readyCredential,
      parseTrip,
      processing,
    }),
  );
  act(() =>
    hook.result.current.dispatch({
      type: "active_trip_loaded",
      trip: activeTrip,
    }),
  );
  return { ...hook, parseTrip };
}
afterEach(() => vi.useRealTimers());

describe("application processing ownership", () => {
  it.each(stages)(
    "bounds permanently pending %s and clears every timer",
    async (stage) => {
      vi.useFakeTimers();
      const { result, parseTrip } = setup(stage);
      let submission!: Promise<void>;
      await act(async () => {
        submission = result.current.submit({ mode: "paste", paste: "# Trip" });
      });
      expect(result.current.workflow.status).toBe(stage);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(21);
        await submission;
      });
      expect(result.current.workflow.status).toBe("failed");
      expect(result.current.workflow.failure?.code).toBe(
        "processing_timed_out",
      );
      expect(result.current.workflow.activeTrip).toEqual(activeTrip);
      expect(vi.getTimerCount()).toBe(0);
      if (
        [
          "reading",
          "extracting",
          "validating_source",
          "loading_credential",
        ].includes(stage)
      )
        expect(parseTrip).not.toHaveBeenCalled();
    },
  );

  it("enforces the overall deadline across shorter completed stages", async () => {
    vi.useFakeTimers();
    const { result } = setup("parsing", true);
    let submission!: Promise<void>;
    await act(async () => {
      submission = result.current.submit({ mode: "paste", paste: "# Trip" });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21);
      await submission;
    });
    expect(result.current.workflow.failure?.code).toBe("processing_timed_out");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "reading",
    "extracting",
    "loading_credential",
    "parsing",
    "validating_draft",
  ] as const)(
    "stop releases pending %s immediately and aborts all work",
    async (stage) => {
      vi.useFakeTimers();
      const { result } = setup(stage);
      let submission!: Promise<void>;
      await act(async () => {
        submission = result.current.submit({ mode: "paste", paste: "# Trip" });
      });
      await act(async () => {
        result.current.stop();
        await submission;
      });
      expect(result.current.workflow.status).toBe("cancelled");
      expect(result.current.workflow.activeTrip).toEqual(activeTrip);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["resolve", "reject"] as const)(
    "ignores late provider %s after stop, permits retry, and clears terminal timers",
    async (outcome) => {
      vi.useFakeTimers();
      let resolve!: (value: typeof validDraftInterpretationResult) => void;
      let reject!: (reason: unknown) => void;
      const late = new Promise<typeof validDraftInterpretationResult>(
        (yes, no) => {
          resolve = yes;
          reject = no;
        },
      );
      const parseTrip = vi
        .fn<ParseTrip>()
        .mockImplementationOnce(() => late)
        .mockResolvedValue(validDraftInterpretationResult);
      const { result } = renderHook(() =>
        useTripIntakeWorkflow({
          credentialRepository: readyCredential,
          parseTrip,
        }),
      );
      let first!: Promise<void>;
      await act(async () => {
        first = result.current.submit({ mode: "paste", paste: "# First" });
      });
      await act(async () => {
        result.current.stop();
        await first;
      });
      await act(async () => {
        await result.current.submit({ mode: "paste", paste: "# Retry" });
      });
      expect(result.current.workflow.status).toBe("review_required");
      const secondCandidate = result.current.workflow.candidate;
      await act(async () => {
        if (outcome === "resolve") resolve(validDraftInterpretationResult);
        else reject(new Error("private provider body"));
      });
      expect(result.current.workflow.candidate).toBe(secondCandidate);
      expect(result.current.workflow.failure).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["read", "extract"] as const)(
    "replacement during %s ignores old completion before it can call a provider",
    async (stage) => {
      vi.useFakeTimers();
      let resolve!: (value: any) => void;
      const old = new Promise<any>((yes) => {
        resolve = yes;
      });
      const parseTrip = vi
        .fn<ParseTrip>()
        .mockResolvedValue(validDraftInterpretationResult);
      const processing: TripIntakeOptions =
        stage === "read"
          ? {
              read: vi
                .fn()
                .mockImplementationOnce(() => old)
                .mockResolvedValue(validTextSourceInput),
            }
          : {
              extract: vi
                .fn()
                .mockImplementationOnce(() => old)
                .mockImplementation(() => {
                  throw new Error("second extraction failed safely");
                }),
            };
      const { result } = renderHook(() =>
        useTripIntakeWorkflow({
          credentialRepository: readyCredential,
          parseTrip,
          processing,
        }),
      );
      let first!: Promise<void>;
      await act(async () => {
        first = result.current.submit({ mode: "paste", paste: "# First" });
      });
      await act(async () => {
        await result.current.submit({ mode: "paste", paste: "# Second" });
        await first;
      });
      const second = result.current.workflow;
      await act(async () => {
        resolve(validTextSourceInput);
      });
      expect(result.current.workflow).toBe(second);
      expect(parseTrip).toHaveBeenCalledTimes(stage === "read" ? 1 : 0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("unmount aborts processing and removes watchdog timers", async () => {
    vi.useFakeTimers();
    const { result, unmount } = setup("reading");
    let submission!: Promise<void>;
    await act(async () => {
      submission = result.current.submit({ mode: "paste", paste: "# Trip" });
    });
    await act(async () => {
      unmount();
      await submission;
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
