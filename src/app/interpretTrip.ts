import semanticInterpreterPrompt from "../../spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md?raw";
import {
  evaluateGateA,
  evaluateReviewableDraft,
} from "../domain/trip/evaluateTripGates";
import { validateSemanticInterpretationResultSchema } from "../domain/trip/schemaValidators";
import type {
  SemanticInterpretationResult,
  ParsedTripDraft,
} from "../domain/trip/types";
import type {
  ValidatedUnifiedSourceDocument,
  UnifiedSourceDocument,
} from "../domain/source/types";
import { sourceExpectationFor } from "../domain/source/sourceCoverage";
import { validateUnifiedSourceDocument } from "../domain/source/validateUnifiedSourceDocument";
import { validateInterpretationFidelity } from "../domain/source/validateInterpretationFidelity";
import { ParseTripError, type ParseTripRequest } from "./parseTrip";
import type { InterpretationTransport } from "./interpretationTransport";

export type InterpretTripRequest = Omit<ParseTripRequest, "source"> & {
  source: ValidatedUnifiedSourceDocument;
};

export type ReviewCandidate = SemanticInterpretationResult & {
  status: "draft";
  draft: ParsedTripDraft;
};
export type InsufficientResult = SemanticInterpretationResult & {
  status: "insufficient";
  draft: null;
};
export type InterpretationOutcome = ReviewCandidate | InsufficientResult;
export type InterpretationFailurePhase =
  "source" | "preflight" | "request" | "response";
export const DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES = 3_000_000;
export const DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS = 300_000;

function createPrompt(source: UnifiedSourceDocument) {
  // The maintained Markdown document is the executable instruction source.
  // Vite bundles it as text; no browser filesystem or runtime document fetch.
  return `${semanticInterpreterPrompt}\n\n## Source document\n\n${JSON.stringify(source)}`;
}

function validateProviderResult(
  value: unknown,
  source: ValidatedUnifiedSourceDocument,
): InterpretationOutcome {
  const schema = validateSemanticInterpretationResultSchema(value);
  if (!schema.valid) {
    throw new ParseTripError(
      "invalid_response",
      "判讀回傳的內容格式不完整，未通過本機 schema 檢查。",
      [
        {
          code: "SCHEMA_INVALID",
          message: "Interpretation response schema is invalid.",
          blocking: true,
        },
      ],
    );
  }
  let result = value as SemanticInterpretationResult;
  const expectation = sourceExpectationFor(source);
  const gate = evaluateGateA(result, expectation);
  if (!gate.pass) {
    throw new ParseTripError(
      "invalid_response",
      "判讀回傳內容的來源識別或涵蓋範圍未通過檢查。",
      gate.findings,
    );
  }
  if (result.status === "draft") {
    const fidelityFindings = validateInterpretationFidelity(result, source);
    if (fidelityFindings.length > 0) {
      result = {
        ...result,
        findings: [...result.findings, ...fidelityFindings],
      };
    }
    const reviewable = evaluateReviewableDraft(result, expectation);
    if (!reviewable.pass) {
      // The response itself is schema-valid and fully covers the source; only
      // the pre-Review gate rejected it, so it must not be reported as a
      // response-schema failure.
      throw new ParseTripError(
        "draft_not_reviewable",
        "判讀草稿未通過校對前的必要檢查。",
        reviewable.findings,
      );
    }
  }
  return result as InterpretationOutcome;
}

export function createInterpretTrip(options: {
  transport: InterpretationTransport;
  maxRequestBytes?: number;
  maxEstimatedInputTokens?: number;
  onFailure?: (
    error: ParseTripError,
    phase: InterpretationFailurePhase,
  ) => void;
}) {
  const fail = (
    error: ParseTripError,
    phase: InterpretationFailurePhase,
  ): never => {
    try {
      options.onFailure?.(error, phase);
    } catch {
      // Optional diagnostics must never replace the bounded failure.
    }
    throw error;
  };
  const checkAbort = (signal?: AbortSignal) => {
    if (signal?.aborted)
      fail(new ParseTripError("aborted", "已停止這次判讀。"), "request");
  };
  return async (
    request: InterpretTripRequest,
  ): Promise<InterpretationOutcome> => {
    const { source, sourceId, credential, signal, onStage } = request;
    checkAbort(signal);
    onStage?.("source_validation");
    checkAbort(signal);
    const gate = validateUnifiedSourceDocument(source, { source_id: sourceId });
    if (!gate.valid)
      return fail(
        new ParseTripError(
          "source_document_invalid",
          "這份來源沒有通過送出前的結構檢查，因此沒有送出判讀。",
        ),
        "source",
      );
    let prepared: ReturnType<InterpretationTransport["prepare"]>;
    try {
      prepared = options.transport.prepare(createPrompt(gate.document));
    } catch {
      return fail(
        new ParseTripError(
          "preflight_limit",
          "無法安全建立這份來源的判讀請求，因此尚未送出。",
        ),
        "preflight",
      );
    }
    const maxBytes =
      options.maxRequestBytes ?? DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES;
    const maxTokens =
      options.maxEstimatedInputTokens ??
      DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS;
    if (
      !Number.isFinite(maxBytes) ||
      maxBytes < 0 ||
      !Number.isFinite(maxTokens) ||
      maxTokens < 0 ||
      !Number.isFinite(prepared.requestBytes) ||
      prepared.requestBytes < 0 ||
      !Number.isFinite(prepared.estimatedInputTokens) ||
      prepared.estimatedInputTokens < 0 ||
      prepared.requestBytes > maxBytes ||
      prepared.estimatedInputTokens > maxTokens
    ) {
      return fail(
        new ParseTripError(
          "preflight_limit",
          "這份來源超過判讀的安全請求上限，因此尚未送出。",
        ),
        "preflight",
      );
    }
    onStage?.("interpreting");
    checkAbort(signal);
    let value: unknown;
    try {
      value = await prepared.send({ credential, signal });
    } catch (error) {
      checkAbort(signal);
      if (error instanceof ParseTripError) throw error;
      return fail(
        new ParseTripError(
          "provider_unreachable",
          "無法完成判讀連線，請稍後重試。",
        ),
        "request",
      );
    }
    checkAbort(signal);
    onStage?.("output_validation");
    checkAbort(signal);
    try {
      const result = validateProviderResult(value, gate.document);
      checkAbort(signal);
      return result;
    } catch (error) {
      if (error instanceof ParseTripError) return fail(error, "response");
      return fail(
        new ParseTripError("invalid_response", "判讀回傳內容未通過本機檢查。"),
        "response",
      );
    }
  };
}
