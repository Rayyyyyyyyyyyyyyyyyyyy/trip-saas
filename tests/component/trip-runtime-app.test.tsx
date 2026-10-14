import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TripRuntimeApp } from "../../src/app/TripRuntimeApp";
import { goldenOsakaCanonicalTrip } from "../../src/fixtures/golden/osakaCanonicalTrip";
import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

const repository = vi.hoisted(() => ({
  clear: vi.fn(),
  loadActive: vi.fn(),
  replaceActive: vi.fn(),
}));
vi.mock("../../src/persistence/confirmedTripRepository", () => ({
  createConfirmedTripRepository: () => repository,
}));
vi.mock("../../src/persistence/geminiCredentialRepository", () => ({
  createGeminiCredentialRepository: () => ({
    clear: vi.fn(),
    save: vi.fn(),
    load: async () => ({ status: "empty" }),
    probePersistence: async () => ({ supported: true }),
  }),
}));

const createParser = vi.hoisted(() => vi.fn(() => vi.fn()));
vi.mock("../../src/integrations/gemini/geminiTripParser", () => ({
  createGeminiTripParser: createParser,
}));

describe("TripRuntimeApp sample routing", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubEnv("VITE_GEMINI_MODEL", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("constructs only the explicitly configured exact parser even if obsolete alternate config exists", async () => {
    vi.stubEnv("VITE_GEMINI_MODEL", "gemini-3.5-flash");
    vi.stubEnv("VITE_GEMINI_FALLBACK_MODEL", "gemini-other-model");
    repository.loadActive.mockResolvedValue({ status: "empty" });
    render(<TripRuntimeApp />);
    await screen.findByRole("button", { name: "先看看大阪 2026 範例" });
    expect(createParser).toHaveBeenCalledExactlyOnceWith({
      model: "gemini-3.5-flash",
    });
    expect(screen.queryByRole("button", { name: /改用.*重試/ })).toBeNull();
  });

  it("keeps production intake unconfigured when only obsolete alternate config exists", async () => {
    vi.stubEnv("VITE_GEMINI_FALLBACK_MODEL", "gemini-other-model");
    repository.loadActive.mockResolvedValue({ status: "empty" });
    render(<TripRuntimeApp />);
    await screen.findByRole("button", { name: "先看看大阪 2026 範例" });
    expect(createParser).not.toHaveBeenCalled();
  });

  it("renders persisted Golden-ID data and preserves it while the explicit sample is viewed", async () => {
    const user = userEvent.setup();
    const supplied = {
      ...structuredClone(validCanonicalTrip),
      id: goldenOsakaCanonicalTrip.id,
      title: "User corrected Golden-ID trip",
    };
    repository.loadActive.mockResolvedValue({
      status: "ready",
      trip: supplied,
    });
    render(<TripRuntimeApp />);

    expect(
      await screen.findByRole("heading", { name: supplied.title, level: 1 }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "首頁" }));
    await user.click(
      screen.getByRole("button", { name: "先看看大阪 2026 範例" }),
    );
    expect(
      screen.queryByRole("heading", { name: supplied.title, level: 1 }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "開啟選單" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "開啟選單" }));
    await user.click(screen.getByRole("button", { name: /首頁/ }));
    await user.click(screen.getByRole("button", { name: "回到目前行程" }));
    expect(
      screen.getByRole("heading", { name: supplied.title, level: 1 }),
    ).toBeVisible();
    expect(repository.replaceActive).not.toHaveBeenCalled();
  });
});
