import { deriveReviewSessionFindings } from "./reviewCandidate";
import type { ReviewFindingContext } from "./reviewPreservation";
import type { SemanticInterpretationResult } from "../../domain/trip/types";
import {
  buildCanonicalTrip,
  validateCanonicalTripAuthoritatively,
} from "../../domain/trip/buildCanonicalTrip";
import type {
  CanonicalTrip,
  ParsedTripDraft,
  TripFinding,
} from "../../domain/trip/types";
import type { ConfirmedTripRepository } from "../../persistence/confirmedTripRepository";

export type ReviewConfirmationFailureCode =
  "candidate_invalid" | "persistence_failed";

export class ReviewConfirmationError extends Error {
  constructor(
    readonly code: ReviewConfirmationFailureCode,
    message: string,
    readonly findings: TripFinding[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ReviewConfirmationError";
  }
}

export async function confirmReviewedTrip(
  draft: ParsedTripDraft,
  repository: ConfirmedTripRepository,
  context: {
    sourceId?: string | null;
    review?: ReviewFindingContext & {
      interpretation: SemanticInterpretationResult;
    };
  } = {},
): Promise<CanonicalTrip> {
  if (context.review) {
    const findings = deriveReviewSessionFindings(
      draft,
      context.review.interpretation,
      context.review.evidence,
      context.review.corrections,
    );
    if (findings.some((finding) => finding.blocking))
      throw new ReviewConfirmationError(
        "candidate_invalid",
        "行程還有需要修正的來源問題，尚未儲存。",
        findings,
      );
  }
  let trip: CanonicalTrip;
  try {
    trip = buildCanonicalTrip(draft, context);
  } catch (cause) {
    throw new ReviewConfirmationError(
      "candidate_invalid",
      "這份候選內容目前還無法建立 CanonicalTrip。",
      [],
      { cause },
    );
  }

  const validation = validateCanonicalTripAuthoritatively(trip);
  if (!validation.valid) {
    throw new ReviewConfirmationError(
      "candidate_invalid",
      "行程未通過確認前的完整檢查。請回到校對頁修正。",
      validation.findings,
    );
  }

  try {
    await repository.replaceActive(trip);
  } catch (cause) {
    throw new ReviewConfirmationError(
      "persistence_failed",
      "行程尚未安全儲存，原本的行程仍然保留。",
      [],
      { cause },
    );
  }

  return trip;
}
