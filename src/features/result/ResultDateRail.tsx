import { useEffect, useRef } from "react";
import { Button, Typography } from "@mui/material";

import type { TripPresentation } from "./createTripPresentation";
import { formatTripMonthDay } from "./formatTripDate";

type ProjectedDay = TripPresentation["days"][number];

// Tab semantics need matching ids on both sides of the pair, so the rail and
// the panel it controls derive them from the same day identity.
export const DATE_RAIL_PANEL_ID = "trip-day-panel";

export function dateRailTabId(dayId: string) {
  return `trip-day-tab:${dayId}`;
}

export function ResultDateRail({
  activeDayId,
  days,
  getAccessibleLabel,
  onOpenDay,
  tabSemantics = false,
}: {
  activeDayId: string;
  days: ProjectedDay[];
  getAccessibleLabel?: (day: ProjectedDay) => string;
  onOpenDay: (dayId: string) => void;
  tabSemantics?: boolean;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const activeIndex = days.findIndex((day) => day.id === activeDayId);
    if (activeIndex < 0) return;

    itemRefs.current[activeIndex]?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeDayId, days]);

  // A `role="tab"` is only valid inside a `role="tablist"` that owns a panel,
  // so the tab attributes are derived together and are either all present or
  // all absent. The `nav` landmark stays either way; a tablist nested in it is
  // still reachable as navigation.
  const listProps = tabSemantics
    ? {
        "aria-label": "選擇行程日期",
        "aria-orientation": "horizontal" as const,
        role: "tablist",
      }
    : {};
  const tabProps = (day: ProjectedDay, selected: boolean) =>
    tabSemantics
      ? {
          "aria-controls": DATE_RAIL_PANEL_ID,
          "aria-selected": selected,
          id: dateRailTabId(day.id),
          role: "tab",
          tabIndex: selected ? undefined : -1,
        }
      : { "aria-current": selected ? ("date" as const) : undefined };

  return (
    <nav aria-label="行程日期" className="min-w-0 md:sticky md:top-16">
      <div
        className="flex max-w-full gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0"
        {...listProps}
      >
        {days.map((day, index) => {
          const selected = day.id === activeDayId;
          return (
            <Button
              aria-label={getAccessibleLabel?.(day)}
              {...tabProps(day, selected)}
              className={`min-w-24 shrink-0 justify-start border px-3 py-2 font-utility md:w-full ${
                selected
                  ? "border-trip-ink bg-trip-ink text-trip-paper hover:bg-trip-ink"
                  : "border-trip-hairline bg-trip-paper text-trip-ink hover:border-trip-ink"
              }`}
              key={day.id}
              onKeyDown={(event) => {
                if (!tabSemantics) return;
                const direction =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? -1
                      : 0;
                const targetIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? days.length - 1
                      : direction
                        ? (index + direction + days.length) % days.length
                        : null;
                if (targetIndex === null) return;
                event.preventDefault();
                itemRefs.current[targetIndex]?.focus();
              }}
              onClick={() => onOpenDay(day.id)}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              variant={selected ? "contained" : "outlined"}
            >
              <span className="text-left">
                <Typography
                  className="block font-utility text-sm font-bold tabular-nums"
                  component="span"
                >
                  {formatTripMonthDay(day.date, day.label)}
                </Typography>
                <Typography
                  className={`block font-utility text-[10px] ${
                    selected ? "text-trip-paper" : "text-trip-muted"
                  }`}
                  component="span"
                  variant="caption"
                >
                  {day.label ?? day.title ?? "當天行程"}
                </Typography>
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
