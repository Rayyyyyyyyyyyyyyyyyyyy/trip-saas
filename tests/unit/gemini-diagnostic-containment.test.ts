import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSafeGeminiDiagnostic,
  recordSafeGeminiDiagnostic,
} from "../../src/integrations/gemini/createSafeGeminiDiagnostic";

describe("Gemini diagnostic containment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("allowlists diagnostic fields and removes credential and source content", () => {
    const apiKey = "AIzaSy-not-a-real-key-secret-sentinel";
    const source = "09/10 11:55 flight and private traveler note";
    const contaminatedError = Object.assign(
      new Error(`Request failed for ${apiKey}; source=${source}`),
      {
        apiKey,
        requestBody: source,
        requestUrl: `https://example.com/?key=${apiKey}`,
      },
    );

    const diagnostic = createSafeGeminiDiagnostic({
      error: contaminatedError,
      httpStatus: 429,
      phase: "request",
      retryAttempt: 2,
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic).toEqual({
      category: "rate_limited",
      event: "gemini_request_failed",
      httpStatus: 429,
      phase: "request",
      retryAttempt: 2,
      schemaVersion: "gemini-diagnostic.v1",
    });
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(source);
    expect(serialized).not.toContain("requestUrl");
    expect(serialized).not.toContain("message");
  });

  it("records only the safe event without logs, analytics, or network calls", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchSpy = vi.fn();
    const sendBeacon = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", { sendBeacon });
    const record = vi.fn();

    recordSafeGeminiDiagnostic(
      { record },
      {
        error: new Error(
          "AIzaSy-not-a-real-key plus raw source that must not escape",
        ),
        httpStatus: 500,
        phase: "response",
      },
    );

    expect(record).toHaveBeenCalledWith({
      category: "provider_unavailable",
      event: "gemini_request_failed",
      httpStatus: 500,
      phase: "response",
      retryAttempt: null,
      schemaVersion: "gemini-diagnostic.v1",
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("classifies the parser's allowlisted cancellation error shape as aborted", () => {
    expect(
      createSafeGeminiDiagnostic({
        error: Object.assign(new Error("cancelled"), { code: "aborted" }),
        phase: "request",
      }),
    ).toMatchObject({ category: "aborted", httpStatus: null });
  });
});
