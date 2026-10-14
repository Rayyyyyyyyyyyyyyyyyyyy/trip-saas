import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ParseTrip, ParseTripRequest } from "../../src/app/parseTrip";
import { useTripIntakeWorkflow } from "../../src/app/useTripIntakeWorkflow";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import { MarkdownIntakePanel } from "../../src/features/import/MarkdownIntakePanel";
import { useMarkdownIntake } from "../../src/features/import/useMarkdownIntake";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const credentialRepository = {
  load: async () => ({ status: "ready", credential: "test-only" }),
  probePersistence: async () => ({ supported: true }),
} as GeminiCredentialRepository;
const pending = () => new Promise<never>(() => {});
const submission = { mode: "paste" as const, paste: "# Travel\n\nWalk" };
afterEach(() => vi.useRealTimers());

describe("application batch progress", () => {
  it.each(["stage", "overall"] as const)(
    "does not extend the %s watchdog when completed batches arrive",
    async (deadline) => {
      vi.useFakeTimers();
      let request!: ParseTripRequest;
      const parseTrip: ParseTrip = vi.fn((next) => {
        request = next;
        next.onProgress?.({ completed: 0, total: 3 });
        return pending();
      });
      const hook = renderHook(() =>
        useTripIntakeWorkflow({
          credentialRepository,
          parseTrip,
          processing: {
            deadlines:
              deadline === "stage"
                ? { overallMs: 100, stageMs: { parsing: 20 } }
                : { overallMs: 20, stageMs: { parsing: 100 } },
          },
        }),
      );
      act(() =>
        hook.result.current.dispatch({
          type: "active_trip_loaded",
          trip: activeTrip,
        }),
      );
      let attempt!: Promise<void>;
      await act(async () => {
        attempt = hook.result.current.submit(submission);
      });
      expect(
        hook.result.current.workflow.candidate?.interpretationProgress,
      ).toEqual({ completed: 0, total: 3 });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15);
        request.onProgress?.({ completed: 1, total: 3 });
      });
      expect(hook.result.current.workflow.status).toBe("parsing");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6);
        await attempt;
      });
      expect(hook.result.current.workflow.failure?.code).toBe(
        "processing_timed_out",
      );
      expect(hook.result.current.workflow.activeTrip).toBe(activeTrip);
      expect(
        hook.result.current.workflow.candidate?.source?.display_name,
      ).toBeTruthy();
      const terminal = hook.result.current.workflow;
      act(() => request.onProgress?.({ completed: 2, total: 3 }));
      expect(hook.result.current.workflow).toBe(terminal);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("ignores stopped and superseded callbacks while a retry starts at zero", async () => {
    const requests: ParseTripRequest[] = [];
    const parseTrip: ParseTrip = vi.fn((request) => {
      requests.push(request);
      request.onProgress?.({ completed: 0, total: 3 });
      return pending();
    });
    const hook = renderHook(() =>
      useTripIntakeWorkflow({ credentialRepository, parseTrip }),
    );
    act(() =>
      hook.result.current.dispatch({
        type: "active_trip_loaded",
        trip: activeTrip,
      }),
    );
    let first!: Promise<void>;
    await act(async () => {
      first = hook.result.current.submit(submission);
    });
    act(() => requests[0]!.onProgress?.({ completed: 1, total: 3 }));
    await act(async () => {
      hook.result.current.stop();
      await first;
    });
    expect(hook.result.current.workflow.status).toBe("cancelled");
    expect(requests[0]!.signal?.aborted).toBe(true);
    let second!: Promise<void>;
    await act(async () => {
      second = hook.result.current.submit(submission);
    });
    const retried = hook.result.current.workflow;
    expect(retried.candidate?.interpretationProgress).toEqual({
      completed: 0,
      total: 3,
    });
    expect(requests[1]!.source).toBe(requests[0]!.source);
    act(() => requests[0]!.onProgress?.({ completed: 3, total: 3 }));
    expect(hook.result.current.workflow).toBe(retried);
    expect(hook.result.current.workflow.activeTrip).toBe(activeTrip);
    await act(async () => {
      hook.result.current.stop();
      await second;
    });
  });

  it("shows completed batch counts accessibly and releases the dialog on stop", async () => {
    const user = userEvent.setup();
    let request!: ParseTripRequest;
    const parseTrip: ParseTrip = vi.fn((next) => {
      request = next;
      next.onProgress?.({ completed: 0, total: 3 });
      return pending();
    });
    function Harness() {
      const controller = useTripIntakeWorkflow({
        credentialRepository,
        parseTrip,
      });
      const intake = useMarkdownIntake(controller);
      return (
        <MarkdownIntakePanel
          credentialRepository={credentialRepository}
          intake={intake}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      submission.paste,
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
    const progress = await screen.findByText("已完成 0/3 段判讀");
    expect(progress).toHaveAttribute("aria-live", "polite");
    act(() => request.onProgress?.({ completed: 1, total: 3 }));
    expect(screen.getByText("已完成 1/3 段判讀")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "停止這次判讀" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue(submission.paste);
    act(() => request.onProgress?.({ completed: 2, total: 3 }));
    expect(screen.queryByText(/已完成 .* 段判讀/)).not.toBeInTheDocument();
  });
});
