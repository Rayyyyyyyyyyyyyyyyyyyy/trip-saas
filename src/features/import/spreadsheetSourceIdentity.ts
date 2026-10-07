import { SourceInputError } from "./textSourceInput";

async function sha256(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Filename-independent identity. Sheet orders are original visible workbook indices. */
export async function createSpreadsheetSourceIdentity(
  fileBytes: ArrayBuffer,
  selectedSheetOrders: readonly number[],
) {
  if (
    selectedSheetOrders.length === 0 ||
    selectedSheetOrders.length > 19 ||
    selectedSheetOrders.some(
      (order) => !Number.isSafeInteger(order) || order < 0,
    ) ||
    new Set(selectedSheetOrders).size !== selectedSheetOrders.length
  ) {
    throw new SourceInputError(
      "invalid_contract",
      "請至少選擇一個可讀取的分頁。",
    );
  }
  const normalizedSelection = [...selectedSheetOrders].sort(
    (left, right) => left - right,
  );
  const contentHash = await sha256(fileBytes);
  const identity = new TextEncoder().encode(
    JSON.stringify({
      file_sha256: contentHash,
      selected_sheet_orders: normalizedSelection,
    }),
  );
  return {
    sourceId: `source:tabular:${await sha256(identity.buffer)}`,
    contentHash,
    selectedSheetOrders: normalizedSelection,
  };
}
