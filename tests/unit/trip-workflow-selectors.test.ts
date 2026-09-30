import { describe, expect, it } from "vitest";

import {
  createInitialTripWorkflowState,
  tripWorkflowReducer,
} from "../../src/app/tripWorkflow";
import {
  selectActiveTrip,
  selectCanConfirmCandidate,
  selectCanReadActiveTrip,
  selectCandidateDraft,
  selectConfirmedTrip,
  selectIsWorkflowBusy,
  selectShouldShowReview,
  selectWorkflowProgress,
} from "../../src/app/tripWorkflowSelectors";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import {
  validParsedTripDraft,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);

describe("trip workflow selectors", () => {
  it("derives active-trip readability independently from candidate progress", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });

    expect(selectActiveTrip(state)).toBe(activeTrip);
    expect(selectCanReadActiveTrip(state)).toBe(true);
    expect(selectIsWorkflowBusy(state)).toBe(true);
    expect(selectCandidateDraft(state)).toBeNull();
  });

  it("derives confirmation eligibility from current findings", () => {
    let state = createInitialTripWorkflowState();
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:1",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:1",
      requestId: "request:1",
    });
    state = tripWorkflowReducer(state, {
      type: "review_ready",
      sessionId: "session:1",
      requestId: "request:1",
      draft: validParsedTripDraft,
      findings: [{ code: "CONFLICT", message: "Fix me", blocking: true }],
      adjustments: [],
    });

    expect(selectShouldShowReview(state)).toBe(true);
    expect(selectCanConfirmCandidate(state)).toBe(false);

    state = tripWorkflowReducer(state, {
      type: "review_draft_changed",
      sessionId: "session:1",
      draft: validParsedTripDraft,
      findings: [],
    });
    expect(selectCanConfirmCandidate(state)).toBe(true);

    state = tripWorkflowReducer(state, {
      type: "confirmation_started",
      sessionId: "session:1",
    });
    expect(selectShouldShowReview(state)).toBe(true);
    expect(selectIsWorkflowBusy(state)).toBe(true);
  });

  it("reports progress without declaring interpretation complete early", () => {
    const validating = {
      ...createInitialTripWorkflowState(),
      status: "validating_source" as const,
    };
    const parsing = {
      ...createInitialTripWorkflowState(),
      status: "parsing" as const,
    };

    expect(selectWorkflowProgress(validating)).toMatchObject({
      extractionComplete: false,
      interpretationComplete: false,
      sourceValidationComplete: false,
    });
    expect(selectWorkflowProgress(parsing)).toMatchObject({
      extractionComplete: true,
      interpretationComplete: false,
      sourceValidationComplete: true,
    });
  });

  it("exposes confirmation success only for the exact committed active trip", () => {
    const committed = {
      ...createInitialTripWorkflowState(activeTrip),
      lastConfirmedTripId: activeTrip.id,
      status: "confirmed" as const,
    };

    expect(selectConfirmedTrip(committed)).toBe(activeTrip);
    expect(
      selectConfirmedTrip({ ...committed, lastConfirmedTripId: "trip:stale" }),
    ).toBeNull();
    expect(selectConfirmedTrip({ ...committed, status: "idle" })).toBeNull();
  });
});
