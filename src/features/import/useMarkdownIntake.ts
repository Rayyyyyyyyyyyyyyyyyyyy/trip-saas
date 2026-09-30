import { useState } from "react";
import type { TripIntakeWorkflow } from "../../app/useTripIntakeWorkflow";
import { selectIsWorkflowBusy } from "../../app/tripWorkflowSelectors";
import { createIntakeFailure, type IntakeFailure } from "./intakeFailure";
export type {
  PreparedMarkdownSource,
  SourcePreparedHandler,
} from "../../app/useTripIntakeWorkflow";
export type IntakeMode = "file" | "paste";
export type IntakeStage =
  | "idle"
  | "reading"
  | "constructing"
  | "awaiting_interpretation"
  | "interpreting"
  | "validating"
  | "prepared"
  | "failed";

/** Unsubmitted controls only. Processing state, results and cancellation are
 * projections of the application workflow, never synchronized feature state. */
export function useMarkdownIntake(controller: TripIntakeWorkflow) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<IntakeMode>("file");
  const [paste, setPaste] = useState("");
  const [pasteTouched, setPasteTouched] = useState(false);
  const { workflow } = controller;
  const isBusy = selectIsWorkflowBusy(workflow);
  const failure =
    workflow.status === "cancelled"
      ? createIntakeFailure("cancelled")
      : (workflow.failure as IntakeFailure | null);
  const stages: Partial<Record<typeof workflow.status, IntakeStage>> = {
    reading: "reading",
    extracting: "constructing",
    validating_source: "constructing",
    loading_credential: "interpreting",
    parsing: "interpreting",
    validating_draft: "validating",
    review_required: "prepared",
    insufficient: "prepared",
    prepared: controller.interprets ? "prepared" : "awaiting_interpretation",
    failed: "failed",
    cancelled: "failed",
  };
  const reset = () => {
    controller.stop();
    if (workflow.candidate)
      controller.dispatch({
        type: "workflow_cancelled",
        sessionId: workflow.candidate.sessionId,
      });
    controller.dispatch({ type: "workflow_acknowledged" });
  };
  return {
    file,
    mode,
    paste,
    pasteTouched,
    isBusy,
    isEmptyPaste: !paste.trim(),
    canStart:
      !isBusy && (mode === "file" ? file !== null : Boolean(paste.trim())),
    stage: stages[workflow.status] ?? "idle",
    failure,
    fallbackModel: controller.fallbackModel,
    canUseFallback:
      !isBusy &&
      failure?.code === "provider_unavailable" &&
      controller.fallbackModel !== null,
    prepared:
      workflow.candidate?.source && workflow.candidate.document
        ? {
            input: workflow.candidate.source,
            document: workflow.candidate.document,
          }
        : null,
    interprets: controller.interprets,
    selectFile(next: File | null) {
      reset();
      setFile(next);
    },
    selectMode(next: IntakeMode) {
      reset();
      setMode(next);
    },
    changePaste(next: string) {
      reset();
      setPaste(next);
      setPasteTouched(true);
    },
    clearPaste() {
      reset();
      setPaste("");
      setPasteTouched(false);
    },
    touchPaste() {
      setPasteTouched(true);
    },
    clearSelection() {
      setFile(null);
      setPaste("");
      setPasteTouched(false);
    },
    stop: controller.stop,
    async processSource() {
      if (mode === "file") {
        if (file) await controller.submit({ mode, file });
      } else {
        setPasteTouched(true);
        await controller.submit({ mode, paste });
      }
    },
    async processSourceWithFallback() {
      if (!controller.fallbackModel) return;
      if (mode === "file") {
        if (file) await controller.submitWithFallback({ mode, file });
      } else {
        setPasteTouched(true);
        await controller.submitWithFallback({ mode, paste });
      }
    },
  };
}
