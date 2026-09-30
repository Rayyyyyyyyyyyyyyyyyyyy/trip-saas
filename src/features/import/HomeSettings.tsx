import { useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Link,
  Typography,
} from "@mui/material";
import { DataObject, ExpandMore, InfoOutlined } from "@mui/icons-material";

import { EditorialMarker } from "../../components/editorial/EditorialPrimitives";
import type { CanonicalTrip } from "../../domain/trip/types";
import type { LocalDataOperations } from "../../persistence/localDataOperations";
import { LocalDataControls } from "./LocalDataControls";

export type HomeSettingsProps = {
  localDataOperations: LocalDataOperations;
  onCanonicalTripFile: (file: File) => Promise<CanonicalTrip>;
  onLocalDataCleared: (scope: "all" | "trip") => void;
};

export function HomeSettings({
  localDataOperations,
  onCanonicalTripFile,
  onLocalDataCleared,
}: HomeSettingsProps) {
  const canonicalInputRef = useRef<HTMLInputElement>(null);
  const [canonicalError, setCanonicalError] = useState<string | null>(null);

  const importCanonical = async (selected: File | undefined) => {
    if (!selected) return;
    setCanonicalError(null);
    try {
      await onCanonicalTripFile(selected);
    } catch (cause) {
      setCanonicalError(
        cause instanceof Error
          ? cause.message
          : "JSON 沒有匯入成功。你現在的行程沒有變動。",
      );
    } finally {
      if (canonicalInputRef.current) canonicalInputRef.current.value = "";
    }
  };

  return (
    <section aria-labelledby="home-settings-title" className="mt-12">
      <Typography
        className="mb-3 block border-b border-trip-hairline pb-3 font-utility text-xs tracking-[0.16em] text-trip-muted uppercase"
        component="h2"
        id="home-settings-title"
      >
        其他設定
      </Typography>

      <LocalDataControls
        operations={localDataOperations}
        onCleared={onLocalDataCleared}
      />

      <Accordion className="bg-transparent">
        <AccordionSummary expandIcon={<ExpandMore />}>
          <span className="flex items-center gap-3">
            <DataObject />
            <Typography className="font-utility font-bold">
              從 JSON 匯入完整行程
            </Typography>
          </span>
        </AccordionSummary>
        <AccordionDetails>
          <Typography className="mb-4 font-editorial leading-7 text-trip-muted">
            手上已有 Trip Runtime 的 CanonicalTrip JSON？可以直接匯入，不會經過
            Gemini。這個版本只支援匯入，還不能匯出。
          </Typography>
          <input
            ref={canonicalInputRef}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => void importCanonical(event.target.files?.[0])}
          />
          <Button
            className="min-h-11"
            variant="outlined"
            onClick={() => canonicalInputRef.current?.click()}
          >
            選擇 JSON 檔
          </Button>
          {canonicalError && (
            <EditorialMarker
              className="mt-4 py-2 font-editorial leading-7"
              role="alert"
              tone="attention"
            >
              {canonicalError}
            </EditorialMarker>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion className="bg-transparent">
        <AccordionSummary expandIcon={<ExpandMore />}>
          <span className="flex items-center gap-3">
            <InfoOutlined />
            <Typography className="font-utility font-bold">
              支援格式與資料安全
            </Typography>
          </span>
        </AccordionSummary>
        <AccordionDetails>
          <div className="space-y-4 font-editorial leading-7 text-trip-muted">
            <Typography>
              目前可以上傳或貼上 Markdown，也可以直接匯入 CanonicalTrip JSON。
            </Typography>
            <Typography>
              Excel／CSV 要等 Markdown 的外部測試通過後才會開放。PDF
              目前不支援匯入。
            </Typography>
            <Typography>
              使用免費版 Gemini API 時，Google
              可能會用你送出的內容與回應改善產品；付費版適用不同規則。若行程含有敏感或機密資訊，送出前請先確認自己方案的資料使用條款。{" "}
              <Link
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                查看 Gemini API 官方條款
              </Link>
            </Typography>
            <Typography>
              API key
              會加密保存在這個瀏覽器。原始檔只保留到這次匯入結束；只有你確認過的行程，才會存到這台裝置。
            </Typography>
          </div>
        </AccordionDetails>
      </Accordion>
    </section>
  );
}
