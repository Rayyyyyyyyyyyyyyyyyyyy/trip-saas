import { recordReviewCorrection } from "../features/review/reviewPreservation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";

import { createReviewEvidenceProjection } from "../domain/source/reviewEvidence";
import type { CanonicalTrip } from "../domain/trip/types";
import { confirmReviewedTrip } from "../features/review/confirmReviewedTrip";
import { InsufficientRecovery } from "../features/review/InsufficientRecovery";
import { deriveReviewSessionFindings } from "../features/review/reviewCandidate";
import { ReviewScreen } from "../features/review/ReviewScreen";
import { Home } from "../features/import/Home";
import { importCanonicalTripFile } from "../features/import/canonicalTripImport";
import { describeConfirmationFailure } from "./describeIntakeFailure";
import type { ConfirmedTripRepository } from "../persistence/confirmedTripRepository";
import type { GeminiCredentialRepository } from "../persistence/geminiCredentialRepository";
import type { LocalDataOperations } from "../persistence/localDataOperations";
import { loadTripStartup, type TripStartupResult } from "./tripStartup";
import type { ParseTrip } from "./parseTrip";
import { TripConfirmationSuccess } from "./TripConfirmationSuccess";
import {
  useTripIntakeWorkflow,
  type TripIntakeOptions,
  type SourcePreparedHandler,
} from "./useTripIntakeWorkflow";
import { useMarkdownIntake } from "../features/import/useMarkdownIntake";
import {
  selectConfirmedTrip,
  selectShouldShowInsufficientRecovery,
  selectShouldShowReview,
} from "./tripWorkflowSelectors";

type HomeState = Extract<TripStartupResult, { kind: "home" }>;

type StartupViewState =
  | { kind: "loading" }
  | Extract<TripStartupResult, { kind: "home" }>
  | { kind: "viewer"; sample: boolean };

export type TripRuntimeStartupProps = {
  credentialRepository: GeminiCredentialRepository;
  localDataOperations: LocalDataOperations;
  repository: ConfirmedTripRepository;
  sampleTrip: CanonicalTrip;
  renderViewer: (
    trip: CanonicalTrip,
    controls: { onShowHome: () => void; sample: boolean },
  ) => ReactNode;
  onSourcePrepared?: SourcePreparedHandler;
  parseTrip?: ParseTrip;
  processing?: TripIntakeOptions;
};

const recoveryMessages: Record<NonNullable<HomeState["recovery"]>, string> = {
  active_pointer_invalid:
    "無法辨識瀏覽器中的目前行程索引。為了避免顯示錯誤資料，行程檢視器沒有開啟。",
  active_record_invalid:
    "儲存的行程未通過完整檢查。原始資料沒有被覆寫，可從資料管理嘗試復原。",
  active_record_missing:
    "找不到目前行程的完整內容。請重新匯入，或先開啟大阪安全範例。",
  storage_unavailable:
    "這個瀏覽器目前無法讀取本機行程資料，但大阪安全範例仍可開啟。",
};

export function TripRuntimeStartup({
  credentialRepository,
  localDataOperations,
  repository,
  sampleTrip,
  renderViewer,
  onSourcePrepared,
  parseTrip,
  processing,
}: TripRuntimeStartupProps) {
  const [state, setState] = useState<StartupViewState>({ kind: "loading" });
  const [homeRevision, setHomeRevision] = useState(0);
  const intakeWorkflow = useTripIntakeWorkflow({
    credentialRepository,
    parseTrip,
    onSourcePrepared,
    processing,
  });
  const { workflow, dispatch: dispatchWorkflow } = intakeWorkflow;
  const intake = useMarkdownIntake(intakeWorkflow);

  useEffect(() => {
    let current = true;
    void loadTripStartup(repository).then((result) => {
      if (!current) return;
      dispatchWorkflow({
        type: "active_trip_loaded",
        trip: result.kind === "viewer" ? result.trip : null,
      });
      setState(
        result.kind === "viewer" ? { kind: "viewer", sample: false } : result,
      );
    });
    return () => {
      current = false;
    };
  }, [repository]);

  const cancelCandidate = useCallback(() => {
    const sessionId = workflow.candidate?.sessionId;
    if (sessionId) {
      intakeWorkflow.stop();
      dispatchWorkflow({ type: "workflow_cancelled", sessionId });
    }
    setState({ kind: "home", recovery: null });
  }, [workflow.candidate?.sessionId, intakeWorkflow]);

  if (
    selectShouldShowReview(workflow) &&
    workflow.candidate?.draft &&
    workflow.candidate.document &&
    workflow.candidate.interpretation?.draft
  ) {
    const candidate = workflow.candidate;
    const reviewEvidence = createReviewEvidenceProjection(candidate.document!);
    return (
      <ReviewScreen
        adjustments={candidate.adjustments}
        busy={workflow.status === "confirming"}
        evidence={reviewEvidence}
        corrections={candidate.corrections}
        draft={candidate.draft!}
        errorMessage={workflow.failure?.message ?? null}
        interpretation={candidate.interpretation!}
        originalDraft={candidate.interpretation!.draft!}
        onCancel={cancelCandidate}
        onDraftChange={(draft, edit) => {
          const corrections = recordReviewCorrection(
            candidate.draft!,
            draft,
            candidate.corrections,
            edit,
          );
          dispatchWorkflow({
            type: "review_draft_changed",
            draft,
            corrections,
            findings: deriveReviewSessionFindings(
              draft,
              candidate.interpretation!,
              reviewEvidence,
              corrections,
            ),
            sessionId: candidate.sessionId,
          });
        }}
        onConfirm={() => {
          dispatchWorkflow({
            type: "confirmation_started",
            sessionId: candidate.sessionId,
          });
          void confirmReviewedTrip(candidate.draft!, repository, {
            sourceId: candidate.interpretation?.source_id,
            review: {
              evidence: reviewEvidence,
              interpretation: candidate.interpretation!,
              corrections: candidate.corrections,
            },
          })
            .then((trip) => {
              intake.clearSelection();
              dispatchWorkflow({
                type: "confirmation_committed",
                sessionId: candidate.sessionId,
                trip,
              });
            })
            .catch((cause) => {
              // Only the documented confirmation code is read; the thrown
              // value's own message never reaches Review.
              dispatchWorkflow({
                type: "workflow_failed",
                sessionId: candidate.sessionId,
                failure: describeConfirmationFailure(cause),
              });
            });
        }}
      />
    );
  }

  if (
    selectShouldShowInsufficientRecovery(workflow) &&
    workflow.candidate?.document &&
    workflow.candidate.interpretation
  ) {
    return (
      <InsufficientRecovery
        evidence={createReviewEvidenceProjection(workflow.candidate.document)}
        interpretation={workflow.candidate.interpretation}
        onCancel={cancelCandidate}
        onReplaceSource={cancelCandidate}
      />
    );
  }

  const confirmedTrip = selectConfirmedTrip(workflow);
  if (confirmedTrip) {
    return (
      <TripConfirmationSuccess
        trip={confirmedTrip}
        onOpenTrip={() => {
          dispatchWorkflow({ type: "workflow_acknowledged" });
          setState({ kind: "viewer", sample: false });
        }}
        onShowHome={() => {
          dispatchWorkflow({ type: "workflow_acknowledged" });
          setState({ kind: "home", recovery: null });
        }}
      />
    );
  }

  if (state.kind === "loading") {
    return (
      <Stack
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        spacing={2}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary">
          正在讀取這台裝置上的行程…
        </Typography>
      </Stack>
    );
  }

  if (state.kind === "home") {
    return (
      <Home
        key={homeRevision}
        activeTrip={workflow.activeTrip}
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        recoveryMessage={
          state.recovery ? recoveryMessages[state.recovery] : null
        }
        intake={intake}
        onCanonicalTripFile={async (file) => {
          const trip = await importCanonicalTripFile(file, repository);
          intake.clearSelection();
          cancelCandidate();
          dispatchWorkflow({ type: "active_trip_loaded", trip });
          setState({ kind: "viewer", sample: false });
          return trip;
        }}
        onLocalDataCleared={() => {
          intake.clearSelection();
          cancelCandidate();
          setHomeRevision((revision) => revision + 1);
          dispatchWorkflow({ type: "active_trip_loaded", trip: null });
          setState({ kind: "home", recovery: null });
        }}
        onOpenActive={() => {
          if (workflow.activeTrip) {
            setState({ kind: "viewer", sample: false });
          }
        }}
        onOpenSample={() => setState({ kind: "viewer", sample: true })}
      />
    );
  }

  const viewerTrip = state.sample ? sampleTrip : workflow.activeTrip;
  if (!viewerTrip) {
    return null;
  }

  return renderViewer(viewerTrip, {
    sample: state.sample,
    onShowHome: () => setState({ kind: "home", recovery: null }),
  });
}
