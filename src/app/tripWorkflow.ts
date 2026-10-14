import type { ReviewCorrection } from "../features/review/reviewPreservation";
import type {
  CanonicalTrip,
  ParsedTripDraft,
  SemanticInterpretationResult,
  TextSourceInput,
  TripFinding,
} from "../domain/trip/types";
import type { ValidatedUnifiedSourceDocument } from "../domain/source/types";
import type { ReviewAdjustment } from "../features/review/reviewAdjustment";

// Intake metadata stays in the application session; spreadsheet sources are
// not fabricated Markdown inputs and no source content reaches persistence.
export type IntakeSourceInput =
  | TextSourceInput
  | {
      source_id: string;
      display_name: string;
      input_mode: "spreadsheet_file" | "csv_file";
    };

export type TripWorkflowStatus =
  | "idle"
  | "reading"
  | "loading_credential"
  | "prepared"
  | "validating_source"
  | "extracting"
  | "parsing"
  | "validating_draft"
  | "insufficient"
  | "review_required"
  | "confirming"
  | "confirmed"
  | "failed"
  | "cancelled";

// The stage an intake attempt stopped at. The app workflow owns this
// vocabulary; features that render a failure consume it rather than define it.
export type TripWorkflowFailurePhase =
  | "reading"
  | "extraction"
  | "provider_request"
  | "response_validation"
  | "pre_review_validation"
  | "confirmation"
  | "unknown";

export type TripWorkflowFailure = {
  code: string;
  message: string;
  phase?: TripWorkflowFailurePhase;
  recoverable: boolean;
};

export type TripCandidateSession = {
  corrections: ReviewCorrection[];
  adjustments: ReviewAdjustment[];
  document: ValidatedUnifiedSourceDocument | null;
  draft: ParsedTripDraft | null;
  findings: TripFinding[];
  interpretation: SemanticInterpretationResult | null;
  interpretationProgress: { completed: number; total: number } | null;
  requestId: string | null;
  sessionId: string;
  source: IntakeSourceInput | null;
};

export type TripWorkflowState = {
  activeTrip: CanonicalTrip | null;
  candidate: TripCandidateSession | null;
  failure: TripWorkflowFailure | null;
  lastConfirmedTripId: string | null;
  status: TripWorkflowStatus;
};

export type TripWorkflowEvent =
  | { type: "active_trip_loaded"; trip: CanonicalTrip | null }
  | {
      type: "intake_started";
      sessionId: string;
      source: IntakeSourceInput | null;
    }
  | {
      type: "processing_stage";
      sessionId: string;
      status:
        | "reading"
        | "extracting"
        | "validating_source"
        | "loading_credential"
        | "parsing"
        | "validating_draft";
    }
  | { type: "source_read"; sessionId: string; source: IntakeSourceInput }
  | { type: "source_prepared"; sessionId: string }
  | { type: "source_validated"; sessionId: string }
  | {
      type: "extraction_completed";
      sessionId: string;
      document?: ValidatedUnifiedSourceDocument;
    }
  | { type: "parse_started"; sessionId: string; requestId: string }
  | {
      type: "interpretation_progress";
      sessionId: string;
      requestId: string;
      completed: number;
      total: number;
    }
  | {
      type: "parse_completed";
      sessionId: string;
      requestId: string;
      interpretation: SemanticInterpretationResult;
    }
  | {
      type: "review_ready";
      sessionId: string;
      requestId: string;
      draft: ParsedTripDraft;
      findings: TripFinding[];
      adjustments: ReviewAdjustment[];
    }
  | {
      type: "interpretation_insufficient";
      sessionId: string;
      requestId: string;
      interpretation: SemanticInterpretationResult;
    }
  | {
      type: "review_draft_changed";
      corrections?: ReviewCorrection[];
      sessionId: string;
      draft: ParsedTripDraft;
      findings: TripFinding[];
    }
  | { type: "confirmation_started"; sessionId: string }
  | {
      type: "confirmation_committed";
      sessionId: string;
      trip: CanonicalTrip;
    }
  | {
      type: "workflow_failed";
      sessionId: string;
      requestId?: string;
      failure: TripWorkflowFailure;
    }
  | { type: "workflow_cancelled"; sessionId: string }
  | { type: "workflow_surface_closed"; sessionId: string }
  | { type: "workflow_acknowledged" };

export function createInitialTripWorkflowState(
  activeTrip: CanonicalTrip | null = null,
): TripWorkflowState {
  return {
    activeTrip,
    candidate: null,
    failure: null,
    lastConfirmedTripId: null,
    status: "idle",
  };
}

function isProcessing(state: TripWorkflowState) {
  return [
    "reading",
    "extracting",
    "validating_source",
    "loading_credential",
    "parsing",
    "validating_draft",
  ].includes(state.status);
}

function hasCurrentSession(
  state: TripWorkflowState,
  event: { sessionId: string },
) {
  return state.candidate?.sessionId === event.sessionId;
}

function hasCurrentRequest(
  state: TripWorkflowState,
  event: { sessionId: string; requestId: string },
) {
  return (
    hasCurrentSession(state, event) &&
    isProcessing(state) &&
    state.candidate?.requestId === event.requestId
  );
}

export function tripWorkflowReducer(
  state: TripWorkflowState,
  event: TripWorkflowEvent,
): TripWorkflowState {
  switch (event.type) {
    case "active_trip_loaded":
      return { ...state, activeTrip: event.trip };

    case "intake_started":
      return {
        ...state,
        candidate: {
          corrections: [],
          adjustments: [],
          document: null,
          draft: null,
          findings: [],
          interpretation: null,
          interpretationProgress: null,
          requestId: null,
          sessionId: event.sessionId,
          source: event.source,
        },
        failure: null,
        lastConfirmedTripId: null,
        status: event.source ? "validating_source" : "reading",
      };

    case "processing_stage":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? { ...state, status: event.status }
        : state;

    case "source_read":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? { ...state, candidate: { ...state.candidate!, source: event.source } }
        : state;

    case "source_prepared":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? { ...state, status: "prepared" }
        : state;

    case "source_validated":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? { ...state, status: "extracting" }
        : state;

    case "extraction_completed":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              document: event.document ?? state.candidate!.document,
            },
            status: "parsing",
          }
        : state;

    case "parse_started":
      return hasCurrentSession(state, event) && isProcessing(state)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              requestId: event.requestId,
              interpretationProgress: null,
            },
            status: "parsing",
          }
        : state;

    case "interpretation_progress": {
      const previous = state.candidate?.interpretationProgress;
      if (
        !hasCurrentRequest(state, event) ||
        !Number.isSafeInteger(event.total) ||
        !Number.isSafeInteger(event.completed) ||
        event.total <= 0 ||
        event.completed < 0 ||
        event.completed > event.total ||
        (previous !== null &&
          previous !== undefined &&
          (previous.total !== event.total ||
            previous.completed > event.completed))
      )
        return state;
      return {
        ...state,
        candidate: {
          ...state.candidate!,
          interpretationProgress: {
            completed: event.completed,
            total: event.total,
          },
        },
      };
    }

    case "parse_completed":
      return hasCurrentRequest(state, event)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              interpretation: event.interpretation,
            },
            status: "validating_draft",
          }
        : state;

    case "review_ready":
      return hasCurrentRequest(state, event)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              adjustments: structuredClone(event.adjustments),
              draft: event.draft,
              findings: structuredClone(event.findings),
            },
            status: "review_required",
          }
        : state;

    case "interpretation_insufficient":
      return hasCurrentRequest(state, event)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              draft: null,
              findings: structuredClone(event.interpretation.findings),
              interpretation: event.interpretation,
            },
            status: "insufficient",
          }
        : state;

    case "review_draft_changed":
      return hasCurrentSession(state, event) &&
        ["review_required", "failed"].includes(state.status)
        ? {
            ...state,
            candidate: {
              ...state.candidate!,
              draft: event.draft,
              corrections: structuredClone(
                event.corrections ?? state.candidate!.corrections,
              ),
              findings: structuredClone(event.findings),
            },
          }
        : state;

    case "confirmation_started":
      return hasCurrentSession(state, event) &&
        ["review_required", "failed"].includes(state.status)
        ? { ...state, failure: null, status: "confirming" }
        : state;

    case "confirmation_committed":
      return hasCurrentSession(state, event) && state.status === "confirming"
        ? {
            ...state,
            activeTrip: event.trip,
            candidate: null,
            failure: null,
            lastConfirmedTripId: event.trip.id,
            status: "confirmed",
          }
        : state;

    case "workflow_failed":
      if (
        !hasCurrentSession(state, event) ||
        !(isProcessing(state) || state.status === "confirming")
      )
        return state;
      if (
        event.requestId !== undefined &&
        state.candidate?.requestId !== event.requestId
      ) {
        return state;
      }
      return { ...state, failure: event.failure, status: "failed" };

    case "workflow_cancelled":
      return hasCurrentSession(state, event)
        ? {
            ...state,
            candidate: null,
            failure: null,
            status: "cancelled",
          }
        : state;

    case "workflow_surface_closed":
      return state;

    case "workflow_acknowledged":
      return state.candidate === null
        ? {
            ...state,
            failure: null,
            lastConfirmedTripId: null,
            status: "idle",
          }
        : state;
  }
}
