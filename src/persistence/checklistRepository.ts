export const CHECKLIST_REPOSITORY_VERSION = 1;
export const CHECKLIST_STORAGE_PREFIX = "trip-runtime-checklist:";

export type ChecklistState = Record<string, boolean>;

type ChecklistRecord = {
  items: ChecklistState;
  repositoryVersion: 1;
  tripId: string;
};

export type ChecklistLoadResult =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "ready"; items: ChecklistState };

export type ChecklistRepository = {
  clearAllTripState(): Promise<void>;
  clearTripState(tripId: string): void;
  loadState(tripId: string): ChecklistLoadResult;
  saveState(tripId: string, items: ChecklistState): void;
};

export type ChecklistStorage = Pick<
  Storage,
  "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

export function checklistStorageKey(tripId: string) {
  return `${CHECKLIST_STORAGE_PREFIX}${encodeURIComponent(tripId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChecklistState(value: unknown): value is ChecklistState {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "boolean")
  );
}

function parseChecklistRecord(
  serialized: string,
  tripId: string,
): ChecklistRecord | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.repositoryVersion !== CHECKLIST_REPOSITORY_VERSION ||
      value.tripId !== tripId ||
      !isChecklistState(value.items)
    ) {
      return null;
    }
    return value as ChecklistRecord;
  } catch {
    return null;
  }
}

export function createChecklistRepository(
  storage: ChecklistStorage,
  options: { compatibilityKeysByTripId?: Record<string, string[]> } = {},
): ChecklistRepository {
  const compatibilityKeysByTripId = options.compatibilityKeysByTripId ?? {};

  return {
    loadState(tripId) {
      const serialized = storage.getItem(checklistStorageKey(tripId));
      if (serialized === null) return { status: "empty" };
      const record = parseChecklistRecord(serialized, tripId);
      return record
        ? { status: "ready", items: structuredClone(record.items) }
        : { status: "invalid" };
    },

    saveState(tripId, items) {
      if (!isChecklistState(items)) {
        throw new TypeError("Checklist state must map stable IDs to booleans.");
      }
      storage.setItem(
        checklistStorageKey(tripId),
        JSON.stringify({
          items,
          repositoryVersion: CHECKLIST_REPOSITORY_VERSION,
          tripId,
        } satisfies ChecklistRecord),
      );
    },

    clearTripState(tripId) {
      storage.removeItem(checklistStorageKey(tripId));
      for (const key of compatibilityKeysByTripId[tripId] ?? []) {
        storage.removeItem(key);
      }
    },

    async clearAllTripState() {
      const keys = new Set<string>();
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(CHECKLIST_STORAGE_PREFIX)) keys.add(key);
      }
      for (const compatibilityKeys of Object.values(
        compatibilityKeysByTripId,
      )) {
        for (const key of compatibilityKeys) keys.add(key);
      }
      for (const key of keys) storage.removeItem(key);
    },
  };
}
