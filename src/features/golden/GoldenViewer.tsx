import { useEffect, useMemo, useReducer, useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  CalendarMonth,
  CheckCircle,
  Close,
  EventNote,
  MoreHoriz,
  Today,
} from "@mui/icons-material";

import {
  editorialMarkerClass,
  EditorialMeasure,
} from "../../components/editorial/EditorialPrimitives";
import {
  createInitialTripNavigation,
  tripNavigationReducer,
  type TripScreen,
} from "../result/tripNavigation";
import { createTripPresentation } from "../result/createTripPresentation";
import { formatTripMonthDay } from "../result/formatTripDate";
import { ResultDay } from "../result/ResultDay";
import { ResultOverview } from "../result/ResultOverview";
import { days, trip } from "../../tripData";
import { goldenOsakaCanonicalTrip } from "../../fixtures/golden/osakaCanonicalTrip";
import { GoldenDateRail } from "./GoldenDateRail";
import { GoldenReservations } from "./GoldenReservations";
import { getTokyoRuntime } from "./runtime";
import { GoldenTodayView, GoldenTripStatusView } from "./GoldenTodayView";

export type GoldenViewerProps = {
  onShowHome: () => void;
};

export function GoldenViewer({ onShowHome }: GoldenViewerProps) {
  const muiTheme = useTheme();
  const mobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const [runtime, setRuntime] = useState(getTokyoRuntime);
  const [navigation, dispatchNavigation] = useReducer(
    tripNavigationReducer,
    undefined,
    () =>
      createInitialTripNavigation(
        days.map((candidate) => candidate.date),
        {
          initialScreen: runtime.phase === "during" ? "today" : "overview",
          initialDayId:
            runtime.phase === "during" && runtime.date
              ? runtime.date
              : days[0]!.date,
        },
      ),
  );
  const [drawer, setDrawer] = useState(false);
  const presentation = useMemo(
    () =>
      createTripPresentation(goldenOsakaCanonicalTrip, {
        sourceMapActionLabel: (entity) =>
          entity.state.optional ? entity.title : "開啟地圖",
      }),
    [],
  );

  useEffect(() => {
    const refreshRuntime = () => {
      const nextRuntime = getTokyoRuntime();
      setRuntime(nextRuntime);
      if (nextRuntime.phase === "during" && nextRuntime.date) {
        dispatchNavigation({
          type: "today_day_changed",
          dayId: nextRuntime.date,
        });
      }
    };
    const timer = window.setInterval(refreshRuntime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const view = navigation.screen;
  const date = navigation.selectedDayId;
  const day = useMemo(
    () => days.find((candidate) => candidate.date === date) ?? days[0]!,
    [date],
  );

  const selectDay = (dayId: string) => {
    dispatchNavigation({ type: "day_opened", dayId });
  };

  const selectProjectedDay = (projectedDayId: string) => {
    const projectedDay = presentation.days.find(
      (candidate) => candidate.id === projectedDayId,
    );
    selectDay(projectedDay?.date ?? projectedDayId);
  };

  const selectedProjectedDayId =
    presentation.days.find((candidate) => candidate.date === date)?.id ??
    presentation.days[0]!.id;

  const selectView = (screen: TripScreen) => {
    dispatchNavigation({
      type: "screen_opened",
      screen,
      todayDayId:
        screen === "today" && runtime.phase === "during"
          ? (runtime.date ?? undefined)
          : undefined,
    });
  };

  return (
    <div
      className={`min-h-screen bg-trip-paper text-trip-ink ${
        mobile ? "pb-20" : "pb-4"
      }`}
    >
      <header className="border-b border-trip-hairline bg-trip-paper">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
          <div>
            <Typography
              className="font-utility text-trip-anchor"
              variant="overline"
            >
              日本 · 2026
            </Typography>
            <Typography className="font-editorial text-2xl" variant="h2">
              {trip.title}
            </Typography>
            <Typography className="font-utility text-xs text-trip-muted">
              {formatTripMonthDay(days[0]!.date)} —{" "}
              {formatTripMonthDay(days.at(-1)!.date)} · 6 天
            </Typography>
          </div>
          <IconButton
            className="border border-trip-hairline text-trip-ink"
            onClick={() => setDrawer(true)}
            aria-label="開啟選單"
          >
            <MoreHoriz />
          </IconButton>
        </div>
      </header>

      {view !== "day" && (
        <GoldenDateRail selected={date} onSelect={selectDay} />
      )}

      {view === "overview" ? (
        <ResultOverview
          presentation={presentation}
          onOpenDay={selectProjectedDay}
        />
      ) : view === "day" ? (
        <ResultDay
          activeDayId={selectedProjectedDayId}
          dateRailAccessibleLabel={(projectedDay) => {
            const goldenDay = days.find(
              (candidate) => candidate.date === projectedDay.date,
            );
            return goldenDay
              ? `${formatTripMonthDay(goldenDay.date)} ${goldenDay.dow} ${goldenDay.label}`
              : (projectedDay.label ?? formatTripMonthDay(projectedDay.date));
          }}
          dateRailTabSemantics
          onOpenDay={selectProjectedDay}
          optionalInitiallyExpanded
          presentation={presentation}
        />
      ) : (
        <EditorialMeasure className="px-5 py-10 md:px-8 md:py-14">
          {view === "today" ? (
            runtime.phase === "during" ? (
              <GoldenTodayView
                day={day}
                runtime={runtime}
                onFullDay={() =>
                  dispatchNavigation({ type: "day_opened", dayId: date })
                }
              />
            ) : (
              <GoldenTripStatusView runtime={runtime} />
            )
          ) : (
            <GoldenReservations />
          )}
        </EditorialMeasure>
      )}

      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}>
        <div className="w-[min(380px,100vw)] p-6">
          <div className="flex items-center justify-between border-b border-trip-hairline pb-3">
            <Typography className="font-utility" variant="overline">
              行程選單
            </Typography>
            <IconButton
              aria-label="關閉選單"
              className="text-trip-ink"
              onClick={() => setDrawer(false)}
            >
              <Close />
            </IconButton>
          </div>
          <List className="mt-6">
            {(
              [
                ["overview", "行程總覽"],
                ["today", "今天 / 現在"],
                ["reservations", "預約與票券"],
              ] satisfies Array<[TripScreen, string]>
            ).map(([screen, label]) => (
              <ListItemButton
                className="border-t border-trip-hairline px-0 font-utility"
                key={screen}
                onClick={() => {
                  selectView(screen);
                  setDrawer(false);
                }}
              >
                {label}
              </ListItemButton>
            ))}
          </List>
          <Button
            className="mt-6 w-full border-trip-hairline px-4 font-utility text-trip-ink"
            variant="outlined"
            fullWidth
            onClick={onShowHome}
          >
            回到首頁管理行程
          </Button>
          <Typography
            className={editorialMarkerClass(
              "ready",
              "mt-16 font-editorial text-trip-muted",
            )}
          >
            不要把旅行排成 KPI。
            <br />
            保留臨時起意的空間。
          </Typography>
        </div>
      </Drawer>

      {mobile && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-trip-hairline bg-trip-paper">
          <BottomNavigation
            className="bg-trip-paper font-utility"
            value={view}
            onChange={(_, nextView: TripScreen) => selectView(nextView)}
            showLabels
          >
            <BottomNavigationAction
              value="today"
              label="今天"
              icon={<Today />}
            />
            <BottomNavigationAction
              value="overview"
              label="總覽"
              icon={<CalendarMonth />}
            />
            <BottomNavigationAction
              value="day"
              label="每日"
              icon={<EventNote />}
            />
            <BottomNavigationAction
              value="reservations"
              label="預約"
              icon={<CheckCircle />}
            />
          </BottomNavigation>
        </div>
      )}
    </div>
  );
}
