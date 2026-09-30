import { useReducer } from "react";
import { Button } from "@mui/material";

import type { TripPresentation } from "./createTripPresentation";
import { ResultDay } from "./ResultDay";
import { ResultOverview } from "./ResultOverview";
import {
  createInitialTripNavigation,
  tripNavigationReducer,
} from "./tripNavigation";

export function ResultViewer({
  onShowHome,
  presentation,
}: {
  onShowHome: () => void;
  presentation: TripPresentation;
}) {
  const [navigation, dispatch] = useReducer(
    tripNavigationReducer,
    presentation.days.map((day) => day.id),
    (dayIds) =>
      createInitialTripNavigation(dayIds, { initialScreen: "overview" }),
  );

  const openDay = (dayId: string) => dispatch({ type: "day_opened", dayId });

  return (
    <div className="relative min-h-screen bg-trip-paper">
      <div className="sticky top-0 z-30 flex h-12 justify-end border-b border-trip-hairline bg-trip-paper">
        {navigation.screen === "day" && (
          <Button
            className="min-h-12 border-l border-r border-trip-hairline px-3 font-utility text-trip-ink"
            onClick={() =>
              dispatch({ type: "screen_opened", screen: "overview" })
            }
            variant="text"
          >
            行程總覽
          </Button>
        )}
        <Button
          className="min-h-12 border-r border-trip-hairline px-3 font-utility text-trip-ink"
          onClick={onShowHome}
          variant="text"
        >
          首頁
        </Button>
      </div>

      {navigation.screen === "overview" ? (
        <ResultOverview presentation={presentation} onOpenDay={openDay} />
      ) : (
        <ResultDay
          activeDayId={navigation.selectedDayId}
          onOpenDay={openDay}
          presentation={presentation}
        />
      )}
    </div>
  );
}
