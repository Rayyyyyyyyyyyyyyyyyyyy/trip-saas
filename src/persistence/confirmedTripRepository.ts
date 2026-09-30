import { validateCanonicalTripAuthoritatively } from "../domain/trip/buildCanonicalTrip";
import { decodeCanonicalTrip } from "../domain/trip/decodeCanonicalTrip";
import type { CanonicalTrip } from "../domain/trip/types";

export const CONFIRMED_TRIP_DATABASE_VERSION = 1;
export const DEFAULT_CONFIRMED_TRIP_DATABASE_NAME =
  "trip-runtime-confirmed-trip";

const TRIPS_STORE = "trips";
const METADATA_STORE = "metadata";
const ACTIVE_TRIP_KEY = "active-trip";

type StoredTripRecord = {
  id: string;
  repositoryVersion: 1;
  savedAt: string;
  trip: unknown;
};

type ActiveTripPointer = {
  key: typeof ACTIVE_TRIP_KEY;
  repositoryVersion: 1;
  tripId: string;
};

export type ActiveTripLoadResult =
  | { status: "empty" }
  | { status: "ready"; trip: CanonicalTrip }
  | {
      status: "invalid";
      reason:
        | "active_pointer_invalid"
        | "active_record_invalid"
        | "active_record_missing";
    };

export type ConfirmedTripRepository = {
  clear(): Promise<void>;
  loadActive(): Promise<ActiveTripLoadResult>;
  replaceActive(trip: CanonicalTrip): Promise<void>;
};

export type ConfirmedTripRepositoryOptions = {
  databaseName?: string;
  indexedDB?: IDBFactory;
  now?: () => Date;
};

export class ConfirmedTripRepositoryError extends Error {
  constructor(
    readonly code: "unavailable" | "open_failed" | "write_failed",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ConfirmedTripRepositoryError";
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true },
    );
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction aborted."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActiveTripPointer(value: unknown): value is ActiveTripPointer {
  return (
    isRecord(value) &&
    value.key === ACTIVE_TRIP_KEY &&
    value.repositoryVersion === CONFIRMED_TRIP_DATABASE_VERSION &&
    typeof value.tripId === "string" &&
    value.tripId.length > 0
  );
}

function isStoredTripRecord(value: unknown): value is StoredTripRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.repositoryVersion === CONFIRMED_TRIP_DATABASE_VERSION &&
    typeof value.savedAt === "string" &&
    "trip" in value
  );
}

function openDatabase(
  indexedDB: IDBFactory | undefined,
  databaseName: string,
): Promise<IDBDatabase> {
  if (!indexedDB) {
    return Promise.reject(
      new ConfirmedTripRepositoryError(
        "unavailable",
        "Confirmed trip storage is unavailable in this browser.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(databaseName, CONFIRMED_TRIP_DATABASE_VERSION);
    } catch (error) {
      reject(
        new ConfirmedTripRepositoryError(
          "open_failed",
          "Confirmed trip storage could not be opened.",
          { cause: error },
        ),
      );
      return;
    }

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TRIPS_STORE)) {
        database.createObjectStore(TRIPS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: "key" });
      }
    });
    request.addEventListener(
      "success",
      () => {
        request.result.addEventListener("versionchange", () => {
          request.result.close();
        });
        resolve(request.result);
      },
      { once: true },
    );
    request.addEventListener(
      "error",
      () =>
        reject(
          new ConfirmedTripRepositoryError(
            "open_failed",
            "Confirmed trip storage could not be opened.",
            { cause: request.error },
          ),
        ),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () =>
        reject(
          new ConfirmedTripRepositoryError(
            "open_failed",
            "Confirmed trip storage upgrade is blocked by another tab.",
          ),
        ),
      { once: true },
    );
  });
}

export function createConfirmedTripRepository(
  options: ConfirmedTripRepositoryOptions = {},
): ConfirmedTripRepository {
  const databaseName =
    options.databaseName ?? DEFAULT_CONFIRMED_TRIP_DATABASE_NAME;
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  const now = options.now ?? (() => new Date());

  return {
    async clear() {
      const database = await openDatabase(indexedDB, databaseName);
      try {
        const transaction = database.transaction(
          [TRIPS_STORE, METADATA_STORE],
          "readwrite",
        );
        transaction.objectStore(TRIPS_STORE).clear();
        transaction.objectStore(METADATA_STORE).clear();
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },

    async loadActive() {
      const database = await openDatabase(indexedDB, databaseName);
      try {
        const pointerTransaction = database.transaction(
          METADATA_STORE,
          "readonly",
        );
        const pointer = await requestResult(
          pointerTransaction.objectStore(METADATA_STORE).get(ACTIVE_TRIP_KEY),
        );
        await transactionComplete(pointerTransaction);

        if (pointer === undefined) return { status: "empty" };
        if (!isActiveTripPointer(pointer)) {
          return { status: "invalid", reason: "active_pointer_invalid" };
        }

        const tripTransaction = database.transaction(TRIPS_STORE, "readonly");
        const storedTrip = await requestResult(
          tripTransaction.objectStore(TRIPS_STORE).get(pointer.tripId),
        );
        await transactionComplete(tripTransaction);

        if (storedTrip === undefined) {
          return { status: "invalid", reason: "active_record_missing" };
        }
        const decoded = isStoredTripRecord(storedTrip)
          ? decodeCanonicalTrip(storedTrip.trip)
          : { valid: false as const };
        if (
          !isStoredTripRecord(storedTrip) ||
          storedTrip.id !== pointer.tripId ||
          !decoded.valid ||
          !validateCanonicalTripAuthoritatively(decoded.trip).valid
        ) {
          return { status: "invalid", reason: "active_record_invalid" };
        }

        return { status: "ready", trip: structuredClone(decoded.trip) };
      } finally {
        database.close();
      }
    },

    async replaceActive(trip) {
      if (!validateCanonicalTripAuthoritatively(trip).valid) {
        throw new ConfirmedTripRepositoryError(
          "write_failed",
          "Only an authoritatively valid CanonicalTrip can become active.",
        );
      }

      let storedTrip: StoredTripRecord;
      try {
        storedTrip = {
          id: trip.id,
          repositoryVersion: CONFIRMED_TRIP_DATABASE_VERSION,
          savedAt: now().toISOString(),
          trip: structuredClone(trip),
        };
      } catch (error) {
        throw new ConfirmedTripRepositoryError(
          "write_failed",
          "Confirmed trip data could not be prepared for storage.",
          { cause: error },
        );
      }

      const database = await openDatabase(indexedDB, databaseName);
      try {
        const transaction = database.transaction(
          [TRIPS_STORE, METADATA_STORE],
          "readwrite",
        );
        const trips = transaction.objectStore(TRIPS_STORE);
        const metadata = transaction.objectStore(METADATA_STORE);

        trips.clear();
        trips.put(storedTrip);
        metadata.put({
          key: ACTIVE_TRIP_KEY,
          repositoryVersion: CONFIRMED_TRIP_DATABASE_VERSION,
          tripId: storedTrip.id,
        } satisfies ActiveTripPointer);

        try {
          await transactionComplete(transaction);
        } catch (error) {
          throw new ConfirmedTripRepositoryError(
            "write_failed",
            "Confirmed trip replacement did not commit.",
            { cause: error },
          );
        }
      } finally {
        database.close();
      }
    },
  };
}
