import { Typography } from "@mui/material";

import { EditorialFrame } from "../../components/editorial/EditorialPrimitives";
import type { ReviewEvidenceItem } from "../../domain/source/reviewEvidence";
import {
  groupTabularExcerpts,
  TabularMiniGrid,
  type TabularExcerpt,
} from "./TabularMiniGrid";

// Review renders the fixed evidence grammar and nothing else. It never reads
// the source document, evidence units, Markdown nodes, or workbook objects, so
// a later source format reaches this surface without changing it.
function EvidenceItem({ item }: { item: ReviewEvidenceItem }) {
  if (item.kind === "user_authored") {
    return (
      <EditorialFrame className="border-dashed">
        <Typography className="font-utility text-[11px] font-bold tracking-[0.16em] text-trip-faint">
          你新增的內容
        </Typography>
        <Typography className="mt-2 font-editorial text-sm leading-6 text-trip-muted">
          這筆內容由你新增，沒有原始來源片段。
        </Typography>
      </EditorialFrame>
    );
  }

  if (item.kind === "missing_reference") {
    return (
      <EditorialFrame className="border-dashed">
        <Typography className="font-utility text-[11px] font-bold tracking-[0.16em] text-trip-faint">
          找不到來源片段
        </Typography>
        <Typography className="mt-2 font-editorial text-sm leading-6 text-trip-muted">
          這筆內容指向的來源片段已經不在這份來源裡，請你直接確認內容是否正確。
        </Typography>
      </EditorialFrame>
    );
  }

  if (item.kind === "asset_reference") {
    return (
      <EditorialFrame className="border-dashed">
        <Typography className="font-utility text-[11px] font-bold tracking-[0.16em] text-trip-faint">
          附件 · {item.locator_label}
        </Typography>
        <Typography className="mt-2 break-words font-editorial text-sm leading-6 text-trip-muted">
          {item.label ? `${item.label} · ` : ""}
          {item.target}
        </Typography>
      </EditorialFrame>
    );
  }

  const label =
    item.kind === "tabular_excerpt"
      ? `原文 · ${item.sheet_name} · ${item.locator_label}`
      : `原文 · ${item.locator_label}`;

  return (
    <EditorialFrame>
      <Typography className="font-utility text-[11px] font-bold tracking-[0.16em] text-trip-faint">
        {label}
      </Typography>
      <blockquote className="mt-2 break-words whitespace-pre-wrap font-source text-sm leading-6 text-trip-ink">
        {item.text}
      </blockquote>
      {item.truncated ? (
        <Typography className="mt-2 font-utility text-[11px] text-trip-faint">
          這段來源過長，只顯示開頭部分。
        </Typography>
      ) : null}
    </EditorialFrame>
  );
}

export function SourceExcerpt({ items }: { items: ReviewEvidenceItem[] }) {
  const display: Array<ReviewEvidenceItem | TabularExcerpt[]> = [];
  let tabular: TabularExcerpt[] = [];
  const flush = () => {
    display.push(...groupTabularExcerpts(tabular));
    tabular = [];
  };
  for (const item of items) {
    if (item.kind === "tabular_excerpt") tabular.push(item);
    else {
      flush();
      display.push(item);
    }
  }
  flush();
  return (
    <div className="min-w-0 space-y-2" aria-label="來源證據">
      {display.map((item, index) =>
        Array.isArray(item) ? (
          <TabularMiniGrid items={item} key={`grid:${index}`} />
        ) : (
          <EvidenceItem
            item={item}
            key={`${item.kind}:${"source_ref" in item ? item.source_ref : "user"}:${index}`}
          />
        ),
      )}
    </div>
  );
}
