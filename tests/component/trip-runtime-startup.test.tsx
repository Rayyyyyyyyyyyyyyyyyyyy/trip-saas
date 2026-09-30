import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TripRuntimeStartup } from "../../src/app/TripRuntimeStartup";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type {
  ActiveTripLoadResult,
  ConfirmedTripRepository,
} from "../../src/persistence/confirmedTripRepository";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";
import type {
  LocalDataClearResult,
  LocalDataOperations,
} from "../../src/persistence/localDataOperations";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const credentialRepository: GeminiCredentialRepository = {
  clear: async () => undefined,
  load: async () => ({ status: "empty" }),
  probePersistence: async () => ({ supported: true }),
  save: async () => undefined,
};
const localDataOperations: LocalDataOperations = {
  clearAllLocalData: vi.fn(async (): Promise<LocalDataClearResult> => ({
    operation: "clear_all_local_data",
    clearedScopes: ["confirmed_trip", "checklist", "credential"],
  })),
  clearCredential: vi.fn(async (): Promise<LocalDataClearResult> => ({
    operation: "clear_credential",
    clearedScopes: ["credential"],
  })),
  clearTripData: vi.fn(async (): Promise<LocalDataClearResult> => ({
    operation: "clear_trip_data",
    clearedScopes: ["confirmed_trip", "checklist"],
  })),
};

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

describe("TripRuntimeStartup", () => {
  it("shows Home on a clean browser without silently activating the sample", async () => {
    const repository = repositoryReturning({ status: "empty" });
    const renderViewer = vi.fn(() => <div>Viewer</div>);

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        repository={repository}
        sampleTrip={activeTrip}
        renderViewer={renderViewer}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: /把你已經有的行程，變成旅行當下能用的介面。/,
      }),
    ).toBeInTheDocument();
    expect(renderViewer).not.toHaveBeenCalled();
    expect(repository.replaceActive).not.toHaveBeenCalled();
  });

  it("opens a validated active trip directly without credential checks", async () => {
    const repository = repositoryReturning({
      status: "ready",
      trip: activeTrip,
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        repository={repository}
        sampleTrip={activeTrip}
        renderViewer={(trip) => <h1>Viewer: {trip.title}</h1>}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: `Viewer: ${activeTrip.title}`,
      }),
    ).toBeInTheDocument();
  });

  it("opens the sample only after the explicit sample action", async () => {
    const user = userEvent.setup();
    const repository = repositoryReturning({ status: "empty" });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        repository={repository}
        sampleTrip={activeTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <span>{controls.sample ? "Sample preview" : "Active trip"}</span>
          </div>
        )}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "先看看大阪 2026 範例" }),
    );

    expect(screen.getByText("Sample preview")).toBeInTheDocument();
    expect(repository.replaceActive).not.toHaveBeenCalled();
  });

  it("retains the persisted active trip after previewing the sample and returning Home", async () => {
    const user = userEvent.setup();
    const repository = repositoryReturning({
      status: "ready",
      trip: activeTrip,
    });
    const sampleTrip = {
      ...structuredClone(activeTrip),
      id: "trip:golden-sample",
      title: "Golden sample",
    };

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await user.click(
      screen.getByRole("button", { name: "先看看大阪 2026 範例" }),
    );
    expect(
      screen.getByRole("heading", { name: "Viewer: Golden sample" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show Home" }));

    expect(
      screen.getByRole("button", { name: "回到目前行程" }),
    ).toHaveTextContent(activeTrip.title!);
  });

  it("refreshes Home state after confirmed trip data is explicitly cleared", async () => {
    const user = userEvent.setup();
    const repository = repositoryReturning({
      status: "ready",
      trip: activeTrip,
    });
    const clearTripData = vi.fn(async (): Promise<LocalDataClearResult> => ({
      operation: "clear_trip_data",
      clearedScopes: ["confirmed_trip", "checklist"],
    }));

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={{ ...localDataOperations, clearTripData }}
        repository={repository}
        sampleTrip={activeTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await user.click(
      screen.getByRole("button", { name: /管理這台裝置的資料/ }),
    );
    await user.click(screen.getByRole("button", { name: "清除行程資料" }));
    await user.click(screen.getByRole("button", { name: "清除行程資料" }));

    expect(clearTripData).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("heading", { name: activeTrip.title! }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "回到目前行程" })).toBeNull();
  });
});
