import { Button, Typography } from "@mui/material";
import { Directions } from "@mui/icons-material";

import {
  EditorialFrame,
  EditorialMarker,
  editorialMarkerClass,
  editorialMeasureClass,
} from "../../components/editorial/EditorialPrimitives";
import type { GoldenDay } from "../../tripData";
import { GoldenDayView } from "./GoldenDayView";
import { GoldenEventIcon } from "./GoldenEventCard";
import { goldenMapHref } from "./goldenMapHref";
import { getGoldenTodayState, getGoldenTripStatus } from "./runtime";
import type { GoldenRuntime } from "./runtime";
import { formatTripMonthDay } from "../result/formatTripDate";

export function GoldenTripStatusView({ runtime }: { runtime: GoldenRuntime }) {
  const status = getGoldenTripStatus(runtime);

  if (status.kind === "unavailable") {
    return (
      <EditorialFrame
        className="py-10 text-center md:py-14"
        markerTone="attention"
      >
        <Typography
          className="font-utility text-trip-attention"
          variant="overline"
        >
          即時狀態暫時無法使用
        </Typography>
        <Typography
          className="mt-3 font-editorial text-[38px] md:text-[56px]"
          variant="h1"
        >
          靜態行程仍可使用
        </Typography>
        <Typography className="mt-3 font-editorial text-trip-muted">
          目前無法取得可靠的日本時間，因此不會猜測「現在」或「接下來」的行程。
        </Typography>
      </EditorialFrame>
    );
  }

  if (status.kind === "completed") {
    return (
      <EditorialFrame className="py-10 text-center md:py-14">
        <Typography className="font-utility text-trip-muted" variant="overline">
          旅程已結束
        </Typography>
        <Typography
          className="mt-3 font-editorial text-[38px] md:text-[56px]"
          variant="h1"
        >
          關西
        </Typography>
        <Typography className="mt-3 font-editorial text-trip-muted">
          完整行程仍可從「每日」查看。
        </Typography>
      </EditorialFrame>
    );
  }

  return (
    <EditorialFrame className="py-8 md:py-10">
      <Typography className="font-utility text-trip-muted" variant="overline">
        接下來
      </Typography>
      <Typography
        className="mt-2 font-editorial text-[38px] md:text-[56px]"
        variant="h1"
      >
        還有 {status.daysToGo} 天出發
      </Typography>
      <Typography className="mt-2 font-utility text-sm text-trip-muted">
        目前日本日期：
        {runtime.date ? formatTripMonthDay(runtime.date) : "無法判定"}
      </Typography>
      <div className="mt-6 flex items-center gap-3 border-t border-trip-hairline pt-6">
        <GoldenEventIcon type="flight" />
        <div>
          <Typography className="font-editorial text-xl font-bold" variant="h3">
            {status.nextEvent.title}
          </Typography>
          <Typography className="font-utility text-sm text-trip-muted">
            {status.nextEvent.detail}
          </Typography>
        </div>
      </div>
    </EditorialFrame>
  );
}

export function GoldenTodayView({
  day,
  onFullDay,
  runtime,
}: {
  day: GoldenDay;
  onFullDay: () => void;
  runtime: GoldenRuntime;
}) {
  if (day.date !== "2026-09-12") {
    return (
      <>
        <Typography className="font-utility text-trip-muted" variant="overline">
          今天 ·{" "}
          {String(Math.floor((runtime.minutes ?? 0) / 60)).padStart(2, "0")}:
          {String((runtime.minutes ?? 0) % 60).padStart(2, "0")} JST
        </Typography>
        <Typography className="mb-8 mt-2 font-editorial text-sm text-trip-muted">
          這一天沒有足夠精確的時間資料，因此不會猜測目前進行中的行程。
        </Typography>
        <GoldenDayView day={day} />
      </>
    );
  }

  const { current, next } = getGoldenTodayState(day, runtime);
  return (
    <div className={editorialMeasureClass}>
      <header className="border-b border-trip-hairline pb-8">
        <Typography className="font-utility text-trip-muted" variant="overline">
          今天 · {day.dow} · {formatTripMonthDay(day.date)}
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

      <section className="mt-8 border-y border-trip-hairline py-6">
        <EditorialMarker tone={current ? "anchor" : "movement"}>
          <Typography
            className={
              current
                ? "font-utility text-trip-anchor"
                : "font-utility text-trip-movement"
            }
            variant="overline"
          >
            {current ? "現在" : "今天"}
          </Typography>
          <div className="mt-3 flex gap-3">
            <GoldenEventIcon type={current?.type || "transport"} />
            <div className="min-w-0">
              <Typography
                className="font-editorial text-2xl font-bold"
                variant="h2"
              >
                {current?.title || "尚未開始今天的行程"}
              </Typography>
              {current?.meta && (
                <Typography className="mt-1 font-editorial text-sm text-trip-muted">
                  {current.meta}
                </Typography>
              )}
              {current?.note && (
                <Typography className="mt-3 font-editorial font-bold">
                  「{current.note}」
                </Typography>
              )}
            </div>
          </div>
        </EditorialMarker>

        {next && (
          <div className="mt-6 border-t border-dashed border-trip-hairline pt-6">
            <Typography
              className="font-utility text-trip-muted"
              variant="overline"
            >
              接下來
            </Typography>
            <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <Typography className="font-utility text-sm font-bold tabular-nums">
                {next.time}
              </Typography>
              <div className="min-w-0">
                <Typography
                  className="font-editorial text-xl font-bold"
                  variant="h3"
                >
                  {next.title}
                </Typography>
                <Typography className="font-editorial text-sm text-trip-muted">
                  {next.meta}
                </Typography>
                {next.status && (
                  <span className="mt-2 inline-block font-utility text-xs font-bold text-trip-ready">
                    {next.status}
                  </span>
                )}
              </div>
              {day.leaveBy && (
                <div
                  className={editorialMarkerClass(
                    "anchor",
                    "text-left sm:text-right",
                    { nested: true },
                  )}
                >
                  <Typography
                    className="font-utility text-[9px] text-trip-muted"
                    variant="overline"
                  >
                    最晚出發
                  </Typography>
                  <Typography className="font-utility font-bold tabular-nums text-trip-anchor">
                    {day.leaveBy}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {next?.map && (
            <Button
              className="bg-trip-ink px-4 font-utility text-trip-paper hover:bg-trip-ink"
              component="a"
              variant="contained"
              startIcon={<Directions />}
              href={goldenMapHref(next.map)}
              target="_blank"
              rel="noopener noreferrer"
            >
              開啟地圖
            </Button>
          )}
          <Button
            className="border-trip-hairline px-4 font-utility text-trip-ink"
            onClick={onFullDay}
            variant="outlined"
          >
            查看完整行程
          </Button>
        </div>
      </section>
    </div>
  );
}
