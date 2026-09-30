import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import {
  EditorialMarker,
  EditorialMeasure,
  EditorialSectionHeading,
} from "../../components/editorial/EditorialPrimitives";
import type {
  DraftEntity,
  ParsedTripDraft,
  SemanticInterpretationResult,
  SemanticType,
  TimeKind,
} from "../../domain/trip/types";
import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";
import {
  addMissedEntity,
  deleteFalseEntity,
  deriveReviewFindings,
  deriveUnparsedItemFindings,
  editReviewDay,
  editReviewEntity,
  editReviewTrip,
  isMechanicallyRevalidatedFinding,
  resolveReviewFinding,
  revertEntityCorrection,
  type ReviewEntityFieldPath,
} from "./reviewCandidate";
import { ReviewFindingList } from "./ReviewFindingList";
import type { ReviewAdjustment } from "./reviewAdjustment";
import { SourceExcerpt } from "./SourceExcerpt";

const semanticTypes: SemanticType[] = [
  "flight",
  "accommodation",
  "transit",
  "activity",
  "restaurant",
  "free_time",
  "reservation",
  "ticket",
  "preparation",
  "note",
  "unknown",
];

const timeKinds: TimeKind[] = [
  "exact",
  "approximate",
  "range",
  "daypart",
  "none",
  "open_ended",
  "all_day",
];

const semanticTypeLabels: Record<SemanticType, string> = {
  accommodation: "住宿",
  activity: "活動",
  flight: "航班",
  free_time: "自由時間",
  note: "備註",
  preparation: "行前準備",
  reservation: "預約",
  restaurant: "餐廳",
  ticket: "票券",
  transit: "交通移動",
  unknown: "待判定",
};

const timeKindLabels: Record<TimeKind, string> = {
  all_day: "全天",
  approximate: "約略時間",
  daypart: "時段",
  exact: "確切時間",
  none: "沒有時間",
  open_ended: "只有開始時間",
  range: "時間範圍",
};

const daypartLabels: Record<string, string> = {
  afternoon: "下午",
  evening: "傍晚",
  morning: "上午",
  night: "晚上",
  unknown: "待確認",
};

const stateFlagLabels = {
  flexible: "時間有彈性",
  optional: "可選行程",
  tentative: "暫定",
} as const;

type ReviewScreenProps = {
  adjustments: ReviewAdjustment[];
  busy?: boolean;
  evidence: ReviewEvidenceProjection;
  draft: ParsedTripDraft;
  errorMessage?: string | null;
  interpretation: SemanticInterpretationResult;
  onCancel: () => void;
  onConfirm: () => void;
  onDraftChange: (draft: ParsedTripDraft) => void;
  originalDraft: ParsedTripDraft;
};

function originalValue(
  original: DraftEntity | undefined,
  current: DraftEntity,
  field: "title" | "semantic_type",
) {
  if (!original || original[field] === current[field]) return null;
  return String(original[field]);
}

function EntityEditor({
  evidence,
  draft,
  entity,
  onDraftChange,
  originalDraft,
}: {
  evidence: ReviewEvidenceProjection;
  draft: ParsedTripDraft;
  entity: DraftEntity;
  onDraftChange: (draft: ParsedTripDraft) => void;
  originalDraft: ParsedTripDraft;
}) {
  const original = originalDraft.entities.find((item) => item.id === entity.id);
  const edit = (
    field: ReviewEntityFieldPath,
    change: (candidate: DraftEntity) => void,
  ) => onDraftChange(editReviewEntity(draft, entity.id, field, change));
  const titleOriginal = originalValue(original, entity, "title");
  const semanticOriginal = originalValue(original, entity, "semantic_type");

  return (
    <article className="space-y-5 border-t border-trip-hairline py-6 md:py-8">
      <SourceExcerpt items={evidence.itemsFor(entity.source_refs)} />

      {entity.provenance.origin === "user" && (
        <EditorialMarker className="py-1" tone="ready">
          <Typography className="font-utility text-[11px] font-bold tracking-[0.12em] text-trip-ready">
            你的校正
          </Typography>
        </EditorialMarker>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="標題"
          value={entity.title}
          helperText={titleOriginal ? `原始：${titleOriginal}` : undefined}
          onChange={(event) =>
            edit("title", (candidate) => {
              candidate.title = event.target.value;
            })
          }
          className="w-full"
        />
        <TextField
          select
          label="安排到哪一天"
          value={entity.day_id ?? ""}
          onChange={(event) =>
            edit("day_id", (candidate) => {
              candidate.day_id = event.target.value || null;
            })
          }
          className="w-full"
        >
          <MenuItem value="">尚未歸入日期</MenuItem>
          {draft.days.map((day) => (
            <MenuItem key={day.id} value={day.id}>
              {day.date} · {day.title ?? day.label ?? day.id}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="語意類型"
          value={entity.semantic_type}
          helperText={
            semanticOriginal ? `原始：${semanticOriginal}` : undefined
          }
          onChange={(event) =>
            edit("semantic_type", (candidate) => {
              candidate.semantic_type = event.target.value as SemanticType;
            })
          }
          className="w-full"
        >
          {semanticTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {semanticTypeLabels[type]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="地點"
          value={entity.place.name ?? ""}
          onChange={(event) =>
            edit("place.name", (candidate) => {
              candidate.place.name = event.target.value || null;
            })
          }
          className="w-full"
        />
        <TextField
          label="地址 / 地點原文"
          value={entity.place.address ?? entity.place.raw_text ?? ""}
          onChange={(event) =>
            edit("place.address", (candidate) => {
              candidate.place.address = event.target.value || null;
            })
          }
          className="w-full"
        />
        <TextField
          label="備註"
          value={entity.notes.join("\n")}
          onChange={(event) =>
            edit("notes", (candidate) => {
              candidate.notes = event.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
            })
          }
          multiline
          className="w-full"
        />
      </div>

      {entity.actions.length > 0 && (
        <div className="space-y-1">
          <Typography variant="overline">保留的參考連結</Typography>
          {entity.actions.map((action) => (
            <Typography key={action.id} variant="body2">
              {action.label} · {action.url}
            </Typography>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          select
          label="時間精度"
          value={entity.time.kind}
          onChange={(event) =>
            edit("time.kind", (candidate) => {
              const kind = event.target.value as TimeKind;
              candidate.time.kind = kind;
              candidate.time.start = ["daypart", "none", "all_day"].includes(
                kind,
              )
                ? null
                : candidate.time.start;
              candidate.time.end = kind === "range" ? candidate.time.end : null;
              candidate.time.daypart = kind === "daypart" ? "unknown" : null;
              candidate.time.crosses_midnight =
                kind === "range" && candidate.time.crosses_midnight;
            })
          }
          className="w-full"
        >
          {timeKinds.map((kind) => (
            <MenuItem key={kind} value={kind}>
              {timeKindLabels[kind]}
            </MenuItem>
          ))}
        </TextField>
        {!["daypart", "none", "all_day"].includes(entity.time.kind) && (
          <TextField
            label="開始"
            placeholder="HH:MM"
            value={entity.time.start ?? ""}
            onChange={(event) =>
              edit("time.start", (candidate) => {
                candidate.time.start = event.target.value || null;
              })
            }
            className="w-full"
          />
        )}
        {entity.time.kind === "range" && (
          <TextField
            label="結束"
            placeholder="HH:MM"
            value={entity.time.end ?? ""}
            onChange={(event) =>
              edit("time.end", (candidate) => {
                candidate.time.end = event.target.value || null;
              })
            }
            className="w-full"
          />
        )}
        {entity.time.kind === "daypart" && (
          <TextField
            select
            label="時段"
            value={entity.time.daypart ?? "unknown"}
            onChange={(event) =>
              edit("time.daypart", (candidate) => {
                candidate.time.daypart = event.target
                  .value as DraftEntity["time"]["daypart"];
              })
            }
            className="w-full"
          >
            {["morning", "afternoon", "evening", "night", "unknown"].map(
              (daypart) => (
                <MenuItem value={daypart} key={daypart}>
                  {daypartLabels[daypart]}
                </MenuItem>
              ),
            )}
          </TextField>
        )}
      </div>

      <div className="flex flex-col gap-1 sm:flex-row">
        {(["optional", "tentative", "flexible"] as const).map((flag) => (
          <FormControlLabel
            key={flag}
            control={
              <Checkbox
                checked={entity.state[flag]}
                onChange={(event) =>
                  edit(`state.${flag}`, (candidate) => {
                    candidate.state[flag] = event.target.checked;
                  })
                }
              />
            }
            label={stateFlagLabels[flag]}
          />
        ))}
        {entity.time.kind === "range" && (
          <FormControlLabel
            control={
              <Checkbox
                checked={entity.time.crosses_midnight}
                onChange={(event) =>
                  edit("time.crosses_midnight", (candidate) => {
                    candidate.time.crosses_midnight = event.target.checked;
                  })
                }
              />
            }
            label="跨午夜"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row">
        <Button
          className="min-h-11"
          variant="outlined"
          onClick={() =>
            onDraftChange(
              revertEntityCorrection(draft, originalDraft, entity.id),
            )
          }
        >
          {original ? "還原這筆修正" : "移除這筆新增內容"}
        </Button>
        <Button
          className="min-h-11"
          color="error"
          variant="text"
          onClick={() => onDraftChange(deleteFalseEntity(draft, entity.id))}
        >
          刪除誤判內容
        </Button>
      </div>
    </article>
  );
}

export function ReviewScreen({
  adjustments,
  busy = false,
  evidence,
  draft,
  errorMessage = null,
  interpretation,
  onCancel,
  onConfirm,
  onDraftChange,
  originalDraft,
}: ReviewScreenProps) {
  const [fullReviewOpen, setFullReviewOpen] = useState(false);
  const materialFindings = useMemo(
    () => [
      ...interpretation.findings,
      ...deriveUnparsedItemFindings(interpretation.coverage.unparsed_items),
      ...evidence.findings.map((finding) => ({
        blocking: false,
        code: finding.code,
        message: finding.message,
        severity: finding.severity,
        source_refs: finding.source_refs,
      })),
    ],
    [
      evidence.findings,
      interpretation.coverage.unparsed_items,
      interpretation.findings,
    ],
  );
  const findings = useMemo(
    () => deriveReviewFindings(draft, materialFindings),
    [draft, materialFindings],
  );
  const blocking = findings.some((finding) => finding.blocking);
  const blockingFindings = findings.filter((finding) => finding.blocking);
  const informationalFindings = findings.filter((finding) => !finding.blocking);
  const tripTitle = draft.trip.title ?? "未命名行程";
  const tripRange =
    draft.trip.start_date && draft.trip.end_date
      ? `${draft.trip.start_date} 至 ${draft.trip.end_date}`
      : "日期未完整確定";

  return (
    <main
      aria-label="校對行程"
      className="min-h-screen bg-trip-paper py-8 text-trip-ink md:py-14"
    >
      <EditorialMeasure className="space-y-10 px-4 sm:px-6 md:px-0">
        <header className="space-y-3">
          <Typography className="font-utility text-xs tracking-[0.18em] text-trip-anchor">
            對照原文校對
          </Typography>
          <Typography
            className="font-editorial text-[34px] leading-tight font-black md:text-5xl"
            component="h1"
          >
            對照原文，把行程確認清楚。
          </Typography>
          <Typography className="font-editorial leading-7 text-trip-muted">
            你在這裡的修改只會套用到這次匯入。確認並成功儲存前，原本的行程不會被取代。
          </Typography>
        </header>

        {errorMessage && (
          <EditorialMarker className="py-2" role="alert" tone="attention">
            <Typography className="font-utility text-xs font-bold text-trip-attention">
              儲存未完成
            </Typography>
            <Typography className="mt-1 font-editorial leading-7">
              {errorMessage}
            </Typography>
          </EditorialMarker>
        )}

        <section
          aria-label="行程摘要"
          className="space-y-3 border-y border-trip-hairline py-6"
        >
          <Typography className="font-utility text-xs font-bold tracking-[0.14em] text-trip-anchor">
            這次會使用的行程
          </Typography>
          <Typography className="font-editorial text-3xl font-black leading-tight">
            {tripTitle}
          </Typography>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-utility text-sm text-trip-muted">
            <span>
              {draft.days.length} 天 · {draft.entities.length} 筆行程
            </span>
            <span>{tripRange}</span>
          </div>
        </section>

        <section className="space-y-3" aria-label="系統保守調整">
          <EditorialSectionHeading>
            系統保守調整 {adjustments.length} 項
          </EditorialSectionHeading>
          {adjustments.length === 0 ? (
            <Typography className="font-editorial leading-7 text-trip-muted">
              沒有需要系統調整的來源精度。
            </Typography>
          ) : (
            adjustments.map((adjustment) => (
              <EditorialMarker
                className="space-y-1 py-2"
                key={adjustment.id}
                tone="movement"
              >
                <Typography className="font-utility text-xs font-bold text-trip-muted">
                  已保留原文並移除沒有來源支持的時間精度
                </Typography>
                <Typography className="font-editorial text-sm leading-6">
                  原先：{timeKindLabels[adjustment.before.kind]}
                  {adjustment.before.start
                    ? ` ${adjustment.before.start}`
                    : adjustment.before.daypart
                      ? ` ${daypartLabels[adjustment.before.daypart]}`
                      : ""}
                  {" → "}現在：時間未定，保留「
                  {adjustment.after.raw_text}」
                </Typography>
              </EditorialMarker>
            ))
          )}
        </section>

        {blockingFindings.length === 0 ? (
          <section className="space-y-3" aria-label="需要你決定">
            <EditorialSectionHeading>需要你決定</EditorialSectionHeading>
            <Typography className="font-editorial leading-7 text-trip-muted">
              沒有需要你決定的問題
            </Typography>
          </section>
        ) : (
          <ReviewFindingList
            evidence={evidence}
            findings={blockingFindings}
            heading="需要你決定"
            headingId="review-blockers"
            onResolveFinding={(finding) => {
              if (!isMechanicallyRevalidatedFinding(finding)) {
                onDraftChange(resolveReviewFinding(draft, finding));
              }
            }}
          />
        )}

        <section className="space-y-6" aria-label="完整校對內容">
          <Button
            aria-controls="review-full-content"
            aria-expanded={fullReviewOpen}
            className="min-h-11 w-full justify-between border-y border-trip-hairline py-3"
            onClick={() => setFullReviewOpen((open) => !open)}
            variant="text"
          >
            {fullReviewOpen ? "收起完整校對內容" : "查看完整校對內容"}
          </Button>

          {fullReviewOpen && (
            <div className="space-y-10" id="review-full-content">
              <section
                aria-label="行程基本資料"
                className="space-y-5 border-y border-trip-hairline py-6"
              >
                <SourceExcerpt
                  items={evidence.itemsFor(draft.trip.source_refs)}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <TextField
                    label="行程名稱"
                    value={draft.trip.title ?? ""}
                    onChange={(event) =>
                      onDraftChange(
                        editReviewTrip(draft, {
                          title: event.target.value || null,
                        }),
                      )
                    }
                    className="w-full"
                  />
                  <TextField
                    label="開始日期"
                    type="date"
                    value={draft.trip.start_date ?? ""}
                    onChange={(event) =>
                      onDraftChange(
                        editReviewTrip(draft, {
                          start_date: event.target.value || null,
                        }),
                      )
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    className="w-full"
                  />
                  <TextField
                    label="結束日期"
                    type="date"
                    value={draft.trip.end_date ?? ""}
                    onChange={(event) =>
                      onDraftChange(
                        editReviewTrip(draft, {
                          end_date: event.target.value || null,
                        }),
                      )
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    className="w-full"
                  />
                </div>
              </section>

              <section className="space-y-4" aria-labelledby="review-days">
                <EditorialSectionHeading id="review-days">
                  日期
                </EditorialSectionHeading>
                {draft.days.map((day) => (
                  <article
                    className="grid gap-5 border-b border-trip-hairline py-5 md:grid-cols-2"
                    key={day.id}
                  >
                    <SourceExcerpt items={evidence.itemsFor(day.source_refs)} />
                    <div className="grid gap-4">
                      <TextField
                        label="日期"
                        type="date"
                        value={day.date ?? ""}
                        onChange={(event) =>
                          onDraftChange(
                            editReviewDay(draft, day.id, {
                              date: event.target.value || null,
                            }),
                          )
                        }
                        slotProps={{ inputLabel: { shrink: true } }}
                        className="w-full"
                      />
                      <TextField
                        label="當天標題"
                        value={day.title ?? ""}
                        onChange={(event) =>
                          onDraftChange(
                            editReviewDay(draft, day.id, {
                              title: event.target.value || null,
                            }),
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  </article>
                ))}
              </section>

              <ReviewFindingList
                evidence={evidence}
                findings={informationalFindings}
                heading="其他校對資訊"
                headingId="review-information"
              />

              <section className="space-y-4" aria-labelledby="review-entities">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <EditorialSectionHeading
                    className="flex-1"
                    id="review-entities"
                  >
                    行程內容
                  </EditorialSectionHeading>
                  <Button
                    className="min-h-11"
                    variant="outlined"
                    onClick={() =>
                      onDraftChange(
                        addMissedEntity(draft, draft.days[0]?.id ?? null),
                      )
                    }
                  >
                    新增漏掉的內容
                  </Button>
                </div>
                {draft.entities.map((entity) => (
                  <EntityEditor
                    evidence={evidence}
                    draft={draft}
                    entity={entity}
                    key={entity.id}
                    onDraftChange={onDraftChange}
                    originalDraft={originalDraft}
                  />
                ))}
              </section>
            </div>
          )}
        </section>

        <section
          aria-label="校對操作"
          className="sticky bottom-0 z-10 border-y border-trip-hairline bg-trip-paper p-4"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <Button
              className="min-h-11"
              variant="outlined"
              onClick={onCancel}
              disabled={busy}
            >
              取消匯入，保留目前行程
            </Button>
            <Button
              className="min-h-11"
              variant="contained"
              onClick={onConfirm}
              disabled={busy || blocking}
            >
              {busy ? "正在安全儲存…" : "確認並使用這份行程"}
            </Button>
          </div>
          {blocking && (
            <Typography className="mt-2 font-utility text-sm text-trip-alternative">
              還有必須處理的問題。修正後才能確認。
            </Typography>
          )}
        </section>
      </EditorialMeasure>
    </main>
  );
}
