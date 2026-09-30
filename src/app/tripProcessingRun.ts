import {
  createIntakeFailure,
  IntakeFailureError,
} from "../features/import/intakeFailure";
import type { TripWorkflowFailurePhase } from "./tripWorkflow";

export type ProcessingStage =
  | "reading"
  | "extracting"
  | "validating_source"
  | "loading_credential"
  | "parsing"
  | "validating_draft";
export type ProcessingDeadlines = {
  overallMs?: number;
  stageMs?: Partial<Record<ProcessingStage, number>>;
};
const defaults: Record<ProcessingStage, number> = {
  reading: 15_000,
  extracting: 15_000,
  validating_source: 15_000,
  loading_credential: 15_000,
  parsing: 370_000,
  validating_draft: 15_000,
};
const phases: Record<ProcessingStage, TripWorkflowFailurePhase> = {
  reading: "reading",
  extracting: "extraction",
  validating_source: "extraction",
  loading_credential: "provider_request",
  parsing: "provider_request",
  validating_draft: "response_validation",
};
function bounded(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/** Owns every processing wait, including adapters that ignore abort. No late
 * completion can progress to another stage after stop, replacement or timeout. */
export function createTripProcessingRun(
  signal: AbortSignal,
  onStage: (stage: ProcessingStage) => void,
  deadlines: ProcessingDeadlines = {},
) {
  const controller = new AbortController();
  let stage: ProcessingStage = "reading";
  let stageTimer: ReturnType<typeof setTimeout> | undefined;
  let failure: IntakeFailureError | undefined;
  const abort = () => {
    failure ??= new IntakeFailureError(createIntakeFailure("cancelled"));
    controller.abort();
  };
  const timeout = () => {
    failure = new IntakeFailureError({
      ...createIntakeFailure("processing_timed_out"),
      phase: phases[stage],
    });
    controller.abort();
  };
  const overallTimer = setTimeout(
    timeout,
    bounded(deadlines.overallMs, 420_000),
  );
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const check = () => {
    if (controller.signal.aborted) throw failure;
  };
  const enter = (next: ProcessingStage) => {
    check();
    stage = next;
    clearTimeout(stageTimer);
    stageTimer = setTimeout(
      timeout,
      bounded(deadlines.stageMs?.[next], defaults[next]),
    );
    onStage(next);
  };
  return {
    signal: controller.signal,
    enter,
    async wait<T>(
      next: ProcessingStage,
      work: () => T | Promise<T>,
    ): Promise<T> {
      enter(next);
      // Install abort rejection before invoking an injectable/async stage.
      let rejectAbort: () => void = () => {};
      const aborted = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(failure);
        controller.signal.addEventListener("abort", rejectAbort, {
          once: true,
        });
      });
      try {
        check();
        const result = await Promise.race([
          Promise.resolve().then(() => {
            check();
            return work();
          }),
          aborted,
        ]);
        check();
        return result;
      } finally {
        controller.signal.removeEventListener("abort", rejectAbort);
      }
    },
    finish() {
      clearTimeout(overallTimer);
      clearTimeout(stageTimer);
      signal.removeEventListener("abort", abort);
      // End the provider signal too, so callers cannot reuse completed work.
      abort();
    },
  };
}
