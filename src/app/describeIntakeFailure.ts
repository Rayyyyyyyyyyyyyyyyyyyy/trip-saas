import {
  toIntakeFailure,
  type IntakeFailure,
  type IntakeFailureCode,
} from "../features/import/intakeFailure";
import type { ReviewConfirmationFailureCode } from "../features/review/confirmReviewedTrip";
import type { ParseTripFailureCode } from "./parseTrip";

const parseFailureCodes: Record<ParseTripFailureCode, IntakeFailureCode> = {
  aborted: "cancelled",
  authentication_failed: "credential_rejected",
  coverage_invalid: "response_coverage_invalid",
  draft_not_reviewable: "draft_not_reviewable",
  invalid_response: "response_invalid",
  malformed_response: "response_unreadable",
  preflight_limit: "request_too_large",
  provider_rejected: "provider_rejected",
  provider_timeout: "provider_timed_out",
  provider_unavailable: "provider_unavailable",
  provider_unreachable: "provider_unreachable",
  rate_limited: "provider_rate_limited",
  source_document_invalid: "source_document_invalid",
};

const confirmationFailureCodes: Record<
  ReviewConfirmationFailureCode,
  IntakeFailureCode
> = {
  candidate_invalid: "confirmation_candidate_invalid",
  persistence_failed: "confirmation_persistence_failed",
};

/**
 * Reads only the documented `code` off a thrown value and resolves it against
 * one fixed vocabulary. `Object.hasOwn` keeps the lookup bounded: a plain `in`
 * check would also accept inherited keys such as `constructor` or `toString`
 * and read a function where a fixed descriptor is required.
 */
function describedCode<Code extends string>(
  cause: unknown,
  vocabulary: Record<Code, IntakeFailureCode>,
): IntakeFailureCode | null {
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? (cause as { code?: unknown }).code
      : null;
  return typeof code === "string" && Object.hasOwn(vocabulary, code)
    ? vocabulary[code as Code]
    : null;
}

/**
 * Translates an interpretation failure into the bounded descriptor the intake
 * surface renders. Only the port's documented `code` is read, so an arbitrary
 * thrown message, provider envelope, or credential never reaches presentation.
 */
export function describeIntakeFailure(cause: unknown): IntakeFailure {
  return toIntakeFailure(
    cause,
    describedCode(cause, parseFailureCodes) ?? "unknown",
  );
}

/**
 * The confirmation counterpart. `ReviewConfirmationError` already carries safe
 * copy, but reading its `message` would also render whatever an unrelated
 * thrown value happens to say, so only its `code` is trusted.
 */
export function describeConfirmationFailure(cause: unknown): IntakeFailure {
  return toIntakeFailure(
    cause,
    describedCode(cause, confirmationFailureCodes) ?? "confirmation_incomplete",
  );
}
