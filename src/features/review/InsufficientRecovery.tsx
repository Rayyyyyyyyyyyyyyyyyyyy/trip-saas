import { Button, Typography } from "@mui/material";

import {
  EditorialMarker,
  EditorialMeasure,
} from "../../components/editorial/EditorialPrimitives";
import type { SemanticInterpretationResult } from "../../domain/trip/types";
import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";
import { ReviewFindingList } from "./ReviewFindingList";
import { deriveUnparsedItemFindings } from "./reviewCandidate";

export function InsufficientRecovery({
  evidence,
  interpretation,
  onCancel,
  onReplaceSource,
}: {
  evidence: ReviewEvidenceProjection;
  interpretation: SemanticInterpretationResult;
  onCancel: () => void;
  onReplaceSource: () => void;
}) {
  const unparsedFindings = deriveUnparsedItemFindings(
    interpretation.coverage.unparsed_items,
  );

  return (
    <main
      aria-label="目前無法校對行程"
      className="min-h-screen bg-trip-paper py-10 text-trip-ink"
    >
      <EditorialMeasure className="space-y-8 px-4 sm:px-6 md:px-0">
        <Typography className="font-utility text-xs tracking-[0.18em] text-trip-attention">
          需要更完整的來源
        </Typography>
        <Typography
          className="font-editorial text-[34px] leading-tight font-black md:text-5xl"
          component="h1"
        >
          目前還無法安全整理這份行程。
        </Typography>
        <EditorialMarker className="py-2" role="alert" tone="attention">
          <Typography className="font-utility text-xs font-bold text-trip-attention">
            來源結構不足
          </Typography>
          <Typography className="mt-1 font-editorial leading-7">
            這份來源還不足以建立基本行程。系統不會自行猜測日期、地點或事件。請換一份內容更完整的來源；原本已確認的行程不會變動。
          </Typography>
        </EditorialMarker>
        <ReviewFindingList
          evidence={evidence}
          findings={[...interpretation.findings, ...unparsedFindings]}
        />
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <Button
            className="min-h-11"
            variant="contained"
            onClick={onReplaceSource}
          >
            換一份內容
          </Button>
          <Button className="min-h-11" variant="outlined" onClick={onCancel}>
            取消這次匯入
          </Button>
        </div>
      </EditorialMeasure>
    </main>
  );
}
