import { Button, Typography } from "@mui/material";

import {
  EditorialMarker,
  EditorialSectionHeading,
} from "../../components/editorial/EditorialPrimitives";
import type { TripFinding } from "../../domain/trip/types";
import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";
import { isMechanicallyRevalidatedFinding } from "./reviewCandidate";
import { SourceExcerpt } from "./SourceExcerpt";

function findingPresentation(finding: TripFinding) {
  if (finding.blocking || finding.severity === "error") {
    return { label: "需要修正", tone: "alternative" as const };
  }
  if (finding.severity === "warning") {
    return { label: "需要留意", tone: "attention" as const };
  }
  return { label: "參考資訊", tone: "movement" as const };
}

export function ReviewFindingList({
  evidence,
  findings,
  heading = "請你確認",
  headingId = "review-findings",
  onResolveFinding,
}: {
  evidence: ReviewEvidenceProjection;
  findings: TripFinding[];
  heading?: string;
  headingId?: string;
  onResolveFinding?: (finding: TripFinding) => void;
}) {
  if (findings.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <EditorialSectionHeading id={headingId}>
        {heading}
      </EditorialSectionHeading>
      {findings.map((finding, index) => (
        <div className="space-y-2" key={`${finding.code}:${index}`}>
          <SourceExcerpt
            items={evidence.itemsFor(finding.source_refs ?? finding.refs ?? [])}
          />
          <EditorialMarker
            className="space-y-1 py-2"
            role={finding.blocking ? "alert" : undefined}
            tone={findingPresentation(finding).tone}
          >
            <Typography className="font-utility text-xs font-bold text-trip-muted">
              {findingPresentation(finding).label}
            </Typography>
            <Typography className="break-words font-utility text-xs font-extrabold text-trip-ink">
              {finding.code}
            </Typography>
            <Typography className="break-words font-editorial text-sm leading-6 text-trip-ink">
              {finding.message}
            </Typography>
            {finding.blocking &&
              onResolveFinding &&
              !isMechanicallyRevalidatedFinding(finding) && (
                <Button
                  aria-label={`確認已解決 ${finding.code}`}
                  className="mt-3"
                  onClick={() => onResolveFinding(finding)}
                  variant="outlined"
                >
                  我已對照原文處理
                </Button>
              )}
          </EditorialMarker>
        </div>
      ))}
    </section>
  );
}
