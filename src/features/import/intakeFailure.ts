import type { TripWorkflowFailurePhase } from "../../app/tripWorkflow";
import {
  SourceInputError,
  type SourceInputFailureCode,
} from "./textSourceInput";

// A bounded, provider-neutral description of why one intake attempt stopped.
// Presentation renders only these fixed strings, never a thrown message, so
// credentials, provider envelopes, and schema paths cannot reach the surface.

// The phase vocabulary belongs to the app workflow contract; this feature
// only supplies the copy each phase renders.
export type IntakeFailurePhase = TripWorkflowFailurePhase;

export type IntakeFailureCode =
  | "processing_timed_out"
  | "source_empty"
  | "source_too_large"
  | "source_unreadable"
  | "source_unsupported_type"
  | "source_invalid_contract"
  | "spreadsheet_unsupported_type"
  | "spreadsheet_unreadable"
  | "spreadsheet_empty"
  | "spreadsheet_too_large"
  | "spreadsheet_sheet_limit"
  | "spreadsheet_selection_invalid"
  | "spreadsheet_extraction_limit"
  | "extraction_failed"
  | "source_document_invalid"
  | "credential_unavailable"
  | "credential_rejected"
  | "interpreter_unavailable"
  | "request_too_large"
  | "provider_unreachable"
  | "provider_rejected"
  | "provider_unavailable"
  | "provider_timed_out"
  | "provider_rate_limited"
  | "response_unreadable"
  | "response_invalid"
  | "response_coverage_invalid"
  | "draft_not_reviewable"
  | "confirmation_candidate_invalid"
  | "confirmation_persistence_failed"
  | "confirmation_incomplete"
  | "cancelled"
  | "unknown";

export type IntakeFailure = {
  code: IntakeFailureCode;
  message: string;
  phase: IntakeFailurePhase;
  recoverable: boolean;
};

export const INTAKE_FAILURE_HEADING = "行程讀取失敗";

const unchanged = "目前的行程沒有變動";

const intakeFailureCatalog: Record<
  IntakeFailureCode,
  { message: string; phase: IntakeFailurePhase; recoverable: boolean }
> = {
  processing_timed_out: {
    message: `這次處理超過等待時限，已停止判讀。${unchanged}，原本選擇的來源仍可重新送出。`,
    phase: "unknown",
    recoverable: true,
  },
  source_empty: {
    message: `這份內容是空的，沒有可以讀取的行程。${unchanged}，請換一份有內容的行程再試一次。`,
    phase: "reading",
    recoverable: true,
  },
  source_too_large: {
    message: `這份 Markdown 超過可以處理的大小上限。${unchanged}，請縮小內容後再試一次。`,
    phase: "reading",
    recoverable: true,
  },
  source_unreadable: {
    message: `無法讀取這份檔案，它可能已損壞，或瀏覽器沒有讀取權限。${unchanged}，請換一份檔案再試一次。`,
    phase: "reading",
    recoverable: true,
  },
  source_unsupported_type: {
    message: `這個副檔名目前不能匯入；PDF、圖片、DOCX 與 .xls 尚不支援。${unchanged}，請換一份檔案再試一次。`,
    phase: "reading",
    recoverable: true,
  },
  source_invalid_contract: {
    message: `這份內容的格式目前無法處理。${unchanged}，請調整內容後再試一次。`,
    phase: "reading",
    recoverable: true,
  },
  spreadsheet_unsupported_type: {
    message: `這個表格格式目前不能讀取，請使用 .xlsx 或 UTF-8 CSV；.xls 尚未開放。${unchanged}。`,
    phase: "reading",
    recoverable: true,
  },
  spreadsheet_unreadable: {
    message: `無法讀取這份表格，檔案可能已損壞、加密或格式不符。${unchanged}，請另存為未加密的 .xlsx 或 UTF-8 CSV 後再試。`,
    phase: "extraction",
    recoverable: true,
  },
  spreadsheet_empty: {
    message: `所選分頁沒有可讀取的內容。${unchanged}，請改選有內容的分頁或檔案。`,
    phase: "extraction",
    recoverable: true,
  },
  spreadsheet_too_large: {
    message: `這份表格超過 128 MiB 的檔案大小上限。${unchanged}，請縮小檔案後再試。`,
    phase: "reading",
    recoverable: true,
  },
  spreadsheet_sheet_limit: {
    message: `這份表格超過 19 個可見分頁的處理上限。${unchanged}，請分成較小的檔案後再試。`,
    phase: "extraction",
    recoverable: true,
  },
  spreadsheet_selection_invalid: {
    message: `請至少選擇一個可見分頁。${unchanged}，請重新選擇後再試。`,
    phase: "extraction",
    recoverable: true,
  },
  spreadsheet_extraction_limit: {
    message: `所選表格內容超過結構擷取的安全上限，因此沒有送出判讀。${unchanged}，請減少分頁或內容後再試。`,
    phase: "extraction",
    recoverable: true,
  },
  extraction_failed: {
    message: `內容讀到了，但沒辦法整理成可以判讀的結構。${unchanged}，請調整內容後再試一次。`,
    phase: "extraction",
    recoverable: true,
  },
  // The extracted document failed the source-document schema or its
  // deterministic integrity checks, so it never became an interpretation
  // input. The specific rule is deliberately not surfaced: schema paths and
  // source content must not reach presentation.
  source_document_invalid: {
    message: `內容整理出來了，但結構檢查沒有通過，因此沒有送出判讀。${unchanged}，請調整內容後再試一次。`,
    phase: "extraction",
    recoverable: true,
  },
  credential_unavailable: {
    message: `這個瀏覽器沒有可以使用的 Gemini API key。${unchanged}，請先儲存 API key 再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  credential_rejected: {
    message: `這個瀏覽器儲存的 Gemini API key 被拒絕了，可能已經失效或沒有使用權限。${unchanged}，請換一組 API key 後再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  interpreter_unavailable: {
    message: `這個版本還沒有連接 Gemini 判讀，所以沒有送出。${unchanged}。`,
    phase: "provider_request",
    recoverable: true,
  },
  request_too_large: {
    message: `這份來源超過一次判讀的安全上限，因此沒有送出。${unchanged}，請縮小內容或分次匯入。`,
    phase: "provider_request",
    recoverable: true,
  },
  provider_unreachable: {
    message: `送出判讀時無法連線。${unchanged}，請確認網路後再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  provider_timed_out: {
    message: `送出判讀後太久沒有得到回應，已經停止這次等待。${unchanged}，請稍後再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  provider_rejected: {
    message: `判讀服務這次沒有接受這個請求。${unchanged}，請稍後再試一次或換一份內容。`,
    phase: "provider_request",
    recoverable: true,
  },
  provider_unavailable: {
    message: `判讀服務目前無法處理請求。${unchanged}，請稍後再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  provider_rate_limited: {
    message: `判讀服務暫時達到使用上限。${unchanged}，請稍後再試一次。`,
    phase: "provider_request",
    recoverable: true,
  },
  response_unreadable: {
    message: `判讀結果沒有回傳可以檢查的結構化內容。${unchanged}，請再試一次或換一份內容。`,
    phase: "response_validation",
    recoverable: true,
  },
  response_invalid: {
    message: `判讀回來的結構沒有通過本機檢查，因此沒有採用。${unchanged}，請再試一次或換一份內容。`,
    phase: "response_validation",
    recoverable: true,
  },
  response_coverage_invalid: {
    message: `判讀結果沒有完整對應這份來源，因此沒有採用。${unchanged}，請再試一次或換一份內容。`,
    phase: "response_validation",
    recoverable: true,
  },
  draft_not_reviewable: {
    message: `整理出的草稿在進入校對前沒有通過必要檢查，因此沒有採用。${unchanged}，請再試一次或換一份內容。`,
    phase: "pre_review_validation",
    recoverable: true,
  },
  confirmation_candidate_invalid: {
    message: `這份校對結果沒有通過確認前的完整檢查。${unchanged}，請回到校對頁修正後再確認一次。`,
    phase: "confirmation",
    recoverable: true,
  },
  confirmation_persistence_failed: {
    message: "行程尚未安全儲存，原本的行程仍然保留。",
    phase: "confirmation",
    recoverable: true,
  },
  // Reachable through the `ParseTrip` port's `aborted` code. The intake
  // dialog holds its interaction lock until the attempt settles, so there is
  // deliberately no cancel control on that surface.
  confirmation_incomplete: {
    message: `這次確認沒有完成，因此沒有取代目前行程。${unchanged}，請再試一次。`,
    phase: "confirmation",
    recoverable: true,
  },
  cancelled: {
    message: `這次讀取已經取消。${unchanged}。`,
    phase: "provider_request",
    recoverable: true,
  },
  unknown: {
    message: `這次讀取沒有完成。${unchanged}，請再試一次或換一份內容。`,
    phase: "unknown",
    recoverable: true,
  },
};

export function createIntakeFailure(code: IntakeFailureCode): IntakeFailure {
  return { code, ...intakeFailureCatalog[code] };
}

export class IntakeFailureError extends Error {
  constructor(readonly failure: IntakeFailure) {
    super(failure.code);
    this.name = "IntakeFailureError";
  }
}

const sourceInputFailureCodes: Record<
  SourceInputFailureCode,
  IntakeFailureCode
> = {
  empty: "source_empty",
  too_large: "source_too_large",
  unreadable: "source_unreadable",
  unsupported_type: "source_unsupported_type",
  invalid_contract: "source_invalid_contract",
};

export function toIntakeFailure(
  cause: unknown,
  fallback: IntakeFailureCode = "unknown",
): IntakeFailure {
  if (cause instanceof IntakeFailureError) return cause.failure;
  if (cause instanceof SourceInputError) {
    return createIntakeFailure(sourceInputFailureCodes[cause.code]);
  }
  return createIntakeFailure(fallback);
}
