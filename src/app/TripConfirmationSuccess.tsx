import { Button } from "@mui/material";

import { EditorialMeasure } from "../components/editorial/EditorialPrimitives";
import type { CanonicalTrip } from "../domain/trip/types";

export type TripConfirmationSuccessProps = {
  trip: CanonicalTrip;
  onOpenTrip: () => void;
  onShowHome: () => void;
};

export function TripConfirmationSuccess({
  trip,
  onOpenTrip,
  onShowHome,
}: TripConfirmationSuccessProps) {
  return (
    <main className="min-h-screen bg-trip-paper px-5 py-10 text-trip-ink sm:px-8 sm:py-16">
      <EditorialMeasure
        aria-labelledby="confirmation-success-title"
        className="flex flex-col gap-8 border-y border-trip-hairline py-8"
        role="region"
      >
        <div className="flex flex-col gap-3">
          <p className="font-utility text-xs font-bold tracking-[0.18em] text-trip-ready uppercase">
            儲存完成
          </p>
          <h1
            className="break-words font-editorial text-3xl leading-tight font-black sm:text-4xl"
            id="confirmation-success-title"
          >
            「{trip.title ?? "未命名行程"}」已經可以使用
          </h1>
          <p className="max-w-prose font-editorial text-base leading-7 text-trip-muted">
            這份行程已設為此裝置的目前行程。你可以直接開啟，也可以回到首頁管理本機資料。
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 border-y border-trip-hairline py-5 sm:grid-cols-3">
          <div>
            <dt className="font-utility text-xs font-semibold tracking-[0.14em] text-trip-muted uppercase">
              日期
            </dt>
            <dd className="mt-1 font-editorial text-sm font-medium">
              {trip.start_date ?? "日期未定"} — {trip.end_date ?? "日期未定"}
            </dd>
          </div>
          <div>
            <dt className="font-utility text-xs font-semibold tracking-[0.14em] text-trip-muted uppercase">
              天數
            </dt>
            <dd className="mt-1 font-editorial text-sm font-medium">
              {trip.days.length}
            </dd>
          </div>
          <div>
            <dt className="font-utility text-xs font-semibold tracking-[0.14em] text-trip-muted uppercase">
              行程項目
            </dt>
            <dd className="mt-1 font-editorial text-sm font-medium">
              {trip.entities.length}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="min-h-11 sm:flex-1"
            onClick={onOpenTrip}
            variant="contained"
          >
            開啟這份行程
          </Button>
          <Button
            className="min-h-11 sm:flex-1"
            onClick={onShowHome}
            variant="outlined"
          >
            回到首頁管理行程
          </Button>
        </div>
      </EditorialMeasure>
    </main>
  );
}
