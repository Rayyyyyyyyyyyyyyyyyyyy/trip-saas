import type { CanonicalTrip } from "../domain/trip/types";
import type { ConfirmedTripRepository } from "../persistence/confirmedTripRepository";

export type TripStartupResult =
  | { kind: "home"; recovery: null }
  | {
      kind: "home";
      recovery:
        | "active_pointer_invalid"
        | "active_record_invalid"
        | "active_record_missing"
        | "storage_unavailable";
    }
  | { kind: "viewer"; trip: CanonicalTrip };

export async function loadTripStartup(
  repository: ConfirmedTripRepository,
): Promise<TripStartupResult> {
  try {
    const result = await repository.loadActive();
    if (result.status === "ready") {
      return { kind: "viewer", trip: result.trip };
    }
    if (result.status === "invalid") {
      return { kind: "home", recovery: result.reason };
    }
    return { kind: "home", recovery: null };
  } catch {
    return { kind: "home", recovery: "storage_unavailable" };
  }
}
