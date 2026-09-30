export type TripScreen = "overview" | "today" | "day" | "reservations";

export type TripNavigationState = {
  screen: TripScreen;
  selectedDayId: string;
};

export type TripNavigationEvent =
  | { type: "screen_opened"; screen: TripScreen; todayDayId?: string }
  | { type: "day_opened"; dayId: string }
  | { type: "today_day_changed"; dayId: string };

export function createInitialTripNavigation(
  dayIds: readonly string[],
  options: { initialScreen: TripScreen; initialDayId?: string },
): TripNavigationState {
  const fallbackDayId = dayIds[0];
  if (!fallbackDayId) {
    throw new Error("Trip navigation requires at least one day.");
  }
  return {
    screen: options.initialScreen,
    selectedDayId:
      options.initialDayId && dayIds.includes(options.initialDayId)
        ? options.initialDayId
        : fallbackDayId,
  };
}

export function tripNavigationReducer(
  state: TripNavigationState,
  event: TripNavigationEvent,
): TripNavigationState {
  switch (event.type) {
    case "day_opened":
      return { screen: "day", selectedDayId: event.dayId };
    case "screen_opened":
      return {
        screen: event.screen,
        selectedDayId:
          event.screen === "today" && event.todayDayId
            ? event.todayDayId
            : state.selectedDayId,
      };
    case "today_day_changed":
      return state.screen === "today"
        ? { ...state, selectedDayId: event.dayId }
        : state;
  }
}
