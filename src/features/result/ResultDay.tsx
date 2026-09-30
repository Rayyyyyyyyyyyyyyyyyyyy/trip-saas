import { useEffect, useRef } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";

import {
  EditorialFrame,
  EditorialMarker,
  editorialMeasureClass,
} from "../../components/editorial/EditorialPrimitives";
import type { TripPresentation } from "./createTripPresentation";
import {
  DATE_RAIL_PANEL_ID,
  dateRailTabId,
  ResultDateRail,
} from "./ResultDateRail";
import { ResultDisplayItem, ResultSequenceContexts } from "./ResultEntity";

export function ResultDay({
  activeDayId,
  dateRailAccessibleLabel,
  dateRailTabSemantics,
  onOpenDay,
  optionalInitiallyExpanded = false,
  presentation,
}: {
  activeDayId: string;
  dateRailAccessibleLabel?: (day: TripPresentation["days"][number]) => string;
  dateRailTabSemantics?: boolean;
  onOpenDay: (dayId: string) => void;
  optionalInitiallyExpanded?: boolean;
  presentation: TripPresentation;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const day =
    presentation.days.find((candidate) => candidate.id === activeDayId) ??
    presentation.days[0];

  useEffect(() => {
    // In tab mode the rail keeps focus so arrow keys can still move between
    // days; pulling focus to the heading would strand the roving tabindex
    // after the first activation. Navigation mode has no such rail contract,
    // so the new day's heading takes focus.
    if (!dateRailTabSemantics) headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ block: "start" });
  }, [dateRailTabSemantics, day?.id]);

  if (!day) {
    return (
      <main className={`${editorialMeasureClass} p-8`}>
        <Typography className="font-editorial">
          這份行程沒有可顯示的日期。
        </Typography>
      </main>
    );
  }

  return (
    <main
      aria-label={`${day.title ?? day.label ?? day.date ?? "日期未定"} 行程`}
      className="min-h-screen bg-trip-paper text-trip-ink"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:grid md:grid-cols-[160px_minmax(0,680px)_260px] md:justify-center md:gap-8 md:px-8 md:py-12">
        <div className="sticky top-12 z-20 -mx-4 bg-trip-paper px-4 pb-3 pt-1 md:static md:z-auto md:mx-0 md:self-start md:px-0 md:pb-0 md:pt-0">
          <ResultDateRail
            activeDayId={day.id}
            days={presentation.days}
            getAccessibleLabel={dateRailAccessibleLabel}
            onOpenDay={onOpenDay}
            tabSemantics={dateRailTabSemantics}
          />
        </div>

        <div
          aria-labelledby={
            dateRailTabSemantics ? dateRailTabId(day.id) : undefined
          }
          className={`${editorialMeasureClass} space-y-8`}
          id={dateRailTabSemantics ? DATE_RAIL_PANEL_ID : undefined}
          role={dateRailTabSemantics ? "tabpanel" : undefined}
          tabIndex={dateRailTabSemantics ? 0 : undefined}
        >
          <header className="border-b border-trip-hairline pb-8 pt-5 md:pt-0">
            <Typography
              className="font-utility text-trip-muted"
              variant="overline"
            >
              {day.label ?? day.date ?? "日期未定"}
            </Typography>
            <Typography
              className="mt-2 font-editorial text-[36px] leading-tight md:text-5xl"
              component="h1"
              ref={headingRef}
              tabIndex={-1}
              variant="h1"
            >
              {day.title ?? "當天行程"}
            </Typography>
            {day.subtitle && (
              <Typography className="mt-3 font-editorial leading-relaxed text-trip-muted">
                {day.subtitle}
              </Typography>
            )}
          </header>

          <ResultSequenceContexts relationships={day.sequenceContexts} />

          {day.fixedAnchors.length > 0 && (
            <EditorialMarker
              aria-labelledby="day-fixed-anchors"
              className="py-2"
              role="region"
              tone="anchor"
            >
              <Typography
                className="font-utility text-trip-anchor"
                id="day-fixed-anchors"
                variant="overline"
              >
                {day.fixedAnchors.length === 1
                  ? "今天唯一不能錯過的安排"
                  : "今天不能錯過的時間"}
              </Typography>
              <div className="mt-4 space-y-3">
                {day.fixedAnchors.map((anchor) => (
                  <div
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                    key={anchor.id}
                  >
                    {anchor.time.label && (
                      <Typography className="font-utility text-xs font-bold tabular-nums text-trip-muted">
                        {anchor.time.label}
                      </Typography>
                    )}
                    <Typography className="font-editorial font-bold">
                      {anchor.title}
                    </Typography>
                  </div>
                ))}
              </div>
            </EditorialMarker>
          )}

          <section
            className="divide-y divide-trip-hairline"
            aria-label="主要行程時間線"
          >
            {day.items.map((item) => (
              <ResultDisplayItem item={item} key={item.id} />
            ))}
          </section>

          {day.optional.length > 0 && (
            <Accordion
              className="border-y border-trip-hairline bg-trip-paper"
              defaultExpanded={optionalInitiallyExpanded}
            >
              <AccordionSummary className="font-utility text-trip-ready">
                <Typography variant="overline">還有體力的話</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className="divide-y divide-trip-hairline">
                  {day.optional.map((item) => (
                    <ResultDisplayItem item={item} key={item.id} />
                  ))}
                </div>
              </AccordionDetails>
            </Accordion>
          )}
        </div>

        <aside
          aria-label="參考資料"
          className="mt-10 min-w-0 md:mt-0 md:self-start"
        >
          {presentation.supportingItems.length > 0 && (
            <EditorialFrame>
              <Typography
                className="font-utility text-trip-movement"
                variant="overline"
              >
                參考資料
              </Typography>
              <div className="mt-4 divide-y divide-trip-hairline">
                {presentation.supportingItems.map((item) => (
                  <div className="py-4 first:pt-0 last:pb-0" key={item.id}>
                    <Typography className="break-words font-editorial font-bold">
                      {item.displayTitle}
                    </Typography>
                    {item.displayDetail && (
                      <Typography className="mt-1 break-words font-utility text-xs text-trip-muted">
                        {item.displayDetail}
                      </Typography>
                    )}
                    {item.unresolved && (
                      <Typography className="mt-1 font-utility text-xs text-trip-attention">
                        {item.unresolvedMessage}
                      </Typography>
                    )}
                    {item.action && (
                      <a
                        className="mt-2 inline-flex min-h-11 items-center font-utility font-bold text-trip-movement underline underline-offset-4"
                        href={item.action.url}
                        rel={item.action.rel}
                        target={item.action.target}
                      >
                        查看參考資料
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </EditorialFrame>
          )}
        </aside>
      </div>
    </main>
  );
}
