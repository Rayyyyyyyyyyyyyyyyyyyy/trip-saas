import { describe, expect, it } from "vitest";

import {
  checklistStorageKey,
  createChecklistRepository,
} from "../../src/persistence/checklistRepository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("trip-scoped checklist repository", () => {
  it("isolates state by trip ID and validates stored records", () => {
    const storage = new MemoryStorage();
    const repository = createChecklistRepository(storage);

    repository.saveState("trip:a", { hotel: true });
    repository.saveState("trip:b", { ticket: false });

    expect(repository.loadState("trip:a")).toEqual({
      status: "ready",
      items: { hotel: true },
    });
    expect(repository.loadState("trip:b")).toEqual({
      status: "ready",
      items: { ticket: false },
    });
    storage.setItem(checklistStorageKey("trip:a"), "not-json");
    expect(repository.loadState("trip:a")).toEqual({ status: "invalid" });
  });

  it("clears scoped and declared compatibility keys without unrelated data", async () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "keep");
    storage.setItem("legacy-osaka", "legacy");
    const repository = createChecklistRepository(storage, {
      compatibilityKeysByTripId: { osaka: ["legacy-osaka"] },
    });
    repository.saveState("osaka", { hotel: true });
    repository.saveState("other", { ticket: false });

    await repository.clearAllTripState();

    expect(storage.getItem("legacy-osaka")).toBeNull();
    expect(storage.getItem(checklistStorageKey("osaka"))).toBeNull();
    expect(storage.getItem(checklistStorageKey("other"))).toBeNull();
    expect(storage.getItem("unrelated")).toBe("keep");
  });
});
