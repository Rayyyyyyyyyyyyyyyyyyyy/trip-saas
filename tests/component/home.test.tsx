import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Home } from "../../src/features/import/Home";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";
import type {
  LocalDataClearResult,
  LocalDataOperations,
} from "../../src/persistence/localDataOperations";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const activeTrip = buildCanonicalTrip(validParsedTripDraft);
const credentialRepository: GeminiCredentialRepository = {
  clear: async () => undefined,
  load: async () => ({ status: "empty" }),
  probePersistence: async () => ({ supported: true }),
  save: async () => undefined,
};

function createLocalDataOperations(): LocalDataOperations {
  return {
    clearAllLocalData: vi.fn(async (): Promise<LocalDataClearResult> => ({
      operation: "clear_all_local_data",
      clearedScopes: ["confirmed_trip", "checklist", "credential"],
    })),
    clearCredential: vi.fn(async (): Promise<LocalDataClearResult> => ({
      operation: "clear_credential",
      clearedScopes: ["credential"],
    })),
    clearTripData: vi.fn(async (): Promise<LocalDataClearResult> => ({
      operation: "clear_trip_data",
      clearedScopes: ["confirmed_trip", "checklist"],
    })),
  };
}

function renderHome(
  overrides: Partial<React.ComponentProps<typeof Home>> = {},
) {
  const props: React.ComponentProps<typeof Home> = {
    activeTrip: null,
    credentialRepository,
    localDataOperations: createLocalDataOperations(),
    recoveryMessage: null,
    onCanonicalTripFile: vi.fn(async () => activeTrip),
    onLocalDataCleared: vi.fn(),
    onOpenActive: vi.fn(),
    onOpenSample: vi.fn(),
    onSourcePrepared: vi.fn(),
    ...overrides,
  };
  return { ...render(<Home {...props} />), props };
}

describe("Home Markdown intake", () => {
  it("renders neutral labels for an active trip with supported unknown identity and dates", () => {
    const trip = structuredClone(activeTrip);
    trip.title = null;
    trip.start_date = null;
    trip.end_date = null;

    renderHome({ activeTrip: trip });

    const summary = screen.getByRole("button", { name: "回到目前行程" });
    expect(summary).toHaveTextContent("未命名行程");
    expect(summary).toHaveTextContent("日期未定 — 日期未定");
    expect(trip.title).toBeNull();
  });

  // The source schema declares a dormant tabular evidence variant. Home must
  // keep offering Markdown only: no spreadsheet file selection and no copy
  // implying spreadsheet support is available.
  it("offers no spreadsheet intake while the tabular variant stays dormant", () => {
    const { container } = renderHome();
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][accept*=".md"]',
    );

    const accept = input?.getAttribute("accept") ?? "";
    for (const spreadsheet of [".xlsx", ".xls", ".csv", "spreadsheetml"]) {
      expect(accept).not.toContain(spreadsheet);
    }
    expect(container.textContent).not.toMatch(/試算表|Excel 匯入|上傳 CSV/);
  });

  it("distinguishes the empty upload target from a selected file", async () => {
    const user = userEvent.setup();
    const { container } = renderHome();
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][accept*=".md"]',
    );
    expect(input).not.toBeNull();
    expect(screen.getByRole("button", { name: /選擇行程檔案/ })).toBeVisible();

    const file = new File(["# Osaka"], "osaka-plan.md", {
      type: "text/markdown",
    });
    await user.upload(input!, file);

    const selected = screen.getByRole("region", {
      name: "已選擇行程檔案",
    });
    expect(selected).toHaveTextContent("osaka-plan.md");
    expect(
      screen.getByRole("button", { name: "送給 Gemini 判讀" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "更換檔案" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "移除檔案" }));
    expect(
      screen.queryByRole("region", { name: "已選擇行程檔案" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /選擇行程檔案/ })).toBeVisible();
  });

  it("accepts a Markdown file dropped onto the desktop upload target", () => {
    renderHome();
    const file = new File(["# Dropped"], "dropped-plan.md", {
      type: "text/markdown",
    });
    fireEvent.drop(screen.getByRole("button", { name: /行程檔案/ }), {
      dataTransfer: { files: [file] },
    });

    expect(
      screen.getByRole("region", { name: "已選擇行程檔案" }),
    ).toHaveTextContent("dropped-plan.md");
  });

  it("presents one editorial reading flow and preserves long active-trip identity", () => {
    const longTitle =
      "大阪、宇治與奈良的秋日行程——包含一段需要完整換行顯示而不能被截斷的旅行名稱";
    renderHome({
      activeTrip: { ...activeTrip, title: longTitle },
    });

    const main = screen.getByRole("main", { name: "Trip Runtime 首頁" });
    const intake = screen.getByRole("region", { name: "放進一份行程" });
    const active = screen.getByRole("region", { name: "你目前的行程" });
    const optional = screen.getByRole("region", {
      name: "之後可以再補的資料",
    });
    const settings = screen.getByRole("region", { name: "其他設定" });

    expect(main).toContainElement(intake);
    expect(main).toContainElement(active);
    expect(main).toContainElement(optional);
    expect(main).toContainElement(settings);
    expect(
      intake.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      active.compareDocumentPosition(optional) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(longTitle)).toBeVisible();
  });

  it("keeps both intake modes operable and the reserved optional area non-blocking", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByRole("tab", { name: "上傳檔案" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "直接貼上" })).toBeVisible();
    expect(screen.getByLabelText("之後可以再補的資料")).toHaveTextContent(
      "不用先填姓名",
    );
    expect(screen.queryByRole("textbox", { name: /旅客/ })).toBeNull();

    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    expect(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "送給 Gemini 判讀" }),
    ).toBeDisabled();
  });

  it("counts, validates, prepares, clears, and replaces pasted Markdown explicitly", async () => {
    const user = userEvent.setup();
    const onSourcePrepared = vi.fn();
    renderHome({ onSourcePrepared });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));

    const textarea = screen.getByRole("textbox", {
      name: "貼上 Markdown 行程內容",
    });
    await user.click(textarea);
    await user.tab();
    expect(screen.getByText("請先貼上行程內容。")).toBeVisible();

    await user.type(textarea, "# Osaka{enter}{enter}Free Time");
    expect(screen.getByText(/^共 .* 個字元$/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    expect(onSourcePrepared).toHaveBeenCalledOnce();
    expect(onSourcePrepared.mock.calls[0]?.[0]).toMatchObject({
      input: { input_mode: "pasted_markdown", media_type: "text/markdown" },
      document: { schema_version: "unified-source-document.v1" },
    });
    expect(screen.getByText(/已整理出 2 段行程內容/)).toBeVisible();
    expect(screen.getByText(/Gemini 判讀與檢查已完成/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "清空內容" }));
    expect(textarea).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "送給 Gemini 判讀" }),
    ).toBeDisabled();
    expect(screen.queryByText(/已建立 2 個/)).toBeNull();
  });

  it("keeps the active trip readable when intake preparation fails", async () => {
    const user = userEvent.setup();
    renderHome({
      activeTrip,
      onSourcePrepared: vi.fn(async () => {
        throw new Error("downstream unavailable");
      }),
    });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Replacement",
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    expect(
      screen.getByRole("button", { name: "回到目前行程" }),
    ).toHaveTextContent(activeTrip.title!);
    expect(screen.getByRole("alert")).toHaveTextContent("行程讀取失敗");
    expect(screen.queryByText(/Gemini 判讀與檢查已完成/)).toBeNull();
  });

  it("returns focus to a safe failure notice that preserves the pasted source", async () => {
    const user = userEvent.setup();
    const onSourcePrepared = vi.fn(async () => {
      throw new Error("provider secret detail");
    });
    renderHome({ activeTrip, onSourcePrepared });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    const textarea = screen.getByRole("textbox", {
      name: "貼上 Markdown 行程內容",
    });
    await user.type(textarea, "# Replacement");
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("行程讀取失敗");
    expect(notice).toHaveTextContent(/目前的行程沒有變動/);
    expect(notice).not.toHaveTextContent("provider secret detail");
    expect(notice).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue("# Replacement");
    expect(
      screen.getByRole("button", { name: "重新送出這份行程" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "回到目前行程" }),
    ).toHaveTextContent(activeTrip.title!);
  });

  it("retries the preserved source and clears the stale failure when it is edited", async () => {
    const user = userEvent.setup();
    const onSourcePrepared = vi
      .fn()
      .mockRejectedValueOnce(new Error("first attempt failed"))
      .mockResolvedValueOnce(undefined);
    renderHome({ onSourcePrepared });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Retry me",
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "重新送出這份行程" }));
    expect(await screen.findByText("整理完成，可以開始校對")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onSourcePrepared).toHaveBeenCalledTimes(2);
  });

  it("clears a stale failure notice when the failed source is replaced", async () => {
    const user = userEvent.setup();
    renderHome({
      onSourcePrepared: vi.fn(async () => {
        throw new Error("downstream unavailable");
      }),
    });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Broken",
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "清空內容" }));
    expect(screen.queryByRole("alert")).toBeNull();

    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Fixed",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("names the reading phase without exposing provider or schema diagnostics", async () => {
    const user = userEvent.setup();
    const { container } = renderHome({ onSourcePrepared: vi.fn() });
    await user.upload(
      container.querySelector<HTMLInputElement>(
        'input[type="file"][accept*=".md"]',
      )!,
      new File([], "empty-plan.md", { type: "text/markdown" }),
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("行程讀取失敗");
    expect(notice).toHaveTextContent(/這份內容是空的/);
    expect(notice).toHaveTextContent(/目前的行程沒有變動/);
    expect(
      screen.getByRole("region", { name: "已選擇行程檔案" }),
    ).toHaveTextContent("empty-plan.md");
  });

  it("shows extraction as complete while interpretation is pending without claiming success", async () => {
    const user = userEvent.setup();
    renderHome({ onSourcePrepared: undefined });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Pending interpretation",
    );
    await user.click(screen.getByRole("button", { name: "先讀取行程" }));

    expect(screen.getByText("內容已讀取，等待 Gemini 判讀")).toBeVisible();
    expect(
      screen.getByRole("progressbar", {
        name: "Gemini 語意判讀等待連接",
      }),
    ).toBeVisible();
    expect(screen.getByText(/尚未連接 Gemini 判讀/)).toBeVisible();
    expect(screen.queryByText(/可以確認整理結果/)).toBeNull();
  });

  it("keeps interpretation pending until the application handler completes", async () => {
    const user = userEvent.setup();
    let finish: (() => void) | undefined;
    const onSourcePrepared = vi.fn(async (_source) => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    renderHome({ onSourcePrepared });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
      "# Validation stage",
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Gemini 正在判讀內容",
    );
    finish?.();
    expect(await screen.findByText("整理完成，可以開始校對")).toBeVisible();
  });

  it("locks the intake surface while Gemini interpretation is pending", async () => {
    const user = userEvent.setup();
    let finish: (() => void) | undefined;
    const onSourcePrepared = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderHome({ onSourcePrepared });
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));

    const textarea = screen.getByRole("textbox", {
      name: "貼上 Markdown 行程內容",
    });
    await user.type(textarea, "# First source");
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
    const dialog = await screen.findByRole("dialog", {
      name: "貼上的 Markdown 行程",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Gemini 正在判讀內容");
    expect(
      screen.queryByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "送給 Gemini 判讀" }),
    ).not.toBeInTheDocument();

    finish?.();
    expect(await screen.findByText("整理完成，可以開始校對")).toBeVisible();
  });

  it("requires explicit confirmation and keeps trip-only and all-data clearing separate", async () => {
    const user = userEvent.setup();
    const localDataOperations = createLocalDataOperations();
    const onLocalDataCleared = vi.fn();
    renderHome({ localDataOperations, onLocalDataCleared });

    await user.click(
      screen.getByRole("button", { name: /管理這台裝置的資料/ }),
    );
    await user.click(screen.getByRole("button", { name: "清除行程資料" }));
    expect(
      screen.getByRole("dialog", { name: "確定清除行程資料？" }),
    ).toHaveTextContent("會保留 Gemini API key");
    await user.click(screen.getByRole("button", { name: "清除行程資料" }));
    expect(localDataOperations.clearTripData).toHaveBeenCalledOnce();
    expect(localDataOperations.clearAllLocalData).not.toHaveBeenCalled();
    expect(onLocalDataCleared).toHaveBeenCalledWith("trip");

    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
    await user.click(screen.getByRole("button", { name: "清除全部本機資料" }));
    expect(screen.getByText(/所有勾選紀錄和 Gemini API key/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "清除全部本機資料" }));
    expect(localDataOperations.clearAllLocalData).toHaveBeenCalledOnce();
    expect(onLocalDataCleared).toHaveBeenLastCalledWith("all");
  });

  it("keeps credential, Canonical import, privacy, format, and sample controls reachable", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(
      screen.getByRole("region", { name: "Gemini API key" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /從 JSON 匯入完整行程/ }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: /支援格式與資料安全/ }),
    );
    expect(screen.getByText(/Excel／CSV/)).toHaveTextContent(
      "外部測試通過後才會開放",
    );
    expect(screen.getByText(/PDF 目前不支援匯入/)).toBeVisible();
    const terms = screen.getByRole("link", {
      name: "查看 Gemini API 官方條款",
    });
    expect(terms).toHaveAttribute("target", "_blank");
    expect(terms).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("button", { name: "先看看大阪 2026 範例" }),
    ).toBeEnabled();
  });
});
