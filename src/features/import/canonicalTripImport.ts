import { validateCanonicalTripAuthoritatively } from "../../domain/trip/buildCanonicalTrip";
import { decodeCanonicalTrip } from "../../domain/trip/decodeCanonicalTrip";
import type { CanonicalTrip } from "../../domain/trip/types";
import type { ConfirmedTripRepository } from "../../persistence/confirmedTripRepository";

export const MAX_CANONICAL_JSON_BYTES = 1_000_000;

export class CanonicalTripImportError extends Error {
  constructor(
    readonly code:
      | "invalid_json"
      | "invalid_trip"
      | "too_large"
      | "unreadable"
      | "unsupported_type",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CanonicalTripImportError";
  }
}

export async function importCanonicalTripFile(
  file: Pick<File, "name" | "size" | "type" | "text">,
  repository: ConfirmedTripRepository,
): Promise<CanonicalTrip> {
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new CanonicalTripImportError(
      "unsupported_type",
      "請選擇 .json 檔案。",
    );
  }
  if (file.size > MAX_CANONICAL_JSON_BYTES) {
    throw new CanonicalTripImportError(
      "too_large",
      `這份 JSON 超過大小限制。檔案最多 ${MAX_CANONICAL_JSON_BYTES.toLocaleString()} bytes。`,
    );
  }

  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    throw new CanonicalTripImportError("unreadable", "無法讀取這份 JSON。", {
      cause: error,
    });
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new CanonicalTripImportError(
      "invalid_json",
      "這個檔案不是有效的 JSON。",
      { cause: error },
    );
  }

  const decoded = decodeCanonicalTrip(value);
  if (!decoded.valid) {
    throw new CanonicalTripImportError(
      "invalid_trip",
      "這份 JSON 使用不支援的格式或版本，或含有無法辨識的欄位。",
    );
  }
  const trip = decoded.trip;
  const validation = validateCanonicalTripAuthoritatively(trip);
  if (!validation.valid) {
    throw new CanonicalTripImportError(
      "invalid_trip",
      "這份行程的日期或項目關係有問題，目前無法匯入。",
    );
  }

  await repository.replaceActive(trip);
  return trip;
}
