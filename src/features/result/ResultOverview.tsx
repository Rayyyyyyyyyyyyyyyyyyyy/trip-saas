import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Typography,
} from "@mui/material";

import {
  editorialMeasureClass,
  EditorialMarker,
  EditorialSectionHeading,
} from "../../components/editorial/EditorialPrimitives";
import type { TripPresentation } from "./createTripPresentation";
import { describeDependency } from "./describeDependency";
import { formatTripMonthDay } from "./formatTripDate";
import { ResultDisplayItem, ResultSequenceContexts } from "./ResultEntity";

export function ResultOverview({
  onOpenDay,
  presentation,
}: {
  onOpenDay: (dayId: string) => void;
  presentation: TripPresentation;
}) {
  const { overview, trip } = presentation;
  const journey = trip.geography.join(" → ");
  const firstDay = overview.days[0];
  const lastDay = overview.days.at(-1);

  return (
    <main
      aria-label="行程總覽"
      className={`${editorialMeasureClass} min-h-screen bg-trip-paper px-5 pb-24 pt-12 text-trip-ink md:px-8 md:pt-20`}
    >
      <header className="pb-10">
        <Typography className="font-utility text-trip-muted" variant="overline">
          已確認的行程
        </Typography>
        <Typography
          className="mt-3 font-editorial text-[42px] leading-[1.05] md:text-[64px]"
          component="h1"
          variant="h1"
        >
          {trip.title ?? "未命名行程"}
        </Typography>
        <Typography className="mt-4 font-utility text-sm text-trip-muted md:text-base">
          {formatTripMonthDay(
            trip.startDate ?? firstDay?.date ?? null,
            firstDay?.label,
          )}{" "}
          —{" "}
          {formatTripMonthDay(
            trip.endDate ?? lastDay?.date ?? null,
            lastDay?.label,
          )}
        </Typography>
        {journey && (
          <Typography className="mt-2 font-editorial text-lg leading-relaxed md:text-xl">
            {journey}
          </Typography>
        )}
      </header>

      {overview.readinessAttention.length > 0 && (
        <section
          aria-labelledby="overview-readiness"
          className="border-t border-trip-hairline py-8"
        >
          <EditorialMarker tone="attention">
            <Typography
              className="font-utility text-trip-attention"
              id="overview-readiness"
              variant="overline"
            >
              出發前要處理
            </Typography>
            <div className="mt-4 space-y-5">
              {overview.readinessAttention.map((entity) => (
                <div key={entity.id}>
                  <Typography className="font-editorial text-lg font-bold">
                    {entity.title}
                  </Typography>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-utility text-xs text-trip-muted">
                    {entity.dependencies.map((dependency, index) => (
                      <span key={`${dependency.type}:${index}`}>
                        {describeDependency(dependency)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </EditorialMarker>
        </section>
      )}

      {overview.criticalAnchors.length > 0 && (
        <section
          aria-labelledby="overview-anchors"
          className="border-t border-trip-hairline py-8"
        >
          <EditorialMarker tone="anchor">
            <Typography
              className="font-utility text-trip-anchor"
              id="overview-anchors"
              variant="overline"
            >
              不能錯過的時間
            </Typography>
            <div className="mt-4 space-y-3">
              {overview.criticalAnchors.slice(0, 6).map((entity) => (
                <div className="flex items-baseline gap-3" key={entity.id}>
                  <Typography className="w-24 shrink-0 font-utility text-xs font-bold tabular-nums text-trip-muted">
                    {entity.time.label}
                  </Typography>
                  <Typography className="font-editorial font-bold">
                    {entity.title}
                  </Typography>
                </div>
              ))}
            </div>
          </EditorialMarker>
        </section>
      )}

      {(overview.flights.length > 0 || overview.accommodations.length > 0) && (
        <section
          aria-label="交通與住宿"
          className="grid gap-8 border-t border-trip-hairline py-8 sm:grid-cols-2"
        >
          {overview.flights.length > 0 && (
            <div>
              <Typography
                className="font-utility text-trip-muted"
                variant="overline"
              >
                航班
              </Typography>
              <div className="mt-3 space-y-3">
                {overview.flights.map((flight) => (
                  <Typography
                    className="font-editorial font-bold"
                    key={flight.id}
                  >
                    {flight.time.label ? `${flight.time.label} · ` : ""}
                    {flight.title}
                  </Typography>
                ))}
              </div>
            </div>
          )}
          {overview.accommodations.length > 0 && (
            <div>
              <Typography
                className="font-utility text-trip-muted"
                variant="overline"
              >
                住宿
              </Typography>
              <div className="mt-3 space-y-3">
                {overview.accommodations.map((stay) => (
                  <Typography
                    className="font-editorial font-bold"
                    key={stay.id}
                  >
                    {stay.title}
                  </Typography>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {(presentation.undated.items.length > 0 ||
        presentation.undated.optional.length > 0) && (
        <section
          aria-labelledby="undated-trip-information"
          className="border-t border-trip-hairline py-8"
        >
          <EditorialSectionHeading id="undated-trip-information">
            未指定日期／旅程資訊
          </EditorialSectionHeading>
          <Typography className="mt-2 font-editorial text-sm leading-6 text-trip-muted">
            原始行程沒有提供足以歸入某一天的日期，因此保留在這裡。
          </Typography>
          <div className="mt-4">
            <ResultSequenceContexts
              relationships={presentation.undated.sequenceContexts}
            />
          </div>
          <div
            aria-label="未指定日期的主要行程"
            className="mt-5 divide-y divide-trip-hairline"
          >
            {presentation.undated.items.map((item) => (
              <ResultDisplayItem item={item} key={item.id} />
            ))}
          </div>
          {presentation.undated.optional.length > 0 && (
            <Accordion className="border-y border-trip-hairline bg-trip-paper">
              <AccordionSummary className="font-utility text-trip-ready">
                <Typography variant="overline">未指定日期的可選項目</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className="divide-y divide-trip-hairline">
                  {presentation.undated.optional.map((item) => (
                    <ResultDisplayItem item={item} key={item.id} />
                  ))}
                </div>
              </AccordionDetails>
            </Accordion>
          )}
        </section>
      )}

      <section
        className="border-t border-trip-hairline pt-8"
        aria-labelledby="journey-days"
      >
        <EditorialSectionHeading id="journey-days">
          每一天
        </EditorialSectionHeading>
        <div className="mt-5 border-b border-trip-hairline">
          {overview.days.map((day, index) => (
            <Button
              className="w-full justify-between border-t border-trip-hairline px-0 py-4 text-left text-trip-ink"
              key={day.id}
              onClick={() => onOpenDay(day.id)}
              variant="text"
            >
              <span className="min-w-0 pr-4">
                <Typography
                  className="block font-utility text-xs text-trip-muted"
                  component="span"
                  variant="overline"
                >
                  第 {index + 1} 天 · {formatTripMonthDay(day.date, day.label)}
                </Typography>
                <Typography
                  className="mt-1 block font-editorial text-lg font-bold normal-case"
                  component="span"
                >
                  {day.title ?? day.label ?? "當天行程"}
                </Typography>
              </span>
              <span aria-hidden="true" className="font-utility text-lg">
                →
              </span>
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
