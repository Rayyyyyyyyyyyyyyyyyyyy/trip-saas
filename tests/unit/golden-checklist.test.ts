import { describe, expect, it, vi } from "vitest";
import {
  GOLDEN_CHECKLIST_STORAGE_KEY,
  GOLDEN_TRIP_ID,
  loadGoldenTodos,
  selectGoldenReservationRows,
  toggleGoldenTodo,
} from "../../src/features/golden/checklist";
import { checklistStorageKey } from "../../src/persistence/checklistRepository";
import { initialTodos } from "../../src/tripData";

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

describe("Golden checklist ownership", () => {
  it("falls back safely when legacy storage is missing or invalid", () => {
    expect(loadGoldenTodos({ getItem: () => null })).toBe(initialTodos);
    expect(loadGoldenTodos({ getItem: () => "not-json" })).toBe(initialTodos);
  });

  it("persists toggles under the legacy compatibility key", () => {
    const storage = { setItem: vi.fn() };
    const next = toggleGoldenTodo(initialTodos, "usj-ticket", storage);

    expect(next.find((todo) => todo.id === "usj-ticket")!.done).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      GOLDEN_CHECKLIST_STORAGE_KEY,
      JSON.stringify(next),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      checklistStorageKey(GOLDEN_TRIP_ID),
      expect.stringContaining('"usj-ticket":true'),
    );
  });

  it("migrates legacy Osaka state into the trip-scoped record", () => {
    const storage = new MemoryStorage();
    const legacy = initialTodos.map((todo) =>
      todo.id === "usj-ticket" ? { ...todo, done: true } : todo,
    );
    storage.setItem(GOLDEN_CHECKLIST_STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadGoldenTodos(storage);
    const scoped = JSON.parse(
      storage.getItem(checklistStorageKey(GOLDEN_TRIP_ID)) ?? "{}",
    ) as { items?: Record<string, boolean> };

    expect(loaded.find((todo) => todo.id === "usj-ticket")?.done).toBe(true);
    expect(scoped.items?.["usj-ticket"]).toBe(true);
  });

  it("treats scoped state as current and synchronizes the legacy key", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      checklistStorageKey(GOLDEN_TRIP_ID),
      JSON.stringify({
        items: { "usj-ticket": true },
        repositoryVersion: 1,
        tripId: GOLDEN_TRIP_ID,
      }),
    );
    storage.setItem(GOLDEN_CHECKLIST_STORAGE_KEY, JSON.stringify(initialTodos));

    const loaded = loadGoldenTodos(storage);
    const synchronizedLegacy = JSON.parse(
      storage.getItem(GOLDEN_CHECKLIST_STORAGE_KEY) ?? "[]",
    ) as typeof initialTodos;

    expect(loaded.find((todo) => todo.id === "usj-ticket")?.done).toBe(true);
    expect(
      synchronizedLegacy.find((todo) => todo.id === "usj-ticket")?.done,
    ).toBe(true);
  });

  it("derives reservation readiness from the same todo state", () => {
    const pending = selectGoldenReservationRows(initialTodos).find(
      (row) => row.todoId === "usj-ticket",
    );
    const checkedTodos = initialTodos.map((todo) =>
      todo.id === "usj-ticket" ? { ...todo, done: true } : todo,
    );
    const ready = selectGoldenReservationRows(checkedTodos).find(
      (row) => row.todoId === "usj-ticket",
    );

    expect(pending).toMatchObject({ done: false, status: "Action needed" });
    expect(ready).toMatchObject({ done: true, status: "Ticket ready" });
  });
});
