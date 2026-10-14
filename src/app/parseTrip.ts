import type {
  SemanticInterpretationResult,
  TripFinding,
} from "../domain/trip/types";
import type { UnifiedSourceDocument } from "../domain/source/types";

/** Browser-memory resume state only; never a provider envelope or stored trip. */
export type InterpretationCheckpoint = {
  sourceId: string;
  requestIdentities: readonly string[];
  completed: readonly { index: number; result: SemanticInterpretationResult }[];
};

export type ParseTripRequest = {
  credential: string;
  signal?: AbortSignal;
  onStage?: (stage: InterpretationStage) => void;
  onProgress?: (progress: { completed: number; total: number }) => void;
  checkpoint?: InterpretationCheckpoint;
  onCheckpoint?: (checkpoint: InterpretationCheckpoint) => void;
  source: UnifiedSourceDocument;
  // The identity the source document is supposed to describe. The port
  // re-checks agreement itself: a document paired with the wrong input must
  // not reach a provider just because the caller believed they matched.
  sourceId: string;
};

// Failure vocabulary every ParseTrip implementation reports through an error
// carrying `code`. It keeps the workflow provider-neutral: no adapter-specific
// error class is imported outside its own integration.
//
// Each code names one technical cause, distinct enough that the intake surface
// can give the matching recovery instruction:
//
// - `provider_unreachable` — the request never reached the provider.
// - `provider_rejected`    — the provider answered and refused it (4xx).
// - `provider_unavailable` — the provider answered with its own fault (5xx).
// - `provider_timeout`     — the provider accepted it and never answered.
// - `authentication_failed`— the credential was presented and refused, which
//                            is a different recovery than having none.
// - `draft_not_reviewable` — the pre-Review gate, not a schema failure.
// - `source_document_invalid` — the input never satisfied the source-document
//                            contract, so no request was made at all. It is
//                            deliberately one code: the gate's internal rules
//                            (schema, duplicate identity, ordering, reference,
//                            cycle) share one recovery and their detail would
//                            leak source content or schema paths.
//
// `describeIntakeFailure` maps these onto `IntakeFailureCode`, which names the
// user-facing phase and outcome instead of the technical cause; the two
// vocabularies are deliberately separate and the mapping is exhaustive.
export type ParseTripFailureCode =
  | "aborted"
  | "authentication_failed"
  | "coverage_invalid"
  | "draft_not_reviewable"
  | "invalid_response"
  | "malformed_response"
  | "preflight_limit"
  | "provider_rejected"
  | "provider_timeout"
  | "provider_unavailable"
  | "provider_unreachable"
  | "rate_limited"
  | "source_document_invalid";

export type ParseTrip = (
  request: ParseTripRequest,
) => Promise<SemanticInterpretationResult>;

export type InterpretationStage =
  "source_validation" | "interpreting" | "output_validation";

export class ParseTripError extends Error {
  constructor(
    readonly code: ParseTripFailureCode,
    message: string,
    readonly findings: TripFinding[] = [],
  ) {
    super(message);
    this.name = "ParseTripError";
  }
}
