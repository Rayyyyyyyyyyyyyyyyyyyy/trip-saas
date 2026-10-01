import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  UnifiedSourceDocument,
  ValidatedUnifiedSourceDocument,
} from "../domain/source/types";
import { validateUnifiedSourceDocument } from "../domain/source/validateUnifiedSourceDocument";
import type { TextSourceInput } from "../domain/trip/types";
import { deriveSupportingGroups } from "../domain/trip/deriveSupportingGroups";
import { extractMarkdownSource } from "../features/import/markdownSourceAdapter";
import {
  createIntakeFailure,
  IntakeFailureError,
  toIntakeFailure,
} from "../features/import/intakeFailure";
import {
  normalizeMarkdownFile,
  normalizePastedMarkdown,
} from "../features/import/textSourceInput";
import { deriveReviewFindings } from "../features/review/reviewCandidate";
import { applyConservativeReviewAdjustments } from "../features/review/reviewAdjustment";
import type { GeminiCredentialRepository } from "../persistence/geminiCredentialRepository";
import { describeIntakeFailure } from "./describeIntakeFailure";
import type { ParseTrip } from "./parseTrip";
import {
  createInitialTripWorkflowState,
  tripWorkflowReducer,
} from "./tripWorkflow";
import { createWorkflowRequestCoordinator } from "./tripWorkflowRequests";
import {
  createTripProcessingRun,
  type ProcessingDeadlines,
} from "./tripProcessingRun";

export type MarkdownSubmission =
  { mode: "file"; file: File } | { mode: "paste"; paste: string };
export type PreparedMarkdownSource = {
  input: TextSourceInput;
  document: ValidatedUnifiedSourceDocument;
};
export type SourcePreparedHandler = (
  source: PreparedMarkdownSource,
) => void | Promise<void>;
export type TripIntakeOptions = {
  deadlines?: ProcessingDeadlines;
  read?: (
    submission: MarkdownSubmission,
    signal: AbortSignal,
  ) => TextSourceInput | Promise<TextSourceInput>;
  extract?: (
    input: TextSourceInput,
    signal: AbortSignal,
  ) => UnifiedSourceDocument | Promise<UnifiedSourceDocument>;
  validate?: (
    document: UnifiedSourceDocument,
    input: TextSourceInput,
    signal: AbortSignal,
  ) => ValidatedUnifiedSourceDocument | Promise<ValidatedUnifiedSourceDocument>;
};
export function useTripIntakeWorkflow(
  options: {
    credentialRepository?: GeminiCredentialRepository;
    fallbackModel?: string;
    fallbackParseTrip?: ParseTrip;
    parseTrip?: ParseTrip;
    onSourcePrepared?: SourcePreparedHandler;
    processing?: TripIntakeOptions;
  } = {},
) {
  const [workflow, dispatch] = useReducer(tripWorkflowReducer, null, () =>
    createInitialTripWorkflowState(),
  );
  const coordinator = useRef(createWorkflowRequestCoordinator());
  const activeId = useRef<string | null>(null);
  const stop = useCallback(() => {
    if (!activeId.current) return;
    const sessionId = activeId.current;
    coordinator.current.cancelSession(sessionId);
    activeId.current = null;
    dispatch({ type: "workflow_cancelled", sessionId });
  }, []);
  useEffect(
    () => () => {
      if (activeId.current) coordinator.current.cancelSession(activeId.current);
    },
    [],
  );
  const submit = useCallback(
    async (
      submission: MarkdownSubmission,
      selectedParseTrip: ParseTrip | undefined = options.parseTrip,
    ) => {
      const session = coordinator.current.startSession();
      const request = coordinator.current.startRequest(session.sessionId);
      activeId.current = session.sessionId;
      dispatch({
        type: "intake_started",
        sessionId: session.sessionId,
        source: null,
      });
      const current = () =>
        coordinator.current.isCurrent(session.sessionId, request.requestId);
      const processing = options.processing;
      const run = createTripProcessingRun(
        request.signal,
        (status) => {
          if (current())
            dispatch({
              type: "processing_stage",
              sessionId: session.sessionId,
              status,
            });
        },
        processing?.deadlines,
      );
      let extractionComplete = false;
      try {
        const input = await run.wait("reading", () =>
          processing?.read
            ? processing.read(submission, run.signal)
            : submission.mode === "file"
              ? normalizeMarkdownFile(submission.file)
              : normalizePastedMarkdown(submission.paste),
        );
        dispatch({
          type: "source_read",
          sessionId: session.sessionId,
          source: input,
        });
        const extracted = await run.wait("extracting", () =>
          processing?.extract
            ? processing.extract(input, run.signal)
            : extractMarkdownSource(input),
        );
        const document = await run.wait("validating_source", async () => {
          const candidate = processing?.validate
            ? await processing.validate(extracted, input, run.signal)
            : extracted;
          const gate = validateUnifiedSourceDocument(candidate, {
            source_id: input.source_id,
          });
          if (!gate.valid)
            throw new IntakeFailureError(
              createIntakeFailure("source_document_invalid"),
            );
          return gate.document;
        });
        extractionComplete = true;
        dispatch({
          type: "extraction_completed",
          sessionId: session.sessionId,
          document,
        });
        if (options.onSourcePrepared || !selectedParseTrip) {
          if (options.onSourcePrepared)
            await run.wait("parsing", () =>
              options.onSourcePrepared!({ input, document }),
            );
          dispatch({ type: "source_prepared", sessionId: session.sessionId });
          return;
        }
        const credential = await run.wait("loading_credential", () =>
          options.credentialRepository?.load(),
        );
        if (credential?.status !== "ready")
          throw new IntakeFailureError(
            createIntakeFailure("credential_unavailable"),
          );
        dispatch({
          type: "parse_started",
          sessionId: session.sessionId,
          requestId: request.requestId,
        });
        const interpretation = await run.wait("parsing", () =>
          selectedParseTrip({
            credential: credential.credential,
            source: document,
            sourceId: input.source_id,
            signal: run.signal,
            onStage(stage) {
              run.enter(
                stage === "source_validation"
                  ? "validating_source"
                  : stage === "output_validation"
                    ? "validating_draft"
                    : "parsing",
              );
            },
          }),
        );
        dispatch({
          type: "parse_completed",
          sessionId: session.sessionId,
          requestId: request.requestId,
          interpretation,
        });
        await run.wait("validating_draft", () => {
          if (
            interpretation.status === "insufficient" ||
            !interpretation.draft
          ) {
            dispatch({
              type: "interpretation_insufficient",
              sessionId: session.sessionId,
              requestId: request.requestId,
              interpretation,
            });
          } else {
            const reviewInterpretation = {
              ...interpretation,
              draft: deriveSupportingGroups(interpretation.draft, document),
            };
            const adjustmentResult =
              applyConservativeReviewAdjustments(reviewInterpretation);
            dispatch({
              type: "review_ready",
              sessionId: session.sessionId,
              requestId: request.requestId,
              adjustments: adjustmentResult.adjustments,
              draft: adjustmentResult.candidate,
              findings: deriveReviewFindings(
                adjustmentResult.candidate,
                interpretation.findings,
              ),
            });
          }
        });
      } catch (cause) {
        if (!current()) return;
        const failure = extractionComplete
          ? describeIntakeFailure(cause)
          : toIntakeFailure(cause, "extraction_failed");
        dispatch({
          type: "workflow_failed",
          sessionId: session.sessionId,
          failure,
        });
      } finally {
        run.finish();
        // Do not cancel a newer candidate when an old ignored operation settles.
        if (current()) coordinator.current.cancelSession(session.sessionId);
        if (activeId.current === session.sessionId) activeId.current = null;
      }
    },
    [
      options.credentialRepository,
      options.onSourcePrepared,
      options.parseTrip,
      options.processing,
    ],
  );
  const submitWithFallback = useCallback(
    async (submission: MarkdownSubmission) => {
      if (!options.fallbackParseTrip) return;
      await submit(submission, options.fallbackParseTrip);
    },
    [options.fallbackParseTrip, submit],
  );
  return {
    workflow,
    dispatch,
    submit,
    submitWithFallback,
    stop,
    fallbackModel:
      options.fallbackParseTrip && options.fallbackModel
        ? options.fallbackModel
        : null,
    interprets: Boolean(options.parseTrip || options.onSourcePrepared),
  };
}
export type TripIntakeWorkflow = ReturnType<typeof useTripIntakeWorkflow>;
