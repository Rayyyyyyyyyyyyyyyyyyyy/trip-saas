import { ParseTripError as GeminiParseError } from "../../app/parseTrip";
import type { InterpretationTransport } from "../../app/interpretationTransport";
import { createGeminiSchemaProjection } from "./createGeminiSchemaProjection";
import {
  recordSafeGeminiDiagnostic,
  type GeminiDiagnosticPhase,
  type GeminiDiagnosticSink,
} from "./createSafeGeminiDiagnostic";

export const GEMINI_ACCEPTANCE_CANDIDATE = "gemini-3.5-flash";
// A stalled request must still end, because the intake surface holds a
// full-screen interaction lock until the parse settles.
export const DEFAULT_GEMINI_REQUEST_TIMEOUT_MS = 120_000;

export type GeminiTripParserOptions = {
  diagnosticSink?: GeminiDiagnosticSink;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  maxEstimatedInputTokens?: number;
  maxRequestBytes?: number;
  model: string;
  requestTimeoutMs?: number;
  retryDelayMs?: (attempt: number) => number;
  thinkingLevel?: "low" | "medium" | "high";
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
};

function abortError() {
  return new GeminiParseError("aborted", "已取消 Gemini 判讀。");
}

function defaultWait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(abortError());
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Settle even when an injected transport ignores AbortSignal. Late promise
 * completion remains observed but cannot resume the cancelled attempt. */
function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    work.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function requestBody(prompt: string, thinkingLevel: string) {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: createGeminiSchemaProjection(),
      thinkingConfig: { thinkingLevel },
    },
  };
}

function extractResponseText(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("candidates" in value) ||
    !Array.isArray(value.candidates)
  )
    return null;
  const candidate: unknown = value.candidates[0];
  if (!candidate || typeof candidate !== "object" || !("content" in candidate))
    return null;
  const content = candidate.content;
  if (
    !content ||
    typeof content !== "object" ||
    !("parts" in content) ||
    !Array.isArray(content.parts)
  )
    return null;
  const text = content.parts
    .map((part: unknown) =>
      part &&
      typeof part === "object" &&
      "text" in part &&
      typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("")
    .trim();
  return text || null;
}

function isAbort(error: unknown, signal?: AbortSignal) {
  return (
    signal?.aborted ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof GeminiParseError && error.code === "aborted")
  );
}

export function createGeminiTransport(
  options: GeminiTripParserOptions,
): InterpretationTransport {
  const fetch = options.fetch ?? globalThis.fetch;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const requestTimeoutMs =
    options.requestTimeoutMs ?? DEFAULT_GEMINI_REQUEST_TIMEOUT_MS;
  const retryDelayMs =
    options.retryDelayMs ?? ((attempt) => 1_000 * 2 ** (attempt - 1));
  const thinkingLevel = options.thinkingLevel ?? "medium";
  const wait = options.wait ?? defaultWait;

  // Records the safe diagnostic and hands the error back so every call site
  // reads `throw recordFailure(...)`. Returning rather than throwing keeps
  // control flow visible to the compiler, so no unreachable `break` or
  // `continue` is needed to prove a variable was assigned.
  const recordFailure = (
    error: GeminiParseError,
    phase: GeminiDiagnosticPhase,
    httpStatus: number | null = null,
    retryAttempt: number | null = null,
  ) => {
    if (options.diagnosticSink) {
      recordSafeGeminiDiagnostic(options.diagnosticSink, {
        error,
        httpStatus,
        phase,
        retryAttempt,
      });
    }
    return error;
  };

  const timeoutError = () =>
    new GeminiParseError(
      "provider_timeout",
      "Gemini 在時限內沒有回應，已停止這次判讀。",
    );

  return {
    prepare(prompt) {
      const body = JSON.stringify(requestBody(prompt, thinkingLevel));
      return {
        requestIdentity: `${options.model}\n${body}`,
        requestBytes: new TextEncoder().encode(body).byteLength,
        estimatedInputTokens: Math.ceil(prompt.length / 4),
        send: async ({ credential, signal }) => {
          if (signal?.aborted) throw recordFailure(abortError(), "request");
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent`;

          for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            if (signal?.aborted)
              throw recordFailure(abortError(), "request", null, attempt);
            // Every attempt runs under its own deadline. Without it a provider that
            // accepts the connection and never answers would leave the intake
            // surface holding its full-screen interaction lock forever. The deadline
            // spans the body read too, so a stalled response also ends.
            const deadline = new AbortController();
            const forwardAbort = () => deadline.abort();
            signal?.addEventListener("abort", forwardAbort, { once: true });
            let timedOut = false;
            const timer =
              requestTimeoutMs > 0
                ? setTimeout(() => {
                    timedOut = true;
                    deadline.abort();
                  }, requestTimeoutMs)
                : null;
            // Idempotent, so the retry path can release the deadline before waiting
            // and `finally` can still release it on every other exit.
            const releaseDeadline = () => {
              if (timer !== null) clearTimeout(timer);
              signal?.removeEventListener("abort", forwardAbort);
            };

            try {
              let response: Response;
              try {
                response = await abortable(
                  fetch(endpoint, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-goog-api-key": credential,
                    },
                    body,
                    signal: deadline.signal,
                  }),
                  deadline.signal,
                );
              } catch (error) {
                if (timedOut)
                  throw recordFailure(timeoutError(), "request", null, attempt);
                if (isAbort(error, signal)) {
                  throw recordFailure(abortError(), "request", null, attempt);
                }
                throw recordFailure(
                  new GeminiParseError(
                    "provider_unreachable",
                    "無法連線至 Gemini。請確認網路後重試。",
                  ),
                  "request",
                  null,
                  attempt,
                );
              }

              if (response.status === 401 || response.status === 403) {
                throw recordFailure(
                  new GeminiParseError(
                    "authentication_failed",
                    "Gemini API key 無效、受到限制，或沒有使用權限。",
                  ),
                  "request",
                  response.status,
                  attempt,
                );
              }
              if (response.status === 429 || response.status === 503) {
                if (attempt === maxAttempts) {
                  throw recordFailure(
                    response.status === 429
                      ? new GeminiParseError(
                          "rate_limited",
                          "Gemini 暫時達到使用上限。系統已停止重試，請稍後再試。",
                        )
                      : new GeminiParseError(
                          "provider_unavailable",
                          "Gemini 服務暫時忙碌。系統已重試但仍無法完成，請稍後再試。",
                        ),
                    "request",
                    response.status,
                    attempt,
                  );
                }
                releaseDeadline();
                try {
                  await abortable(wait(retryDelayMs(attempt), signal), signal);
                } catch (error) {
                  throw recordFailure(
                    isAbort(error, signal)
                      ? abortError()
                      : new GeminiParseError(
                          "provider_unreachable",
                          "判讀重試未能完成，請稍後重試。",
                        ),
                    "request",
                    null,
                    attempt,
                  );
                }
                continue;
              }
              if (!response.ok) {
                // The provider answered; this is not a lost connection, so it must
                // not tell the reader to check the network. A 5xx is a fault on the
                // provider's side and a 4xx is a refused request, and the two need
                // different recovery instructions.
                throw recordFailure(
                  response.status >= 500
                    ? new GeminiParseError(
                        "provider_unavailable",
                        "Gemini 目前無法處理這次判讀。請稍後重試。",
                      )
                    : new GeminiParseError(
                        "provider_rejected",
                        "Gemini 沒有接受這次判讀請求。請稍後重試或更換來源。",
                      ),
                  "request",
                  response.status,
                  attempt,
                );
              }

              let envelope: unknown;
              try {
                envelope = await abortable(response.json(), deadline.signal);
              } catch (error) {
                if (timedOut) {
                  throw recordFailure(
                    timeoutError(),
                    "response",
                    response.status,
                    attempt,
                  );
                }
                if (isAbort(error, signal)) {
                  throw recordFailure(
                    abortError(),
                    "response",
                    response.status,
                    attempt,
                  );
                }
                throw recordFailure(
                  new GeminiParseError(
                    "malformed_response",
                    "Gemini 回傳的 JSON 外層格式無法讀取。",
                  ),
                  "response",
                  response.status,
                  attempt,
                );
              }

              const text = extractResponseText(envelope);
              if (!text) {
                throw recordFailure(
                  new GeminiParseError(
                    "malformed_response",
                    "Gemini 沒有回傳可供檢查的結構化內容。",
                  ),
                  "response",
                  response.status,
                  attempt,
                );
              }

              let value: unknown;
              try {
                value = JSON.parse(text);
              } catch {
                throw recordFailure(
                  new GeminiParseError(
                    "malformed_response",
                    "Gemini 回傳的結構化內容不是有效的 JSON。",
                  ),
                  "response",
                  response.status,
                  attempt,
                );
              }

              if (timedOut)
                throw recordFailure(
                  timeoutError(),
                  "response",
                  response.status,
                  attempt,
                );
              if (signal?.aborted)
                throw recordFailure(
                  abortError(),
                  "response",
                  response.status,
                  attempt,
                );
              return value;
            } finally {
              releaseDeadline();
            }
          }

          // Every final attempt fails or returns inside the loop, so this is the
          // loop's unreachable terminator.
          throw new GeminiParseError(
            "provider_unavailable",
            "Gemini 目前無法處理這次判讀。請稍後重試。",
          );
        },
      };
    },
  };
}
