import { Button, Typography } from "@mui/material";
import { Attractions, Map } from "@mui/icons-material";

import {
  editorialMarkerClass,
  EditorialMeasure,
} from "../../components/editorial/EditorialPrimitives";
import type { GoldenDay } from "../../tripData";
import { GoldenEventCard } from "./GoldenEventCard";
import { goldenMapHref } from "./goldenMapHref";

export function GoldenDayView({ day }: { day: GoldenDay }) {
  return (
    <EditorialMeasure>
      <header className="border-b border-trip-hairline pb-8">
        <Typography className="font-utility text-trip-muted" variant="overline">
          {day.dow} · SEP {day.n}
        </Typography>
        <Typography
          className="mt-2 font-editorial text-[38px] md:text-[56px]"
          variant="h1"
        >
          {day.title}
        </Typography>
        <Typography className="mt-2 font-editorial text-trip-muted">
          {day.subtitle}
        </Typography>
      </header>

      {day.special ? (
        <section className="my-8 border-y border-trip-hairline py-12 text-center md:py-16">
          <Attractions className="text-[42px] text-trip-movement" />
          <Typography
            className="mt-3 block font-utility text-trip-anchor"
            variant="overline"
          >
            萬聖節 · 全天
          </Typography>
          <Typography
            className="my-5 font-editorial text-[32px] md:text-5xl"
            variant="h2"
          >
            UNIVERSAL STUDIOS
            <br />
            JAPAN
          </Typography>
          <Typography className="font-editorial">今天沒有其他行程。</Typography>
          <Button
            className="mt-4 border-trip-hairline px-4 font-utility text-trip-ink"
            component="a"
            startIcon={<Map />}
            href={goldenMapHref("Universal Studios Japan")}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
          >
            開啟地圖
          </Button>
          <Typography
            className={editorialMarkerClass(
              "attention",
              "mt-10 font-editorial font-bold",
            )}
          >
            晚上唯一判斷標準：
            <br />
            「我還活著嗎？」
          </Typography>
        </section>
      ) : (
        <div className="mt-6 divide-y divide-trip-hairline">
          {day.events.map((event, index) => (
            <GoldenEventCard key={index} event={event} />
          ))}
        </div>
      )}

      {day.optional && (
        <section
          aria-label="還有體力的話"
          className="mt-8 border-y border-trip-hairline py-6"
        >
          <Typography
            className="font-utility text-trip-ready"
            variant="overline"
          >
            還有體力的話
          </Typography>
          <div className="mt-4 flex flex-wrap gap-2">
            {day.optional.map((place) => (
              <Button
                className="border-trip-hairline px-4 font-utility text-trip-ink"
                component="a"
                href={place.map}
                key={place.name}
                rel="noopener noreferrer"
                startIcon={<Map />}
                target="_blank"
                variant="outlined"
              >
                {place.name}
              </Button>
            ))}
          </div>
        </section>
      )}
    </EditorialMeasure>
  );
}
