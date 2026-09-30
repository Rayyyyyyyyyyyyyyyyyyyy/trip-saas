import { describe, expect, it, vi } from "vitest";

import { loadTripStartup } from "../../src/app/tripStartup";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type {
  ActiveTripLoadResult,
  ConfirmedTripRepository,
} from "../../src/persistence/confirmedTripRepository";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);

function repositoryWith(
  loadActive: ConfirmedTripRepository["loadActive"],
): ConfirmedTripRepository {
  return {
    clear: vi.fn(async () => undefined),
    loadActive,
    replaceActive: vi.fn(async () => undefined),
  };
}

function repositoryReturning(result: ActiveTripLoadResult) {
  return repositoryWith(vi.fn(async () => result));
}

describe("trip startup", () => {
  it("opens Home on a clean start", async () => {
    const result = await loadTripStartup(
      repositoryReturning({ status: "empty" }),
    );

    expect(result).toEqual({ kind: "home", recovery: null });
  });

  it("opens Viewer only for a validated active trip", async () => {
    const result = await loadTripStartup(
      repositoryReturning({ status: "ready", trip: activeTrip }),
    );

    expect(result).toEqual({ kind: "viewer", trip: activeTrip });
  });

  it("routes invalid or unavailable storage to Home recovery", async () => {
    await expect(
      loadTripStartup(
        repositoryReturning({
          status: "invalid",
          reason: "active_record_invalid",
        }),
      ),
    ).resolves.toEqual({
      kind: "home",
      recovery: "active_record_invalid",
    });

    await expect(
      loadTripStartup(
        repositoryWith(
          vi.fn(async (): Promise<ActiveTripLoadResult> => {
            throw new Error("IndexedDB unavailable");
          }),
        ),
      ),
    ).resolves.toEqual({ kind: "home", recovery: "storage_unavailable" });
  });
});
