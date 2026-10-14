import { describe, expect, it } from "vitest";

import {
  createInitialTripWorkflowState,
  tripWorkflowReducer,
} from "../../src/app/tripWorkflow";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type { ReviewAdjustment } from "../../src/features/review/reviewAdjustment";
import {
  validParsedTripDraft,
  validDraftInterpretationResult,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const replacementTrip = buildCanonicalTrip({
  ...validParsedTripDraft,
  trip: {
    ...validParsedTripDraft.trip,
    id: "trip:replacement-002",
    title: "Replacement trip",
  },
});

describe("trip workflow reducer", () => {
  it("starts clean and loads one persisted active trip without a candidate", () => {
    const clean = createInitialTripWorkflowState();
    expect(clean).toEqual({
      activeTrip: null,
      candidate: null,
      failure: null,
      lastConfirmedTripId: null,
      status: "idle",
    });

    const loaded = tripWorkflowReducer(clean, {
      type: "active_trip_loaded",
      trip: activeTrip,
    });
    expect(loaded).toMatchObject({
      activeTrip,
      candidate: null,
      status: "idle",
    });
  });

  it("moves through intake, parsing, validation, Review, and confirmation", () => {
    let state = createInitialTripWorkflowState();
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:1",
      source: validTextSourceInput,
    });
    expect(state.status).toBe("validating_source");

    state = tripWorkflowReducer(state, {
      type: "source_validated",
      sessionId: "session:1",
    });
    expect(state.status).toBe("extracting");

    state = tripWorkflowReducer(state, {
      type: "extraction_completed",
      sessionId: "session:1",
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:1",
      requestId: "request:1",
    });
    state = tripWorkflowReducer(state, {
      type: "parse_completed",
      sessionId: "session:1",
      requestId: "request:1",
      interpretation: validDraftInterpretationResult,
    });
    expect(state.status).toBe("validating_draft");

    state = tripWorkflowReducer(state, {
      type: "review_ready",
      sessionId: "session:1",
      requestId: "request:1",
      draft: validParsedTripDraft,
      findings: [],
      adjustments: [],
    });
    expect(state.status).toBe("review_required");

    state = tripWorkflowReducer(state, {
      type: "confirmation_started",
      sessionId: "session:1",
    });
    state = tripWorkflowReducer(state, {
      type: "confirmation_committed",
      sessionId: "session:1",
      trip: activeTrip,
    });
    expect(state).toMatchObject({
      activeTrip,
      candidate: null,
      lastConfirmedTripId: activeTrip.id,
      status: "confirmed",
    });

    state = tripWorkflowReducer(state, { type: "workflow_acknowledged" });
    expect(state).toMatchObject({
      activeTrip,
      candidate: null,
      lastConfirmedTripId: null,
      status: "idle",
    });
  });

  it("makes only the committed replacement active and clears its candidate", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:replacement",
      requestId: "request:replacement",
    });
    state = tripWorkflowReducer(state, {
      type: "review_ready",
      sessionId: "session:replacement",
      requestId: "request:replacement",
      draft: validParsedTripDraft,
      findings: [],
      adjustments: [],
    });
    state = tripWorkflowReducer(state, {
      type: "confirmation_started",
      sessionId: "session:replacement",
    });
    state = tripWorkflowReducer(state, {
      type: "confirmation_committed",
      sessionId: "session:replacement",
      trip: replacementTrip,
    });

    expect(state).toMatchObject({
      activeTrip: replacementTrip,
      candidate: null,
      failure: null,
      lastConfirmedTripId: replacementTrip.id,
      status: "confirmed",
    });
  });

  it("keeps a recoverable candidate when the current workflow fails", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "workflow_failed",
      sessionId: "session:replacement",
      failure: {
        code: "SOURCE_INVALID",
        message: "Replace the source and try again.",
        recoverable: true,
      },
    });

    expect(state.status).toBe("failed");
    expect(state.candidate?.sessionId).toBe("session:replacement");
    expect(state.activeTrip).toBe(activeTrip);
  });

  it("preserves the active trip on current validation, provider, or persistence failure", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:replacement",
      requestId: "request:replacement",
    });
    state = tripWorkflowReducer(state, {
      type: "workflow_failed",
      sessionId: "session:replacement",
      requestId: "request:replacement",
      failure: {
        code: "PROVIDER_UNAVAILABLE",
        message: "Gemini request failed.",
        recoverable: true,
      },
    });

    expect(state.activeTrip).toBe(activeTrip);
    expect(state.candidate?.sessionId).toBe("session:replacement");
    expect(state.status).toBe("failed");

    state = { ...state, status: "confirming" };
    state = tripWorkflowReducer(state, {
      type: "workflow_failed",
      sessionId: "session:replacement",
      failure: {
        code: "PERSISTENCE_ROLLBACK",
        message: "The replacement was not committed.",
        recoverable: true,
      },
    });
    expect(state.activeTrip).toBe(activeTrip);
    expect(state.candidate?.sessionId).toBe("session:replacement");
    expect(state.lastConfirmedTripId).toBeNull();
    expect(state.status).toBe("failed");
  });

  it("does not interpret presentation-surface close as workflow cancellation", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:replacement",
      requestId: "request:replacement",
    });

    const afterClose = tripWorkflowReducer(state, {
      type: "workflow_surface_closed",
      sessionId: "session:replacement",
    });

    expect(afterClose).toBe(state);
    expect(afterClose.status).toBe("parsing");
    expect(afterClose.candidate?.requestId).toBe("request:replacement");
  });

  it("keeps exactly one in-memory candidate without replacing the readable active trip", () => {
    const replacementSource = {
      ...validTextSourceInput,
      source_id: "source:replacement-002",
      display_name: "New replacement itinerary",
    };
    let state = createInitialTripWorkflowState(activeTrip);

    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:first-replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:first-replacement",
      requestId: "request:first",
    });

    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:latest-replacement",
      source: replacementSource,
    });

    expect(state.activeTrip).toBe(activeTrip);
    expect(state.candidate).toMatchObject({
      sessionId: "session:latest-replacement",
      requestId: null,
      source: replacementSource,
    });
    expect(state.candidate?.draft).toBeNull();

    const afterStaleResponse = tripWorkflowReducer(state, {
      type: "review_ready",
      sessionId: "session:first-replacement",
      requestId: "request:first",
      draft: validParsedTripDraft,
      findings: [],
      adjustments: [],
    });

    expect(afterStaleResponse).toBe(state);
    expect(afterStaleResponse.activeTrip).toBe(activeTrip);
    expect(afterStaleResponse.candidate?.sessionId).toBe(
      "session:latest-replacement",
    );
  });

  it("clears only the candidate on explicit cancellation", () => {
    let state = createInitialTripWorkflowState(activeTrip);
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:replacement",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "workflow_cancelled",
      sessionId: "session:replacement",
    });

    expect(state).toMatchObject({
      activeTrip,
      candidate: null,
      status: "cancelled",
    });
  });

  it("keeps the provider result separate from the adjusted session candidate and clears both on commit", () => {
    const original = structuredClone(validDraftInterpretationResult);
    original.draft!.entities[0]!.time = {
      kind: "exact",
      start: "06:30",
      end: null,
      daypart: null,
      raw_text: "6:30",
      crosses_midnight: false,
    };
    const adjusted = structuredClone(original.draft!);
    adjusted.entities[0]!.time = {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: "6:30",
      crosses_midnight: false,
    };
    const adjustments: ReviewAdjustment[] = [
      {
        id: "adjustment:unsupported-clock:test",
        kind: "unsupported_clock_precision_downgrade",
        finding_id: "finding:local-fidelity:test",
        entity_id: adjusted.entities[0]!.id,
        source_refs: adjusted.entities[0]!.source_refs,
        before: original.draft!.entities[0]!.time,
        after: adjusted.entities[0]!.time,
      },
    ];
    let state = tripWorkflowReducer(
      createInitialTripWorkflowState(activeTrip),
      {
        type: "intake_started",
        sessionId: "session:adjusted",
        source: validTextSourceInput,
      },
    );
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:adjusted",
      requestId: "request:adjusted",
    });
    state = tripWorkflowReducer(state, {
      type: "parse_completed",
      sessionId: "session:adjusted",
      requestId: "request:adjusted",
      interpretation: original,
    });
    state = tripWorkflowReducer(state, {
      type: "review_ready",
      sessionId: "session:adjusted",
      requestId: "request:adjusted",
      draft: adjusted,
      findings: [],
      adjustments,
    });

    expect(state.candidate?.interpretation?.draft?.entities[0]!.time.kind).toBe(
      "exact",
    );
    expect(state.candidate?.draft?.entities[0]!.time.kind).toBe("none");
    expect(state.candidate?.adjustments).toEqual(adjustments);
    expect(state.activeTrip).toBe(activeTrip);

    state = tripWorkflowReducer(state, {
      type: "confirmation_started",
      sessionId: "session:adjusted",
    });
    state = tripWorkflowReducer(state, {
      type: "confirmation_committed",
      sessionId: "session:adjusted",
      trip: replacementTrip,
    });
    expect(state.candidate).toBeNull();
  });
});

describe("inactive processing events", () => {
  it.each(["failed", "review_required", "insufficient"] as const)(
    "ignores all late source/provider events after %s",
    (status) => {
      let state = tripWorkflowReducer(
        createInitialTripWorkflowState(activeTrip),
        {
          type: "intake_started",
          sessionId: "old",
          source: validTextSourceInput,
        },
      );
      state = tripWorkflowReducer(state, {
        type: "parse_started",
        sessionId: "old",
        requestId: "old-request",
      });
      state = { ...state, status };
      const events = [
        { type: "source_validated", sessionId: "old" },
        { type: "extraction_completed", sessionId: "old" },
        { type: "parse_started", sessionId: "old", requestId: "late" },
        { type: "processing_stage", sessionId: "old", status: "extracting" },
        { type: "source_prepared", sessionId: "old" },
        {
          type: "interpretation_progress",
          sessionId: "old",
          requestId: "old-request",
          completed: 1,
          total: 2,
        },
        {
          type: "parse_completed",
          sessionId: "old",
          requestId: "old-request",
          interpretation: validDraftInterpretationResult,
        },
        {
          type: "workflow_failed",
          sessionId: "old",
          failure: { code: "late", message: "late", recoverable: true },
        },
      ] as const;
      for (const event of events)
        expect(tripWorkflowReducer(state, event)).toBe(state);
    },
  );
});

describe("session-only interpretation progress", () => {
  function parsingState() {
    let state = tripWorkflowReducer(
      createInitialTripWorkflowState(activeTrip),
      {
        type: "intake_started",
        sessionId: "session:progress",
        source: validTextSourceInput,
      },
    );
    expect(state.candidate?.interpretationProgress).toBeNull();
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:progress",
      requestId: "request:progress",
    });
    return state;
  }
  const progress = {
    type: "interpretation_progress" as const,
    sessionId: "session:progress",
    requestId: "request:progress",
    completed: 0,
    total: 3,
  };

  it("updates completed batches without changing processing stage, source or active trip", () => {
    let state = parsingState();
    const source = state.candidate!.source;
    state = tripWorkflowReducer(state, progress);
    state = tripWorkflowReducer(state, { ...progress, completed: 2 });
    expect(state.status).toBe("parsing");
    expect(state.activeTrip).toBe(activeTrip);
    expect(state.candidate?.source).toBe(source);
    expect(state.candidate?.interpretationProgress).toEqual({
      completed: 2,
      total: 3,
    });
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:new",
      source: validTextSourceInput,
    });
    expect(state.candidate?.interpretationProgress).toBeNull();
    expect(tripWorkflowReducer(state, { ...progress, completed: 3 })).toBe(
      state,
    );
  });

  it.each([
    { completed: -1 },
    { completed: 4 },
    { completed: 0.5 },
    { completed: NaN },
    { total: 0 },
    { total: Infinity },
    { total: Number.MAX_SAFE_INTEGER + 1 },
    { sessionId: "session:old" },
    { requestId: "request:old" },
  ])("rejects invalid or inactive batch counts %j", (patch) => {
    const state = parsingState();
    expect(tripWorkflowReducer(state, { ...progress, ...patch })).toBe(state);
  });

  it("ignores regressing or inconsistent totals and all terminal late progress", () => {
    const state = tripWorkflowReducer(parsingState(), {
      ...progress,
      completed: 2,
    });
    expect(tripWorkflowReducer(state, { ...progress, completed: 1 })).toBe(
      state,
    );
    expect(
      tripWorkflowReducer(state, { ...progress, completed: 2, total: 4 }),
    ).toBe(state);
    const cancelled = tripWorkflowReducer(state, {
      type: "workflow_cancelled",
      sessionId: progress.sessionId,
    });
    expect(tripWorkflowReducer(cancelled, { ...progress, completed: 3 })).toBe(
      cancelled,
    );
    expect(cancelled.activeTrip).toBe(activeTrip);
  });
});
