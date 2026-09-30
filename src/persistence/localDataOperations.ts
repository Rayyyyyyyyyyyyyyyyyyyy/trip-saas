import type { ConfirmedTripRepository } from "./confirmedTripRepository";
import type { GeminiCredentialRepository } from "./geminiCredentialRepository";

export type ChecklistClearRepository = {
  clearAllTripState(): Promise<void>;
};

export type LocalDataScope = "checklist" | "confirmed_trip" | "credential";
export type LocalDataClearOperation =
  "clear_all_local_data" | "clear_credential" | "clear_trip_data";

export type LocalDataClearResult = {
  clearedScopes: LocalDataScope[];
  operation: LocalDataClearOperation;
};

export class LocalDataClearError extends Error {
  constructor(
    readonly operation: LocalDataClearOperation,
    readonly clearedScopes: LocalDataScope[],
    readonly failedScopes: LocalDataScope[],
  ) {
    super(`Local data clear was incomplete for: ${failedScopes.join(", ")}.`);
    this.name = "LocalDataClearError";
  }
}

export type LocalDataOperations = {
  clearAllLocalData(): Promise<LocalDataClearResult>;
  clearCredential(): Promise<LocalDataClearResult>;
  clearTripData(): Promise<LocalDataClearResult>;
};

type ClearTask = {
  clear: () => Promise<void>;
  scope: LocalDataScope;
};

async function runClearOperation(
  operation: LocalDataClearOperation,
  tasks: ClearTask[],
): Promise<LocalDataClearResult> {
  const settled = await Promise.allSettled(tasks.map((task) => task.clear()));
  const clearedScopes: LocalDataScope[] = [];
  const failedScopes: LocalDataScope[] = [];

  settled.forEach((result, index) => {
    (result.status === "fulfilled" ? clearedScopes : failedScopes).push(
      tasks[index].scope,
    );
  });

  if (failedScopes.length > 0) {
    throw new LocalDataClearError(operation, clearedScopes, failedScopes);
  }

  return { operation, clearedScopes };
}

export function createLocalDataOperations(dependencies: {
  checklistRepository: ChecklistClearRepository;
  confirmedTripRepository: ConfirmedTripRepository;
  geminiCredentialRepository: GeminiCredentialRepository;
}): LocalDataOperations {
  const tripTasks: ClearTask[] = [
    {
      scope: "confirmed_trip",
      clear: () => dependencies.confirmedTripRepository.clear(),
    },
    {
      scope: "checklist",
      clear: () => dependencies.checklistRepository.clearAllTripState(),
    },
  ];
  const credentialTask: ClearTask = {
    scope: "credential",
    clear: () => dependencies.geminiCredentialRepository.clear(),
  };

  return {
    clearTripData: () => runClearOperation("clear_trip_data", tripTasks),
    clearCredential: () =>
      runClearOperation("clear_credential", [credentialTask]),
    clearAllLocalData: () =>
      runClearOperation("clear_all_local_data", [...tripTasks, credentialTask]),
  };
}
