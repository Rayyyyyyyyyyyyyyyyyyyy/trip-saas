export type GeminiDiagnosticPhase =
  "credential" | "preflight" | "request" | "response" | "source";

export type GeminiDiagnosticCategory =
  | "aborted"
  | "credential_unavailable"
  | "network_failure"
  | "provider_rejected"
  | "provider_unavailable"
  | "rate_limited"
  | "timed_out"
  | "unexpected";

export type GeminiDiagnosticInput = {
  error: unknown;
  httpStatus?: number | null;
  phase: GeminiDiagnosticPhase;
  retryAttempt?: number | null;
};

export type SafeGeminiDiagnostic = {
  category: GeminiDiagnosticCategory;
  event: "gemini_request_failed";
  httpStatus: number | null;
  phase: GeminiDiagnosticPhase;
  retryAttempt: number | null;
  schemaVersion: "gemini-diagnostic.v1";
};

export type GeminiDiagnosticSink = {
  record(diagnostic: SafeGeminiDiagnostic): void;
};

function normalizeHttpStatus(status: number | null | undefined) {
  return Number.isInteger(status) && status! >= 100 && status! <= 599
    ? status!
    : null;
}

function normalizeRetryAttempt(attempt: number | null | undefined) {
  return Number.isInteger(attempt) && attempt! >= 0 ? attempt! : null;
}

function classifyFailure(
  error: unknown,
  httpStatus: number | null,
): GeminiDiagnosticCategory {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : null;

  if (errorCode === "provider_timeout") {
    return "timed_out";
  }

  if (
    (error instanceof DOMException && error.name === "AbortError") ||
    errorCode === "aborted"
  ) {
    return "aborted";
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return "credential_unavailable";
  }

  if (httpStatus === 429) {
    return "rate_limited";
  }

  if (httpStatus !== null && httpStatus >= 500) {
    return "provider_unavailable";
  }

  if (httpStatus !== null && httpStatus >= 400) {
    return "provider_rejected";
  }

  if (error instanceof TypeError) {
    return "network_failure";
  }

  if (errorCode === "provider_unreachable" && httpStatus === null) {
    return "network_failure";
  }

  return "unexpected";
}

export function createSafeGeminiDiagnostic(
  input: GeminiDiagnosticInput,
): SafeGeminiDiagnostic {
  const httpStatus = normalizeHttpStatus(input.httpStatus);

  return {
    category: classifyFailure(input.error, httpStatus),
    event: "gemini_request_failed",
    httpStatus,
    phase: input.phase,
    retryAttempt: normalizeRetryAttempt(input.retryAttempt),
    schemaVersion: "gemini-diagnostic.v1",
  };
}

export function recordSafeGeminiDiagnostic(
  sink: GeminiDiagnosticSink,
  input: GeminiDiagnosticInput,
) {
  try {
    sink.record(createSafeGeminiDiagnostic(input));
  } catch {
    // Diagnostics are optional; a failing sink must not alter request recovery.
  }
}
