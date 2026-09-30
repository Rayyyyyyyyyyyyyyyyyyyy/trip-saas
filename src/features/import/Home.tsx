import { Button, Typography } from "@mui/material";

import {
  EditorialMarker,
  EditorialMeasure,
  EditorialSectionHeading,
} from "../../components/editorial/EditorialPrimitives";
import type { CanonicalTrip } from "../../domain/trip/types";
import type { GeminiCredentialRepository } from "../../persistence/geminiCredentialRepository";
import type { LocalDataOperations } from "../../persistence/localDataOperations";
import { HomeSettings } from "./HomeSettings";
import { MarkdownIntakePanel } from "./MarkdownIntakePanel";
import type {
  SourcePreparedHandler,
  useMarkdownIntake,
} from "./useMarkdownIntake";

export type { PreparedMarkdownSource } from "./useMarkdownIntake";

export type HomeProps = {
  activeTrip: CanonicalTrip | null;
  credentialRepository: GeminiCredentialRepository;
  localDataOperations: LocalDataOperations;
  recoveryMessage: string | null;
  onCanonicalTripFile: (file: File) => Promise<CanonicalTrip>;
  onLocalDataCleared: (scope: "all" | "trip") => void;
  onOpenActive: () => void;
  onOpenSample: () => void;
  onSourcePrepared?: SourcePreparedHandler;
  intake?: ReturnType<typeof useMarkdownIntake>;
};

function ActiveTripSummary({
  trip,
  onOpen,
}: {
  trip: CanonicalTrip;
  onOpen: () => void;
}) {
  const title = trip.title ?? "未命名行程";
  const dateRange = `${trip.start_date ?? "日期未定"} — ${trip.end_date ?? "日期未定"}`;
  return (
    <section
      aria-labelledby="active-trip-title"
      className="mt-12 border-t border-trip-hairline pt-5"
    >
      <EditorialSectionHeading id="active-trip-title">
        你目前的行程
      </EditorialSectionHeading>
      <Button
        aria-label="回到目前行程"
        className="mt-3 min-h-16 w-full border border-trip-hairline px-4 py-3 text-left normal-case"
        onClick={onOpen}
        variant="outlined"
      >
        <span className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center font-editorial text-trip-ready"
          >
            {title.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block break-words font-editorial text-base font-semibold text-trip-ink">
              {title}
            </span>
            <span className="mt-1 block font-utility text-xs text-trip-muted">
              {dateRange}
            </span>
          </span>
          <span className="font-utility text-xs font-bold text-trip-ready">
            已確認
          </span>
        </span>
      </Button>
    </section>
  );
}

export function Home({
  activeTrip,
  credentialRepository,
  localDataOperations,
  recoveryMessage,
  onCanonicalTripFile,
  onLocalDataCleared,
  onOpenActive,
  onOpenSample,
  onSourcePrepared,
  intake,
}: HomeProps) {
  return (
    <main
      aria-label="Trip Runtime 首頁"
      className="min-h-screen bg-trip-paper text-trip-ink"
    >
      <EditorialMeasure className="px-[22px] py-16 md:px-10 md:py-20">
        <header>
          <Typography className="font-utility text-xs tracking-[0.22em] text-trip-anchor">
            TRIP RUNTIME
          </Typography>
          <Typography
            className="mt-3 max-w-2xl font-editorial text-[27px] leading-[1.25] font-black break-words sm:text-[44px] sm:leading-[1.2]"
            component="h1"
          >
            把你已經有的行程，變成旅行當下能用的介面。
          </Typography>
          <Typography className="mt-3 max-w-xl font-editorial text-[13.5px] leading-7 text-trip-muted sm:mt-4 sm:text-base">
            不重新規劃、不推薦景點、不幫你改行程。只把你寫好的那份讀懂、跟你確認過，然後在路上好好呈現。
          </Typography>
        </header>

        {recoveryMessage && (
          <EditorialMarker className="mt-7 py-2" role="alert" tone="attention">
            <span className="mr-2 font-utility text-xs font-bold text-trip-attention">
              需要留意
            </span>
            {recoveryMessage}
          </EditorialMarker>
        )}

        <MarkdownIntakePanel
          credentialRepository={credentialRepository}
          onSourcePrepared={onSourcePrepared}
          intake={intake}
        />

        {activeTrip && (
          <ActiveTripSummary trip={activeTrip} onOpen={onOpenActive} />
        )}

        <section
          aria-label="之後可以再補的資料"
          className="mt-10 border-y border-trip-hairline py-5"
        >
          <EditorialSectionHeading id="optional-profile-title">
            其他資料，之後再說
          </EditorialSectionHeading>
          <Typography className="mt-2 font-editorial leading-7 text-trip-muted">
            不用先填姓名或偏好。把行程放進來，就可以開始。
          </Typography>
        </section>

        <HomeSettings
          localDataOperations={localDataOperations}
          onCanonicalTripFile={onCanonicalTripFile}
          onLocalDataCleared={onLocalDataCleared}
        />

        <footer className="mt-10 border-t border-trip-hairline pt-5">
          <Button className="min-h-11 px-0 underline" onClick={onOpenSample}>
            先看看大阪 2026 範例
          </Button>
          <Typography className="mt-1 block font-utility text-xs leading-5 text-trip-muted">
            只有你主動開啟才會載入，也不會換掉目前的行程。
          </Typography>
        </footer>
      </EditorialMeasure>
    </main>
  );
}
