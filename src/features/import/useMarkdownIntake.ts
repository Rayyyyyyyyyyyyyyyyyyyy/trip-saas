import { useRef, useState } from "react";
import type { PreparedSpreadsheetFile } from "./spreadsheetSourceAdapter";
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
  const [spreadsheet, setSpreadsheet] =
    useState<PreparedSpreadsheetFile | null>(null);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const selectionGeneration = useRef(0);
  const preparedIdentity = useRef<object>({});
  const isSpreadsheet = file !== null && /\.(xlsx|csv)$/iu.test(file.name);
  const inspect = async (next: File) => {
    const generation = selectionGeneration.current;
    const prepared = await controller.inspectSpreadsheetFile(next);
    if (prepared && generation === selectionGeneration.current) {
      setSpreadsheet(prepared);
      setSelectedSheetIds(prepared.visibleSheets.map((sheet) => sheet.id));
    }
  };
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
    selectionGeneration.current += 1;
    preparedIdentity.current = {};
    controller.invalidatePreparedSource();
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
    spreadsheet,
    selectedSheetIds,
    isSpreadsheet,
    mode,
    paste,
    pasteTouched,
    isBusy,
    interpretationProgress:
      isBusy && workflow.status !== "confirming"
        ? (workflow.candidate?.interpretationProgress ?? null)
        : null,
    isEmptyPaste: !paste.trim(),
    canStart:
      !isBusy &&
      (mode === "file"
        ? file !== null &&
          (!isSpreadsheet ||
            (spreadsheet !== null && selectedSheetIds.length > 0))
        : Boolean(paste.trim())),
    canRetry:
      !isBusy &&
      (mode === "file"
        ? file !== null && (!spreadsheet || selectedSheetIds.length > 0)
        : Boolean(paste.trim())),
    stage:
      workflow.status === "prepared" && !workflow.candidate?.document
        ? ("idle" as const)
        : (stages[workflow.status] ?? "idle"),
    failure,
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
      setSpreadsheet(null);
      setSelectedSheetIds([]);
      if (next && /\.(xlsx|csv)$/iu.test(next.name)) void inspect(next);
    },
    selectSheet(id: string, checked: boolean) {
      if (
        !spreadsheet ||
        !spreadsheet.visibleSheets.some((sheet) => sheet.id === id)
      )
        return;
      reset();
      setSelectedSheetIds((previous) =>
        spreadsheet.visibleSheets
          .filter((sheet) =>
            sheet.id === id ? checked : previous.includes(sheet.id),
          )
          .map((sheet) => sheet.id),
      );
    },
    selectMode(next: IntakeMode) {
      reset();
      setMode(next);
      if (next === "file" && file && isSpreadsheet && !spreadsheet)
        void inspect(file);
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
      selectionGeneration.current += 1;
      preparedIdentity.current = {};
      controller.invalidatePreparedSource();
      setSpreadsheet(null);
      setSelectedSheetIds([]);
      setFile(null);
      setPaste("");
      setPasteTouched(false);
    },
    stop: controller.stop,
    async processSource() {
      if (mode === "file") {
        if (!file) return;
        if (isSpreadsheet) {
          if (!spreadsheet) {
            await inspect(file);
            return;
          }
          if (!selectedSheetIds.length) return;
          const selection = [...selectedSheetIds];
          await controller.submit({
            mode: "prepared",
            identity: preparedIdentity.current,
            async prepare(signal) {
              if (signal.aborted) throw signal.reason;
              const { extractSpreadsheetSource } =
                await import("./spreadsheetSourceAdapter");
              if (signal.aborted) throw signal.reason;
              const document = await extractSpreadsheetSource(
                spreadsheet,
                selection,
              );
              if (signal.aborted) throw signal.reason;
              return {
                input: {
                  source_id: document.source_id,
                  display_name: spreadsheet.displayName,
                  input_mode:
                    spreadsheet.format === "csv"
                      ? ("csv_file" as const)
                      : ("spreadsheet_file" as const),
                },
                document,
              };
            },
          });
        } else await controller.submit({ mode, file });
      } else {
        setPasteTouched(true);
        await controller.submit({ mode, paste });
      }
    },
  };
}
