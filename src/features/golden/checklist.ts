import { initialTodos, reservations } from "../../tripData";
import type { GoldenTodo } from "../../tripData";
import {
  checklistStorageKey,
  CHECKLIST_REPOSITORY_VERSION,
  createChecklistRepository,
} from "../../persistence/checklistRepository";
import type {
  ChecklistState,
  ChecklistStorage,
} from "../../persistence/checklistRepository";

export const GOLDEN_CHECKLIST_STORAGE_KEY = "osaka-trip-todos";
export const GOLDEN_TRIP_ID = "golden:osaka-2026";

type GoldenChecklistStorage = Pick<Storage, "getItem"> &
  Partial<Pick<Storage, "key" | "length" | "removeItem" | "setItem">>;

function stateFromTodos(todos: GoldenTodo[]): ChecklistState {
  return Object.fromEntries(todos.map((todo) => [todo.id, todo.done]));
}

function todosFromState(state: ChecklistState): GoldenTodo[] {
  return initialTodos.map((todo) => ({
    ...todo,
    done: state[todo.id] ?? todo.done,
  }));
}

function parseLegacyTodos(serialized: string | null): GoldenTodo[] {
  if (!serialized) return initialTodos;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return initialTodos;
    const savedState = Object.fromEntries(
      value.flatMap((item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "done" in item &&
        typeof item.id === "string" &&
        typeof item.done === "boolean"
          ? [[item.id, item.done]]
          : [],
      ),
    );
    return todosFromState(savedState);
  } catch {
    return initialTodos;
  }
}

function isFullStorage(
  storage: GoldenChecklistStorage,
): storage is ChecklistStorage {
  return (
    typeof storage.key === "function" &&
    typeof storage.length === "number" &&
    typeof storage.removeItem === "function" &&
    typeof storage.setItem === "function"
  );
}

export function loadGoldenTodos(storage: GoldenChecklistStorage): GoldenTodo[] {
  try {
    if (!isFullStorage(storage)) {
      return parseLegacyTodos(storage.getItem(GOLDEN_CHECKLIST_STORAGE_KEY));
    }

    const repository = createChecklistRepository(storage, {
      compatibilityKeysByTripId: {
        [GOLDEN_TRIP_ID]: [GOLDEN_CHECKLIST_STORAGE_KEY],
      },
    });
    const scoped = repository.loadState(GOLDEN_TRIP_ID);
    const todos =
      scoped.status === "ready"
        ? todosFromState(scoped.items)
        : parseLegacyTodos(storage.getItem(GOLDEN_CHECKLIST_STORAGE_KEY));

    repository.saveState(GOLDEN_TRIP_ID, stateFromTodos(todos));
    storage.setItem(GOLDEN_CHECKLIST_STORAGE_KEY, JSON.stringify(todos));
    return todos;
  } catch {
    return initialTodos;
  }
}

export function toggleGoldenTodo(
  todos: GoldenTodo[],
  id: string,
  storage: Pick<Storage, "setItem">,
): GoldenTodo[] {
  const next = todos.map((todo) =>
    todo.id === id ? { ...todo, done: !todo.done } : todo,
  );
  storage.setItem(GOLDEN_CHECKLIST_STORAGE_KEY, JSON.stringify(next));
  storage.setItem(
    checklistStorageKey(GOLDEN_TRIP_ID),
    JSON.stringify({
      items: stateFromTodos(next),
      repositoryVersion: CHECKLIST_REPOSITORY_VERSION,
      tripId: GOLDEN_TRIP_ID,
    }),
  );
  return next;
}

export function selectGoldenReservationRows(todos: GoldenTodo[]) {
  const todoState = Object.fromEntries(
    todos.map((todo) => [todo.id, todo.done]),
  );
  return reservations.map((reservation) => {
    const done = Boolean(todoState[reservation.todoId]);
    return {
      ...reservation,
      done,
      status: done
        ? reservation.completeStatus
        : reservation.pendingStatus || "Action needed",
    };
  });
}
