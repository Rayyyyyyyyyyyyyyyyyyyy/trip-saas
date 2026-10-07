import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { EditorialFrame } from "../../components/editorial/EditorialPrimitives";
import type { ReviewEvidenceItem } from "../../domain/source/reviewEvidence";

export type TabularExcerpt = Extract<
  ReviewEvidenceItem,
  { kind: "tabular_excerpt" }
>;
export const REVIEW_GRID_MAX_REGIONS = 8;
type Axis =
  | { kind: "position"; value: number }
  | { kind: "gap"; from: number; to: number };

function axis(bounds: number[]): Axis[] {
  const positions = [...new Set(bounds)].sort((left, right) => left - right);
  return positions.flatMap((value, index): Axis[] => {
    const previous = positions[index - 1];
    return previous !== undefined && value > previous + 1
      ? [
          { kind: "gap", from: previous + 1, to: value - 1 },
          { kind: "position", value },
        ]
      : [{ kind: "position", value }];
  });
}
function columnLetter(index: number) {
  let label = "";
  for (let value = index; value > 0; value = Math.floor((value - 1) / 26))
    label = String.fromCharCode(65 + ((value - 1) % 26)) + label;
  return label;
}
const overlaps = (left: TabularExcerpt, right: TabularExcerpt) =>
  left.row_start <= right.row_end &&
  right.row_start <= left.row_end &&
  left.column_start <= right.column_end &&
  right.column_start <= left.column_end;

/** Bound each grid without dropping continuation fragments or covered cells. */
export function groupTabularExcerpts(items: readonly TabularExcerpt[]) {
  const groups: TabularExcerpt[][] = [];
  for (const item of items) {
    const current = groups.at(-1);
    if (
      !current ||
      current.length >= REVIEW_GRID_MAX_REGIONS ||
      current[0].sheet_id !== item.sheet_id ||
      current.some((existing) => overlaps(existing, item))
    )
      groups.push([item]);
    else current.push(item);
  }
  return groups;
}

export function TabularMiniGrid({
  items,
}: {
  items: readonly TabularExcerpt[];
}) {
  const rows = axis(items.flatMap((item) => [item.row_start, item.row_end]));
  const columns = axis(
    items.flatMap((item) => [item.column_start, item.column_end]),
  );
  const rowIndex = (value: number) =>
    rows.findIndex((row) => row.kind === "position" && row.value === value);
  const columnIndex = (value: number) =>
    columns.findIndex(
      (column) => column.kind === "position" && column.value === value,
    );
  const regions = items.map((item) => ({
    item,
    top: rowIndex(item.row_start),
    bottom: rowIndex(item.row_end),
    left: columnIndex(item.column_start),
    right: columnIndex(item.column_end),
  }));
  const sheetName = items[0].sheet_name;
  return (
    <EditorialFrame className="max-w-full">
      <Typography className="mb-2 font-utility text-[11px] font-bold tracking-[0.1em] text-trip-faint">
        原文 · {sheetName}
      </Typography>
      <TableContainer
        className="min-w-0 max-w-full overflow-x-auto"
        role="region"
        aria-label={`${sheetName} 來源表格，可橫向捲動`}
        tabIndex={0}
      >
        <Table
          size="small"
          className="min-w-max border-collapse"
          aria-label={`${sheetName} 引用儲存格`}
        >
          <TableHead>
            <TableRow>
              <TableCell
                className="border-trip-hairline font-utility text-xs"
                component="th"
                scope="col"
              >
                列／欄
              </TableCell>
              {columns.map((column, index) => (
                <TableCell
                  className="border-trip-hairline font-utility text-xs"
                  component="th"
                  scope="col"
                  key={index}
                  aria-label={
                    column.kind === "gap"
                      ? `省略欄 ${columnLetter(column.from)} 至 ${columnLetter(column.to)}`
                      : undefined
                  }
                >
                  {column.kind === "gap" ? "…" : columnLetter(column.value)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, r) => (
              <TableRow key={r}>
                <TableCell
                  className="border-trip-hairline align-top font-utility text-xs"
                  component="th"
                  scope="row"
                  aria-label={
                    row.kind === "gap"
                      ? `省略列 ${row.from} 至 ${row.to}`
                      : undefined
                  }
                >
                  {row.kind === "gap" ? "…" : row.value}
                </TableCell>
                {columns.map((_column, c) => {
                  const region = regions.find(
                    (candidate) =>
                      r >= candidate.top &&
                      r <= candidate.bottom &&
                      c >= candidate.left &&
                      c <= candidate.right,
                  );
                  if (region && (r !== region.top || c !== region.left))
                    return null;
                  return (
                    <TableCell
                      key={c}
                      className="max-w-[240px] min-w-[100px] border-trip-hairline align-top"
                      rowSpan={
                        region ? region.bottom - region.top + 1 : undefined
                      }
                      colSpan={
                        region ? region.right - region.left + 1 : undefined
                      }
                    >
                      {region ? (
                        <>
                          <span className="mb-1 block break-words font-utility text-[10px] text-trip-faint">
                            {region.item.locator_label}
                            {region.item.fragment_count > 1
                              ? ` · 第 ${region.item.fragment_index + 1}/${region.item.fragment_count} 段`
                              : ""}
                          </span>
                          <span className="block break-words whitespace-pre-wrap font-source text-sm leading-6 text-trip-ink">
                            {region.item.text === ""
                              ? "（來源顯示為空）"
                              : region.item.text}
                          </span>
                        </>
                      ) : (
                        <span
                          aria-label="未引用的儲存格"
                          className="font-utility text-xs text-trip-faint"
                        >
                          —
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography className="mt-2 font-utility text-[11px] leading-5 text-trip-faint">
        只顯示引用儲存格；— 代表未引用，… 代表省略區段。
      </Typography>
    </EditorialFrame>
  );
}
