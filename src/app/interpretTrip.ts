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
import {
  expandSourceCoverage,
  sourceExpectationFor,
} from "../domain/source/sourceCoverage";
import { validateUnifiedSourceDocument } from "../domain/source/validateUnifiedSourceDocument";
import { validateInterpretationFidelity } from "../domain/source/validateInterpretationFidelity";
import {
  planSourceChunks,
  SourceChunkPlanningError,
  type InterpretationChunkPlan,
} from "../domain/source/planSourceChunks";
import { reconcileInterpretationChunks } from "../domain/trip/reconcileInterpretationChunks";
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
export const DEFAULT_TABULAR_CHUNK_MAX_REQUEST_BYTES = 64_000;
export const DEFAULT_TABULAR_CHUNK_MAX_ESTIMATED_INPUT_TOKENS = 16_000;

function createPrompt(
  source: UnifiedSourceDocument,
  plan?: InterpretationChunkPlan,
) {
  // The maintained Markdown document is the executable instruction source.
  // Vite bundles it as text; no browser filesystem or runtime document fetch.
  const scope =
    plan && plan.contextIds.length > 0
      ? `\n\n## Interpretation batch scope\n\n${JSON.stringify({
          owned_source_refs: plan.ownedIds,
          context_source_refs: plan.contextIds,
        })}`
      : "";
  return `${semanticInterpreterPrompt}${scope}\n\n## Source document\n\n${JSON.stringify(source)}`;
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
  const expanded = expandSourceCoverage(result.coverage, expectation.block_ids);
  if (!expanded.valid) {
    throw new ParseTripError(
      "coverage_invalid",
      "判讀結果沒有完整對應來源，因此沒有採用。",
      expanded.findings,
    );
  }
  result = { ...result, coverage: expanded.coverage };
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
    const validSizes = (envelope: typeof prepared) =>
      Number.isFinite(envelope.requestBytes) &&
      envelope.requestBytes >= 0 &&
      Number.isFinite(envelope.estimatedInputTokens) &&
      envelope.estimatedInputTokens >= 0;
    const withinBudget = (envelope: typeof prepared) =>
      validSizes(envelope) &&
      envelope.requestBytes <= maxBytes &&
      envelope.estimatedInputTokens <= maxTokens;
    if (
      !Number.isFinite(maxBytes) ||
      maxBytes < 0 ||
      !Number.isFinite(maxTokens) ||
      maxTokens < 0 ||
      !validSizes(prepared)
    ) {
      return fail(
        new ParseTripError(
          "preflight_limit",
          "這份來源超過判讀的安全請求上限，因此尚未送出。",
        ),
        "preflight",
      );
    }
    let work = [{ source: gate.document, prepared }];
    let plans: InterpretationChunkPlan[] | undefined;
    if (gate.document.source_format === "tabular") {
      try {
        plans = planSourceChunks(gate.document, {
          fits: (chunk, plan) => {
            checkAbort(signal);
            const envelope = options.transport.prepare(
              createPrompt(chunk, plan),
            );
            return (
              withinBudget(envelope) &&
              envelope.requestBytes <=
                DEFAULT_TABULAR_CHUNK_MAX_REQUEST_BYTES &&
              envelope.estimatedInputTokens <=
                DEFAULT_TABULAR_CHUNK_MAX_ESTIMATED_INPUT_TOKENS
            );
          },
        });
        work = plans.map((plan) => {
          const chunkGate = validateUnifiedSourceDocument(plan.source, {
            source_id: sourceId,
          });
          if (!chunkGate.valid)
            throw new ParseTripError(
              "source_document_invalid",
              "分段來源未通過結構檢查，因此尚未送出判讀。",
            );
          const envelope = options.transport.prepare(
            createPrompt(chunkGate.document, plan),
          );
          if (
            !withinBudget(envelope) ||
            envelope.requestBytes > DEFAULT_TABULAR_CHUNK_MAX_REQUEST_BYTES ||
            envelope.estimatedInputTokens >
              DEFAULT_TABULAR_CHUNK_MAX_ESTIMATED_INPUT_TOKENS
          )
            throw new ParseTripError(
              "preflight_limit",
              "單一段落及必要上下文超過判讀上限，因此尚未送出。",
            );
          return { source: chunkGate.document, prepared: envelope };
        });
      } catch (error) {
        checkAbort(signal);
        if (error instanceof ParseTripError) return fail(error, "preflight");
        if (
          error instanceof SourceChunkPlanningError &&
          error.code === "source_document_invalid"
        )
          return fail(
            new ParseTripError(
              "source_document_invalid",
              "分段來源未通過結構檢查，因此尚未送出判讀。",
            ),
            "source",
          );
        return fail(
          new ParseTripError(
            "preflight_limit",
            "這份來源無法在保留必要上下文的情況下安全分段，因此尚未送出。",
          ),
          "preflight",
        );
      }
      if (
        plans.length === 1 &&
        plans[0]!.contextIds.length === 0 &&
        plans[0]!.ownedIds.length === gate.document.evidence_units.length
      ) {
        plans = undefined;
        work = [{ source: gate.document, prepared }];
      }
    } else if (!withinBudget(prepared)) {
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
    const outcomes: InterpretationOutcome[] = [];
    const requestIdentities = work.map((item) => item.prepared.requestIdentity);
    const resumable = requestIdentities.every(
      (identity): identity is string =>
        typeof identity === "string" && identity.length > 0,
    );
    const saved = request.checkpoint;
    const matchesCheckpoint =
      resumable &&
      saved?.sourceId === sourceId &&
      JSON.stringify(saved.requestIdentities) ===
        JSON.stringify(requestIdentities) &&
      saved.completed.length <= work.length &&
      saved.completed.every((item, index) => item.index === index);
    const cached = matchesCheckpoint ? saved.completed : [];
    const completed: Array<{
      index: number;
      result: SemanticInterpretationResult;
    }> = [];
    request.onProgress?.({ completed: cached.length, total: work.length });
    for (const [index, item] of work.entries()) {
      checkAbort(signal);
      let value: unknown;
      try {
        value =
          index < cached.length
            ? cached[index]!.result
            : await item.prepared.send({ credential, signal });
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
      // Keep one interpreting stage over the entire serial run. The existing
      // application stage/overall watchdogs are never restarted per sheet.
      if (work.length === 1) onStage?.("output_validation");
      checkAbort(signal);
      try {
        outcomes.push(validateProviderResult(value, item.source));
      } catch (error) {
        if (error instanceof ParseTripError) return fail(error, "response");
        return fail(
          new ParseTripError(
            "invalid_response",
            "判讀回傳內容未通過本機檢查。",
          ),
          "response",
        );
      }
      checkAbort(signal);
      completed.push({
        index,
        result: structuredClone(value as SemanticInterpretationResult),
      });
      if (resumable && completed.length >= cached.length)
        request.onCheckpoint?.({
          sourceId,
          requestIdentities: requestIdentities as string[],
          completed: structuredClone(completed),
        });
      request.onProgress?.({ completed: Math.max(cached.length, outcomes.length), total: work.length });
    }
    if (work.length === 1 && !plans) return outcomes[0]!;
    onStage?.("output_validation");
    checkAbort(signal);
    let result: InterpretationOutcome;
    try {
      const reconciled = reconcileInterpretationChunks(
        outcomes,
        gate.document,
        plans,
      );
      if (!reconciled.valid)
        throw new ParseTripError(
          "draft_not_reviewable",
          "分頁判讀結果互相衝突，沒有建立部分行程。",
          reconciled.findings,
        );
      result = validateProviderResult(reconciled.result, gate.document);
    } catch (error) {
      if (error instanceof ParseTripError) return fail(error, "response");
      return fail(
        new ParseTripError("invalid_response", "判讀回傳內容未通過本機檢查。"),
        "response",
      );
    }
    checkAbort(signal);
    return result;
  };
}
