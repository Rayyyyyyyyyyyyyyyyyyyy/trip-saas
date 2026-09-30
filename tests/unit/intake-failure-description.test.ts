import { describe, expect, it } from "vitest";

import {
  describeConfirmationFailure,
  describeIntakeFailure,
} from "../../src/app/describeIntakeFailure";
import type { ParseTripFailureCode } from "../../src/app/parseTrip";
import type { IntakeFailureCode } from "../../src/features/import/intakeFailure";
import { ReviewConfirmationError } from "../../src/features/review/confirmReviewedTrip";
import {
  createIntakeFailure,
  IntakeFailureError,
  type IntakeFailure,
} from "../../src/features/import/intakeFailure";
import { GeminiParseError } from "../../src/integrations/gemini/geminiTripParser";

describe("intake failure description", () => {
  it.each<[ParseTripFailureCode, IntakeFailureCode]>([
    ["aborted", "cancelled"],
    ["authentication_failed", "credential_rejected"],
    ["draft_not_reviewable", "draft_not_reviewable"],
    ["invalid_response", "response_invalid"],
    ["malformed_response", "response_unreadable"],
    ["preflight_limit", "request_too_large"],
    ["provider_unreachable", "provider_unreachable"],
    ["provider_rejected", "provider_rejected"],
    ["provider_timeout", "provider_timed_out"],
    ["provider_unavailable", "provider_unavailable"],
    ["rate_limited", "provider_rate_limited"],
  ])("maps the %s port failure to the %s descriptor", (code, expected) => {
    expect(describeIntakeFailure(new GeminiParseError(code, "raw"))).toEqual(
      createIntakeFailure(expected),
    );
  });

  it("separates a refused credential from a missing one", () => {
    const refused = describeIntakeFailure(
      new GeminiParseError("authentication_failed", "raw"),
    );
    expect(refused.code).toBe("credential_rejected");
    expect(refused.message).not.toEqual(
      createIntakeFailure("credential_unavailable").message,
    );
  });

  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "does not accept the inherited key %s as a failure code",
    (code) => {
      expect(describeIntakeFailure({ code })).toEqual(
        createIntakeFailure("unknown"),
      );
    },
  );

  it("never interpolates a thrown message", () => {
    const leak = "AIzaSy-not-a-real-key and 09/10 11:55 private note";
    const cases: Array<[IntakeFailure, IntakeFailureCode]> = [
      [describeIntakeFailure(new Error(leak)), "unknown"],
      [describeIntakeFailure({ code: "not_a_code", message: leak }), "unknown"],
      // An unrecognized confirmation failure stays in the confirmation phase
      // instead of borrowing the reading-phase wording.
      [describeConfirmationFailure(new Error(leak)), "confirmation_incomplete"],
    ];
    for (const [failure, expected] of cases) {
      expect(failure).toEqual(createIntakeFailure(expected));
      expect(failure.message).not.toContain(leak);
    }
  });

  it("passes an already-bounded descriptor through unchanged", () => {
    const failure = createIntakeFailure("source_too_large");
    expect(describeIntakeFailure(new IntakeFailureError(failure))).toEqual(
      failure,
    );
  });

  it("reads only the documented code from a confirmation failure", () => {
    expect(
      describeConfirmationFailure(
        new ReviewConfirmationError("persistence_failed", "raw internals"),
      ),
    ).toEqual(createIntakeFailure("confirmation_persistence_failed"));
    expect(
      describeConfirmationFailure(
        new ReviewConfirmationError("candidate_invalid", "raw internals"),
      ),
    ).toEqual(createIntakeFailure("confirmation_candidate_invalid"));
  });
});
