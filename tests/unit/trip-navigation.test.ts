import { describe, expect, it } from "vitest";

import {
  createInitialTripNavigation,
  tripNavigationReducer,
} from "../../src/features/result/tripNavigation";

const dayIds = ["day:1", "day:2", "day:3"];

describe("trip navigation", () => {
  it("owns one selected day while changing screens", () => {
    let state = createInitialTripNavigation(dayIds, {
      initialScreen: "overview",
    });
    state = tripNavigationReducer(state, {
      type: "day_opened",
      dayId: "day:2",
    });
    expect(state).toEqual({ screen: "day", selectedDayId: "day:2" });

    state = tripNavigationReducer(state, {
      type: "screen_opened",
      screen: "reservations",
    });
    expect(state).toEqual({
      screen: "reservations",
      selectedDayId: "day:2",
    });
  });

  it("orients Today to the actual day without maintaining a second day state", () => {
    let state = createInitialTripNavigation(dayIds, {
      initialScreen: "overview",
      initialDayId: "day:1",
    });
    state = tripNavigationReducer(state, {
      type: "screen_opened",
      screen: "today",
      todayDayId: "day:3",
    });
    expect(state).toEqual({ screen: "today", selectedDayId: "day:3" });

    state = tripNavigationReducer(state, {
      type: "today_day_changed",
      dayId: "day:2",
    });
    expect(state.selectedDayId).toBe("day:2");
  });

  it("does not reorient a manually opened Day when runtime refreshes", () => {
    const state = { screen: "day" as const, selectedDayId: "day:2" };
    expect(
      tripNavigationReducer(state, {
        type: "today_day_changed",
        dayId: "day:3",
      }),
    ).toBe(state);
  });
});
