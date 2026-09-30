import { Button, Typography } from "@mui/material";
import {
  Attractions,
  Coffee,
  Directions,
  EventNote,
  Flight,
  Hotel,
  Restaurant,
  Train,
  Work,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

import type { GoldenEvent } from "../../tripData";
import { goldenMapHref } from "./goldenMapHref";
import { editorialMarkerClass } from "../../components/editorial/EditorialPrimitives";

const icons: Record<string, SvgIconComponent> = {
  flight: Flight,
  hotel: Hotel,
  work: Work,
  activity: Attractions,
  restaurant: Restaurant,
  transport: Train,
  free_time: Coffee,
};

export function GoldenEventIcon({ type }: { type?: string }) {
  const Icon = icons[type ?? ""] || EventNote;
  return (
    <span className="grid size-9 shrink-0 place-items-center border border-trip-hairline text-trip-movement">
      <Icon className="text-[18px]" />
    </span>
  );
}

export function GoldenEventCard({ event }: { event: GoldenEvent }) {
  if (event.transit) {
    return (
      <div className="ml-2 flex min-h-11 items-center border-l border-dashed border-trip-hairline py-3 pl-5 text-trip-movement">
        <Train className="mr-3 text-[18px]" />
        <Typography className="font-utility text-sm">
          <b>{event.transit}</b>
          {event.tip && ` · ${event.tip}`}
        </Typography>
      </div>
    );
  }

  return (
    <article
      className={editorialMarkerClass(
        event.flexible ? "ready" : "neutral",
        "py-5",
      )}
    >
      <div className="flex items-start gap-3">
        <GoldenEventIcon type={event.type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {event.time && (
              <Typography className="font-utility text-xs font-bold tabular-nums text-trip-muted">
                {event.time}
              </Typography>
            )}
            <Typography
              className="font-editorial text-[19px] font-bold leading-snug"
              variant="h3"
            >
              {event.title}
            </Typography>
          </div>
          {event.meta && (
            <Typography className="mt-2 font-editorial text-sm leading-relaxed text-trip-muted">
              {event.meta}
            </Typography>
          )}
          {(event.status || event.flexible) && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-utility text-xs">
              {event.status && (
                <span className="text-trip-ready">{event.status}</span>
              )}
              {event.flexible && (
                <span className="text-trip-ready">時間彈性</span>
              )}
            </div>
          )}
          {event.note && (
            <Typography
              className={editorialMarkerClass(
                "attention",
                "mt-4 font-editorial font-bold leading-relaxed",
                { nested: true },
              )}
            >
              「{event.note}」
            </Typography>
          )}
          {(event.map || event.tabelog) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {event.map && (
                <Button
                  className="border-trip-hairline px-4 font-utility text-trip-ink"
                  component="a"
                  startIcon={<Directions />}
                  href={goldenMapHref(event.map)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                >
                  開啟地圖
                </Button>
              )}
              {event.tabelog && (
                <Button
                  className="border-trip-hairline px-4 font-utility text-trip-ink"
                  component="a"
                  href={event.tabelog}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                >
                  食べログ
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
