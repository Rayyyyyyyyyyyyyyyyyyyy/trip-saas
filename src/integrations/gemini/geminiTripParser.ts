import { validateUnifiedSourceDocument } from "../../domain/source/validateUnifiedSourceDocument";
import { ParseTripError, type ParseTrip } from "../../app/parseTrip";
import {
  createInterpretTrip,
  DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES,
  DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS,
} from "../../app/interpretTrip";
import {
  createGeminiTransport,
  type GeminiTripParserOptions,
} from "./geminiTransport";
import { recordSafeGeminiDiagnostic } from "./createSafeGeminiDiagnostic";

export { ParseTripError as GeminiParseError } from "../../app/parseTrip";
export {
  GEMINI_ACCEPTANCE_CANDIDATE,
  DEFAULT_GEMINI_REQUEST_TIMEOUT_MS,
  type GeminiTripParserOptions,
} from "./geminiTransport";
export const DEFAULT_GEMINI_MAX_REQUEST_BYTES =
  DEFAULT_INTERPRETATION_MAX_REQUEST_BYTES;
export const DEFAULT_GEMINI_MAX_ESTIMATED_INPUT_TOKENS =
  DEFAULT_INTERPRETATION_MAX_ESTIMATED_INPUT_TOKENS;

/** Compatibility composition factory; policy belongs to interpretTrip. */
export function createGeminiTripParser(
  options: GeminiTripParserOptions,
): ParseTrip {
  const interpret = createInterpretTrip({
    transport: createGeminiTransport(options),
    maxRequestBytes: options.maxRequestBytes,
    maxEstimatedInputTokens: options.maxEstimatedInputTokens,
    onFailure: (error, phase) => {
      if (options.diagnosticSink)
        recordSafeGeminiDiagnostic(options.diagnosticSink, { error, phase });
    },
  });
  return async (request) => {
    // Keep the legacy public parser accepting raw contract fixtures. New deep
    // callers require the validated brand; this compatibility boundary earns
    // it, while interpretTrip reasserts integrity before transport preparation.
    if (request.signal?.aborted)
      throw new ParseTripError("aborted", "已停止這次判讀。");
    const gate = validateUnifiedSourceDocument(request.source, {
      source_id: request.sourceId,
    });
    if (!gate.valid) {
      const error = new ParseTripError(
        "source_document_invalid",
        "這份來源沒有通過送出前的結構檢查，因此沒有送出判讀。",
      );
      if (options.diagnosticSink)
        recordSafeGeminiDiagnostic(options.diagnosticSink, {
          error,
          phase: "source",
        });
      throw error;
    }
    return interpret({ ...request, source: gate.document });
  };
}
