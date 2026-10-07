import { useId, useState } from "react";
import { Button, Collapse, Typography } from "@mui/material";
import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";

export function ReviewSourceSummary({
  evidence,
  unparsedCount,
}: {
  evidence: ReviewEvidenceProjection;
  unparsedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const disclosureId = useId();
  const images = evidence.image_summary.unimported_references;
  if (
    evidence.coverage_scope.kind === "source" &&
    images.length === 0 &&
    !evidence.image_summary.workbook_inventory_unavailable
  )
    return null;
  return (
    <section
      aria-label="來源涵蓋範圍與圖片"
      className="min-w-0 space-y-3 border-y border-trip-hairline py-3"
    >
      {evidence.coverage_scope.kind === "selected_sheets" && (
        <div className="space-y-1">
          <Typography className="font-utility text-sm font-bold text-trip-ink">
            已選分頁 100% 覆蓋
          </Typography>
          <Typography className="font-editorial text-sm leading-6 text-trip-muted">
            來源單元均已交代，包含未判讀；不代表每筆內容都已理解。
          </Typography>
          <Typography className="break-words font-utility text-xs text-trip-muted">
            未判讀 {unparsedCount} 項 ·{" "}
            {evidence.coverage_scope.excluded_sheet_names.length > 0
              ? `未選分頁：${evidence.coverage_scope.excluded_sheet_names.join("、")}`
              : "沒有未選分頁"}
          </Typography>
        </div>
      )}
      {images.length > 0 && (
        <div>
          <Button
            className="min-h-11 w-full justify-between text-left font-utility"
            variant="text"
            aria-expanded={open}
            aria-controls={disclosureId}
            onClick={() => setOpen((value) => !value)}
          >
            來源有 {images.length} 個圖片參照未匯入，
            {open ? "收起明細" : "查看明細"}
          </Button>
          <Collapse in={open}>
            <ul id={disclosureId} className="space-y-3 pl-4">
              {images.map((image, index) => (
                <li
                  key={index}
                  className="break-words font-source text-sm leading-6 text-trip-muted"
                >
                  <span className="block font-utility text-xs text-trip-faint">
                    {image.locator_label}
                  </span>
                  {image.label ? `${image.label} · ` : ""}
                  {image.target}
                </li>
              ))}
            </ul>
          </Collapse>
        </div>
      )}
      {evidence.image_summary.workbook_inventory_unavailable && (
        <Typography className="font-editorial text-sm leading-6 text-trip-muted">
          若工作簿有內嵌圖片，這次不會匯入；來源未提供圖片清單，無法核對張數。
        </Typography>
      )}
    </section>
  );
}
