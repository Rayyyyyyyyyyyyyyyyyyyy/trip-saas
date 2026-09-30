import { describe, expect, it, vi } from "vitest";

import {
  confirmReviewedTrip,
  ReviewConfirmationError,
} from "../../src/features/review/confirmReviewedTrip";
import type { ConfirmedTripRepository } from "../../src/persistence/confirmedTripRepository";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

function repository(
  replaceActive: ConfirmedTripRepository["replaceActive"] = vi.fn(),
): ConfirmedTripRepository {
  return {
    clear: vi.fn(),
    loadActive: vi.fn(async () => ({ status: "empty" as const })),
    replaceActive: vi.fn(replaceActive),
  };
}

describe("review confirmation transaction", () => {
  it("validates and returns the same trip only after persistence commits", async () => {
    let committed = false;
    const store = repository(async () => {
      await Promise.resolve();
      committed = true;
    });

    const trip = await confirmReviewedTrip(validParsedTripDraft, store);

    expect(committed).toBe(true);
    expect(trip).toMatchObject({
      id: validParsedTripDraft.trip.id,
      title: validParsedTripDraft.trip.title,
    });
    expect(store.replaceActive).toHaveBeenCalledWith(trip);
  });

  it("confirms supported unknown trip and Day dates without inventing values", async () => {
    const unknownDates = structuredClone(validParsedTripDraft);
    unknownDates.trip.start_date = null;
    unknownDates.trip.end_date = null;
    unknownDates.days[0].date = null;
    unknownDates.days[0].label = "D1 · 0625";
    const store = repository();

    const trip = await confirmReviewedTrip(unknownDates, store);

    expect(trip).toMatchObject({ start_date: null, end_date: null });
    expect(trip.days[0]).toMatchObject({ date: null, label: "D1 · 0625" });
    expect(store.replaceActive).toHaveBeenCalledWith(trip);
  });

  it("blocks malformed known time semantics before persistence", async () => {
    const invalid = structuredClone(validParsedTripDraft);
    invalid.entities[0].time.kind = "exact";
    invalid.entities[0].time.start = null;
    const store = repository();

    await expect(confirmReviewedTrip(invalid, store)).rejects.toMatchObject({
      code: "candidate_invalid",
      findings: expect.arrayContaining([
        expect.objectContaining({ code: "TIME_SHAPE_INVALID" }),
      ]),
    } satisfies Partial<ReviewConfirmationError>);
    expect(store.replaceActive).not.toHaveBeenCalled();
  });

  it("reports rollback without claiming the candidate is active", async () => {
    const store = repository(async () => {
      throw new Error("transaction aborted");
    });

    await expect(
      confirmReviewedTrip(validParsedTripDraft, store),
    ).rejects.toMatchObject({
      code: "persistence_failed",
    } satisfies Partial<ReviewConfirmationError>);
  });
});
