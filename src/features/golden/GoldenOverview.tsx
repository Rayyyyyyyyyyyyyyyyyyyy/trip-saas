import { Button, Typography } from "@mui/material";

import { days, trip } from "../../tripData";
import { editorialMeasureClass } from "../../components/editorial/EditorialPrimitives";

export function GoldenOverview({ onDay }: { onDay: (date: string) => void }) {
  return (
    <main
      aria-label="大阪 Golden 行程總覽"
      className={`${editorialMeasureClass} px-5 py-12 text-trip-ink md:px-8 md:py-20`}
    >
      <header className="pb-10">
        <Typography className="font-utility text-trip-muted" variant="overline">
          你的旅程 · 6 天
        </Typography>
        <Typography
          className="mt-2 font-editorial text-[43px] md:text-[68px]"
          variant="h1"
        >
          關西
        </Typography>
      </header>

      <section className="border-t border-trip-hairline py-7">
        <Typography className="font-utility text-trip-muted" variant="overline">
          航班
        </Typography>
        <div className="mt-4 space-y-4">
          {trip.flights.map((flight) => (
            <div
              className="grid gap-1 sm:grid-cols-[70px_1fr]"
              key={flight.code}
            >
              <Typography className="font-utility text-sm font-bold">
                {flight.code}
              </Typography>
              <div>
                <Typography className="font-utility font-bold tabular-nums">
                  {flight.route}
                </Typography>
                <Typography className="font-utility text-xs text-trip-muted">
                  {flight.date}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-trip-hairline py-7">
        <Typography className="font-utility text-trip-muted" variant="overline">
          住宿
        </Typography>
        <Typography
          className="mt-3 font-editorial text-xl font-bold"
          variant="h2"
        >
          Aloft Osaka Dojima
        </Typography>
        <Typography className="mt-1 font-utility text-xs text-trip-muted">
          SEP 10 → SEP 15 · DOJIMA, OSAKA
        </Typography>
      </section>

      <section className="border-t border-trip-hairline pt-7">
        <Typography className="font-utility text-trip-muted" variant="overline">
          每日行程
        </Typography>
        <div className="mt-3 border-b border-trip-hairline">
          {days.map((day) => (
            <Button
              className="grid w-full grid-cols-[44px_44px_minmax(0,1fr)] justify-start border-t border-trip-hairline px-0 py-4 text-left text-trip-ink"
              key={day.date}
              onClick={() => onDay(day.date)}
              variant="text"
            >
              <span className="font-utility font-bold tabular-nums">
                {day.n}
              </span>
              <span className="font-utility text-[10px] text-trip-muted">
                {day.dow}
              </span>
              <span className="min-w-0 font-editorial normal-case">
                {day.title} · {day.subtitle}
              </span>
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
