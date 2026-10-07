import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceExcerpt } from "../../src/features/review/SourceExcerpt";
import {
  groupTabularExcerpts,
  type TabularExcerpt,
} from "../../src/features/review/TabularMiniGrid";

const cell = (
  row: number,
  column: number,
  text: string,
  extra: Partial<TabularExcerpt> = {},
): TabularExcerpt => ({
  kind: "tabular_excerpt",
  source_ref: `source:${row}:${column}`,
  locator_label: `sheet:行程!cell:${row}:${column}`,
  sheet_id: "sheet:0",
  sheet_name: "行程",
  row_start: row,
  row_end: row,
  column_start: column,
  column_end: column,
  fragment_index: 0,
  fragment_count: 1,
  text,
  truncated: false,
  ...extra,
});
describe("Review tabular mini-grid", () => {
  it("places calendar-grid citations by actual row/column labels with explicit elision and uncited markers", () => {
    render(
      <SourceExcerpt
        items={[
          cell(1, 3, "9/10 星期四"),
          cell(7, 1, "18:30~"),
          cell(7, 3, "散步至河邊"),
        ]}
      />,
    );
    expect(
      screen.getByRole("table", { name: "行程 引用儲存格" }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "A" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "C" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "省略欄 B 至 B" }),
    ).toHaveTextContent("…");
    expect(screen.getByRole("rowheader", { name: "7" })).toBeVisible();
    expect(
      screen.getByRole("rowheader", { name: "省略列 2 至 6" }),
    ).toHaveTextContent("…");
    expect(screen.getByText("散步至河邊").closest("tr")).toHaveTextContent("7");
    expect(screen.getAllByLabelText("未引用的儲存格").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/只顯示引用儲存格/)).toBeVisible();
    const scroll = screen.getByRole("region", {
      name: "行程 來源表格，可橫向捲動",
    });
    expect(scroll).toHaveClass("min-w-0", "max-w-full", "overflow-x-auto");
    expect(scroll).toHaveAttribute("tabindex", "0");
  });
  it("keeps very distant coordinates bounded instead of allocating a full worksheet rectangle", () => {
    render(
      <SourceExcerpt
        items={[cell(1, 1, "開始"), cell(1048576, 16384, "最後一格")]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "XFD" })).toBeVisible();
    expect(screen.getByRole("rowheader", { name: "1048576" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getAllByRole("cell").length).toBeLessThan(20);
  });
  it("preserves merged bounds and separately exposes covered non-anchor content at its own position", () => {
    render(
      <SourceExcerpt
        items={[
          cell(2, 1, "合併主題", {
            column_end: 3,
            locator_label: "sheet:行程!A2:C2",
          }),
          cell(2, 2, "隱藏在覆蓋格的指示", { locator_label: "sheet:行程!B2" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByText("合併主題").closest("td")).toHaveAttribute(
      "colspan",
      "3",
    );
    expect(screen.getByText("隱藏在覆蓋格的指示")).toBeVisible();
    expect(screen.getByText("sheet:行程!B2")).toBeVisible();
  });
  it("continues more than eight regions and repeated cell fragments in separate grids", () => {
    const items = Array.from({ length: 17 }, (_item, index) =>
      cell(index + 1, 1, `內容 ${index}`),
    );
    expect(groupTabularExcerpts(items).map((group) => group.length)).toEqual([
      8, 8, 1,
    ]);
    render(
      <SourceExcerpt
        items={[
          cell(1, 1, "長內容開頭", { fragment_count: 2 }),
          cell(1, 1, "最後訂位內容", { fragment_index: 1, fragment_count: 2 }),
        ]}
      />,
    );
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByText(/第 2\/2 段/)).toBeVisible();
    expect(screen.getByText("最後訂位內容")).toBeVisible();
  });
  it("distinguishes an actually empty source display from an uncited cell", () => {
    render(<SourceExcerpt items={[cell(1, 1, "")]} />);
    expect(screen.getByText("（來源顯示為空）")).toBeVisible();
    expect(screen.queryByLabelText("未引用的儲存格")).toBeNull();
  });
});
