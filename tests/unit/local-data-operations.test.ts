import { describe, expect, it, vi } from "vitest";

import {
  createLocalDataOperations,
  LocalDataClearError,
} from "../../src/persistence/localDataOperations";

function repositories() {
  const confirmedClear = vi.fn(async () => undefined);
  const checklistClear = vi.fn(async () => undefined);
  const credentialClear = vi.fn(async () => undefined);
  return {
    confirmedClear,
    checklistClear,
    credentialClear,
    operations: createLocalDataOperations({
      confirmedTripRepository: {
        clear: confirmedClear,
        loadActive: vi.fn(),
        replaceActive: vi.fn(),
      },
      checklistRepository: { clearAllTripState: checklistClear },
      geminiCredentialRepository: {
        clear: credentialClear,
        load: vi.fn(),
        probePersistence: vi.fn(),
        save: vi.fn(),
      },
    }),
  };
}

describe("scoped local data clearing", () => {
  it("clears trip and checklist data without clearing the credential", async () => {
    const fixture = repositories();

    await expect(fixture.operations.clearTripData()).resolves.toEqual({
      operation: "clear_trip_data",
      clearedScopes: ["confirmed_trip", "checklist"],
    });
    expect(fixture.confirmedClear).toHaveBeenCalledOnce();
    expect(fixture.checklistClear).toHaveBeenCalledOnce();
    expect(fixture.credentialClear).not.toHaveBeenCalled();
  });

  it("clears only the credential for the credential scope", async () => {
    const fixture = repositories();

    await expect(fixture.operations.clearCredential()).resolves.toEqual({
      operation: "clear_credential",
      clearedScopes: ["credential"],
    });
    expect(fixture.confirmedClear).not.toHaveBeenCalled();
    expect(fixture.checklistClear).not.toHaveBeenCalled();
    expect(fixture.credentialClear).toHaveBeenCalledOnce();
  });

  it("reports partial failures without claiming every scope was cleared", async () => {
    const fixture = repositories();
    fixture.checklistClear.mockRejectedValueOnce(new Error("storage denied"));

    const error = await fixture.operations
      .clearAllLocalData()
      .catch((value) => value);

    expect(error).toBeInstanceOf(LocalDataClearError);
    expect(error).toMatchObject({
      operation: "clear_all_local_data",
      clearedScopes: ["confirmed_trip", "credential"],
      failedScopes: ["checklist"],
    });
  });
});
