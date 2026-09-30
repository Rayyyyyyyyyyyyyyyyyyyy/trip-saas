import type { TripWorkflowState } from "./tripWorkflow";

const busyStatuses = new Set([
  "reading",
  "loading_credential",
  "validating_source",
  "extracting",
  "parsing",
  "validating_draft",
  "confirming",
]);

export const selectActiveTrip = (state: TripWorkflowState) => state.activeTrip;

export const selectCandidateDraft = (state: TripWorkflowState) =>
  state.candidate?.draft ?? null;

export const selectCurrentSessionId = (state: TripWorkflowState) =>
  state.candidate?.sessionId ?? null;

export const selectCanReadActiveTrip = (state: TripWorkflowState) =>
  state.activeTrip !== null;

export const selectIsWorkflowBusy = (state: TripWorkflowState) =>
  busyStatuses.has(state.status);

export const selectShouldShowReview = (state: TripWorkflowState) =>
  ["review_required", "confirming", "failed"].includes(state.status) &&
  state.candidate?.draft !== null;

export const selectShouldShowInsufficientRecovery = (
  state: TripWorkflowState,
) =>
  state.status === "insufficient" &&
  state.candidate?.interpretation?.status === "insufficient";

export const selectConfirmedTrip = (state: TripWorkflowState) =>
  state.status === "confirmed" &&
  state.activeTrip?.id === state.lastConfirmedTripId
    ? state.activeTrip
    : null;

export const selectCanConfirmCandidate = (state: TripWorkflowState) =>
  selectShouldShowReview(state) &&
  !state.candidate!.findings.some((finding) => finding.blocking);

export const selectWorkflowProgress = (state: TripWorkflowState) => ({
  current: state.status,
  extractionComplete: [
    "parsing",
    "validating_draft",
    "review_required",
    "confirming",
    "confirmed",
  ].includes(state.status),
  interpretationComplete: [
    "validating_draft",
    "review_required",
    "confirming",
    "confirmed",
  ].includes(state.status),
  sourceValidationComplete: ![
    "idle",
    "validating_source",
    "cancelled",
  ].includes(state.status),
});
