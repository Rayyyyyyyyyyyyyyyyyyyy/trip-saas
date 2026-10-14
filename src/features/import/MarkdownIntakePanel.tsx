import { useEffect, useRef } from "react";
import { useTripIntakeWorkflow } from "../../app/useTripIntakeWorkflow";
import {
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Dialog,
  LinearProgress,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check,
  DescriptionOutlined,
  Key,
  UploadFile,
} from "@mui/icons-material";

import {
  EditorialMarker,
  editorialMeasureClass,
} from "../../components/editorial/EditorialPrimitives";
import type { GeminiCredentialRepository } from "../../persistence/geminiCredentialRepository";
import { GeminiCredentialControls } from "./GeminiCredentialControls";
import { INTAKE_FAILURE_HEADING } from "./intakeFailure";
import {
  useMarkdownIntake,
  type IntakeMode,
  type IntakeStage,
  type SourcePreparedHandler,
} from "./useMarkdownIntake";

export type MarkdownIntakePanelProps = {
  credentialRepository: GeminiCredentialRepository;
  onSourcePrepared?: SourcePreparedHandler;
  intake?: ReturnType<typeof useMarkdownIntake>;
};

const stageLabel: Record<IntakeStage, string> = {
  idle: "還沒選行程",
  reading: "正在讀取行程",
  constructing: "正在整理內容",
  awaiting_interpretation: "內容已讀取，等待 Gemini 判讀",
  interpreting: "Gemini 正在判讀內容",
  validating: "正在檢查判讀結果",
  prepared: "整理完成，可以開始校對",
  failed: "這份行程尚未處理完成",
};

const progressStages = [
  "讀取行程",
  "整理內容",
  "Gemini 判讀",
  "檢查結果",
] as const;

function activeProgressStep(stage: IntakeStage) {
  switch (stage) {
    case "reading":
      return 0;
    case "constructing":
      return 1;
    case "awaiting_interpretation":
    case "interpreting":
      return 2;
    case "validating":
      return 3;
    case "prepared":
      return 4;
    default:
      return -1;
  }
}

function MarkdownSourceSelector({
  intake,
}: {
  intake: ReturnType<typeof useMarkdownIntake>;
}) {
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const openFileChooser = () => {
    if (markdownInputRef.current) markdownInputRef.current.value = "";
    markdownInputRef.current?.click();
  };

  if (intake.mode === "paste") {
    return (
      <div>
        <TextField
          className="w-full"
          error={intake.pasteTouched && intake.isEmptyPaste}
          helperText={
            intake.pasteTouched && intake.isEmptyPaste
              ? "請先貼上行程內容。"
              : `共 ${intake.paste.length.toLocaleString()} 個字元`
          }
          label="貼上 Markdown 行程內容"
          minRows={9}
          multiline
          onBlur={intake.touchPaste}
          onChange={(event) => intake.changePaste(event.target.value)}
          placeholder={"# 關西行程\n\n## 9月10日…"}
          value={intake.paste}
        />
        <Button
          className="mt-2 min-h-11 px-0 underline"
          disabled={!intake.paste}
          onClick={intake.clearPaste}
        >
          清空內容
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        accept=".md,.markdown,.xlsx,.csv,text/markdown,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(event) => intake.selectFile(event.target.files?.[0] ?? null)}
        ref={markdownInputRef}
        type="file"
      />
      {intake.file ? (
        <section
          aria-label="已選擇行程檔案"
          className="border border-trip-ink bg-trip-paper px-5 py-5 sm:px-6 sm:py-6"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center border border-trip-hairline text-trip-ready">
              <DescriptionOutlined aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-utility text-[11px] font-bold tracking-[.14em] text-trip-ready">
                <Check aria-hidden="true" fontSize="small" />
                已選擇
              </span>
              <Typography
                className="mt-2 break-all font-editorial text-xl leading-snug font-black text-trip-ink"
                component="h3"
              >
                {intake.file.name}
              </Typography>
              <Typography className="mt-1 font-utility text-xs text-trip-muted">
                {intake.file.size.toLocaleString()} bytes · 等待送出判讀
              </Typography>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-trip-hairline pt-3">
            <Button
              className="min-h-11 px-0 underline"
              onClick={openFileChooser}
            >
              更換檔案
            </Button>
            <Button
              className="min-h-11 px-0 underline"
              onClick={() => intake.selectFile(null)}
            >
              移除檔案
            </Button>
          </div>
        </section>
      ) : (
        <Button
          className="flex min-h-44 w-full flex-col gap-3 border border-trip-hairline bg-trip-paper px-5 py-8 text-trip-ink sm:min-h-48 sm:py-12"
          fullWidth
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            intake.selectFile(event.dataTransfer.files?.[0] ?? null);
          }}
          onClick={openFileChooser}
          variant="outlined"
        >
          <span className="grid h-12 w-12 place-items-center border border-trip-hairline text-trip-anchor sm:h-14 sm:w-14">
            <UploadFile aria-hidden="true" />
          </span>
          <span className="font-utility text-base font-bold sm:text-lg">
            <span className="sm:hidden">選擇行程檔案</span>
            <span className="hidden sm:inline">把行程檔案拖進來或點此選擇</span>
          </span>
          <span className="font-utility text-xs font-normal text-trip-muted sm:text-[13px]">
            Markdown · 原始檔只用於這次匯入，不會被修改
          </span>
        </Button>
      )}
      <Typography className="mt-2 font-utility text-xs text-trip-muted">
        支援 .md 或 .markdown，單一檔案最多 1 MB
      </Typography>
      {intake.isSpreadsheet &&
        intake.spreadsheet &&
        intake.spreadsheet.format !== "csv" &&
        intake.spreadsheet.visibleSheets.length > 1 && (
          <section
            aria-label="選擇要判讀的分頁"
            className="mt-5 border-y border-trip-hairline py-4"
          >
            <Typography
              component="h3"
              className="font-editorial text-lg font-bold"
            >
              選擇要判讀的分頁
            </Typography>
            <Typography className="mt-1 font-utility text-xs leading-6 text-trip-muted">
              預設選取所有可見分頁，至少保留一頁。取消的分頁不會送出判讀；隱藏分頁不會匯入。
            </Typography>
            <Typography className="mt-1 font-utility text-xs leading-6 text-trip-muted">
              試算表匯入仍在驗收中。內嵌圖片不會匯入；目前只讀取儲存格顯示內容。
            </Typography>
            <div className="mt-2 grid min-w-0">
              {intake.spreadsheet.visibleSheets.map((sheet) => (
                <FormControlLabel
                  key={sheet.id}
                  className="m-0 min-h-11 min-w-0 [&_.MuiFormControlLabel-label]:min-w-0 [&_.MuiFormControlLabel-label]:break-all"
                  control={
                    <Checkbox
                      checked={intake.selectedSheetIds.includes(sheet.id)}
                      onChange={(_, checked) =>
                        intake.selectSheet(sheet.id, checked)
                      }
                    />
                  }
                  label={sheet.name}
                />
              ))}
            </div>
            {intake.selectedSheetIds.length === 0 && (
              <Typography
                role="alert"
                className="mt-2 font-utility text-sm text-trip-attention"
              >
                至少選擇一個分頁才能判讀。
              </Typography>
            )}
          </section>
        )}
    </div>
  );
}

function MarkdownProcessingDialog({
  intake,
}: {
  intake: ReturnType<typeof useMarkdownIntake>;
}) {
  if (!intake.isBusy) return null;

  const currentProgressStep = activeProgressStep(intake.stage);
  const sourceLabel =
    intake.mode === "file" && intake.file
      ? intake.file.name
      : "貼上的 Markdown 行程";

  return (
    <Dialog
      aria-describedby="markdown-processing-description"
      aria-labelledby="markdown-processing-title"
      disableEscapeKeyDown
      fullScreen
      open
    >
      <main className="min-h-full bg-trip-paper text-trip-ink">
        <div
          className={`${editorialMeasureClass} px-[22px] py-16 sm:px-10 sm:py-20`}
        >
          <Typography className="font-utility text-[11px] font-bold tracking-[.18em] text-trip-faint">
            正在讀懂你的行程
          </Typography>
          <Typography
            className="mt-3 break-all font-editorial text-2xl leading-tight font-black sm:text-3xl"
            component="h1"
            id="markdown-processing-title"
          >
            {sourceLabel}
          </Typography>
          <Typography
            className="mt-2 font-utility text-sm text-trip-muted"
            id="markdown-processing-description"
            role="status"
          >
            {stageLabel[intake.stage]}
          </Typography>

          {intake.interpretationProgress &&
            intake.interpretationProgress.total > 1 && (
              <Typography
                aria-live="polite"
                aria-atomic="true"
                className="mt-2 font-utility text-sm text-trip-muted"
              >
                已完成 {intake.interpretationProgress.completed}/
                {intake.interpretationProgress.total} 段判讀
              </Typography>
            )}

          <LinearProgress
            aria-label="Gemini 行程判讀進度"
            className="mt-8 h-1"
          />

          <ol className="mt-8 space-y-4 font-utility">
            {progressStages.map((label, index) => {
              const complete = currentProgressStep > index;
              const current = currentProgressStep === index;
              return (
                <li
                  aria-current={current ? "step" : undefined}
                  className="grid grid-cols-[24px_1fr_auto] items-center gap-3"
                  key={label}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center border-2 text-[10px] font-bold ${
                      complete
                        ? "border-trip-ready bg-trip-ready text-trip-paper"
                        : current
                          ? "border-trip-anchor text-trip-anchor"
                          : "border-trip-hairline text-trip-faint"
                    }`}
                  >
                    {complete ? "✓" : index + 1}
                  </span>
                  <span
                    className={
                      current
                        ? "font-bold text-trip-ink"
                        : complete
                          ? "text-trip-muted"
                          : "text-trip-faint"
                    }
                  >
                    {label}
                  </span>
                  {current && <CircularProgress size={20} />}
                </li>
              );
            })}
          </ol>

          <Button
            className="mt-8 min-h-11"
            variant="outlined"
            onClick={intake.stop}
          >
            停止這次判讀
          </Button>

          <div className="mt-10 bg-trip-sunk px-5 py-4 font-editorial text-sm leading-7 text-trip-muted">
            解析完成前，這個頁面會暫時鎖定，避免切換檔案或重複送出。程式會先讀來源、交給
            Gemini 理解語意，再在本機檢查一次。
          </div>
        </div>
      </main>
    </Dialog>
  );
}

// The blocking dialog owns focus while intake runs. When it closes on failure,
// focus has to land on the recovery notice instead of the document body, so the
// failure is announced once and keyboard users start where they can act.
function MarkdownIntakeFailureNotice({
  intake,
}: {
  intake: ReturnType<typeof useMarkdownIntake>;
}) {
  const noticeRef = useRef<HTMLDivElement>(null);
  const failure = intake.failure;

  useEffect(() => {
    if (failure) noticeRef.current?.focus();
  }, [failure]);

  if (!failure) return null;

  return (
    <EditorialMarker
      className="py-3"
      ref={noticeRef}
      role="alert"
      tabIndex={-1}
      tone="attention"
    >
      <Typography
        className="font-editorial text-lg leading-snug font-black text-trip-ink"
        component="h3"
      >
        {INTAKE_FAILURE_HEADING}
      </Typography>
      <Typography className="mt-2 font-editorial leading-7 break-words text-trip-muted">
        {failure.message}
      </Typography>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-trip-hairline pt-3">
        {failure.recoverable && (
          <Button
            className="min-h-11 px-0 underline"
            disabled={!intake.canRetry}
            onClick={() => void intake.processSource()}
          >
            重新送出這份行程
          </Button>
        )}
        <span className="self-center font-utility text-xs text-trip-muted">
          也可以在上方換一份檔案或改寫貼上的內容。
        </span>
      </div>
    </EditorialMarker>
  );
}

function MarkdownIntakeProgress({
  intake,
}: {
  intake: ReturnType<typeof useMarkdownIntake>;
}) {
  const currentProgressStep = activeProgressStep(intake.stage);
  if (currentProgressStep < 0) return null;

  const processing = [
    "reading",
    "constructing",
    "interpreting",
    "validating",
  ].includes(intake.stage);

  return (
    <section
      aria-label="匯入處理進度"
      className="border-y border-trip-hairline py-5"
    >
      {processing && <LinearProgress className="mb-4 h-px" />}
      <ol className="space-y-0 font-utility">
        {progressStages.map((label, index) => {
          const complete = currentProgressStep > index;
          const current = currentProgressStep === index;
          return (
            <li
              aria-current={current ? "step" : undefined}
              className="grid min-h-11 grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-trip-hairline py-2 last:border-b-0"
              key={label}
            >
              <span
                aria-hidden="true"
                className={`text-xs font-bold ${
                  complete || current ? "text-trip-ready" : "text-trip-faint"
                }`}
              >
                {complete ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  current ? "font-bold text-trip-ink" : "text-trip-muted"
                }
              >
                {label}
              </span>
              {index === 2 &&
                (intake.stage === "awaiting_interpretation" ||
                  intake.stage === "interpreting") && (
                  <CircularProgress
                    aria-label={
                      intake.stage === "awaiting_interpretation"
                        ? "Gemini 語意判讀等待連接"
                        : "Gemini 語意判讀進行中"
                    }
                    size={22}
                  />
                )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function MarkdownIntakePanel({
  credentialRepository,
  onSourcePrepared,
  intake: suppliedIntake,
}: MarkdownIntakePanelProps) {
  const fallbackController = useTripIntakeWorkflow({ onSourcePrepared });
  const fallbackIntake = useMarkdownIntake(fallbackController);
  const intake = suppliedIntake ?? fallbackIntake;
  const stateTone =
    intake.stage === "prepared"
      ? "text-trip-ready"
      : intake.stage === "failed"
        ? "text-trip-attention"
        : "text-trip-muted";

  return (
    <section aria-labelledby="markdown-intake-title" className="mt-7">
      <Typography className="sr-only" component="h2" id="markdown-intake-title">
        放進一份行程
      </Typography>

      <div className="mb-5 w-full bg-trip-sunk p-1 sm:w-[290px]">
        <Tabs
          aria-label="選擇行程輸入方式"
          onChange={(_, value: IntakeMode) => intake.selectMode(value)}
          slotProps={{ indicator: { className: "hidden" } }}
          value={intake.mode}
          variant="fullWidth"
        >
          <Tab
            className="min-h-11 font-utility font-bold text-trip-ink [&.Mui-selected]:bg-trip-ink [&.Mui-selected]:text-trip-paper"
            label="上傳檔案"
            value="file"
          />
          <Tab
            className="min-h-11 font-utility font-bold text-trip-ink [&.Mui-selected]:bg-trip-ink [&.Mui-selected]:text-trip-paper"
            label="直接貼上"
            value="paste"
          />
        </Tabs>
      </div>

      <div className="space-y-6">
        <MarkdownSourceSelector intake={intake} />

        <section
          aria-labelledby="gemini-key-title"
          className="border border-trip-hairline p-4 sm:p-5"
        >
          <div className="mb-4 flex items-start gap-3">
            <Key className="text-trip-movement" />
            <div className="min-w-0 flex-1">
              <Typography
                className="font-utility font-bold"
                component="h3"
                id="gemini-key-title"
              >
                Gemini API key
              </Typography>
              <Typography className="mt-1 font-utility text-xs text-trip-muted">
                只保存在這個瀏覽器，不會跟著行程移動。
              </Typography>
            </div>
          </div>
          <GeminiCredentialControls repository={credentialRepository} />
        </section>

        <EditorialMarker
          className="py-2 font-editorial leading-7"
          tone="movement"
        >
          {intake.interprets
            ? "開始後，這份行程內容會送到 Gemini 判讀。"
            : "這一步只會在瀏覽器中整理內容，還不會送到 Gemini。"}
          原始檔案與校對資料只保留到這次匯入結束，不會寫進正式行程。
        </EditorialMarker>

        <MarkdownIntakeProgress intake={intake} />

        <MarkdownIntakeFailureNotice intake={intake} />
        {intake.prepared && intake.stage === "awaiting_interpretation" && (
          <EditorialMarker
            className="py-2 font-editorial leading-7"
            role="status"
            tone="movement"
          >
            已整理出 {intake.prepared.document.evidence_units.length} 段行程內容
            {intake.prepared.document.extraction_findings.length
              ? `；有 ${intake.prepared.document.extraction_findings.length} 個圖片或附件提示，不影響其他內容。`
              : "。"}
            尚未連接 Gemini 判讀，因此目前行程沒有變動。
          </EditorialMarker>
        )}
        {intake.prepared && intake.stage === "prepared" && (
          <EditorialMarker
            className="py-2 font-editorial leading-7"
            role="status"
            tone="ready"
          >
            已整理出 {intake.prepared.document.evidence_units.length} 段行程內容
            {intake.prepared.document.extraction_findings.length
              ? `；有 ${intake.prepared.document.extraction_findings.length} 個圖片或附件提示，不影響其他內容。`
              : "。"}
            Gemini 判讀與檢查已完成，接下來請校對整理結果。
          </EditorialMarker>
        )}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button
            className="min-h-11 w-full px-6 sm:w-auto"
            disabled={!intake.canStart}
            onClick={() => void intake.processSource()}
            size="large"
            variant="contained"
          >
            {intake.prepared
              ? "重新處理"
              : intake.interprets
                ? "送給 Gemini 判讀"
                : "先讀取行程"}
          </Button>
          <span className={`font-utility text-xs font-bold ${stateTone}`}>
            {stageLabel[intake.stage]}
          </span>
        </div>
      </div>

      <MarkdownProcessingDialog intake={intake} />
    </section>
  );
}
