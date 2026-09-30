import { describe, expect, it, vi } from "vitest";

import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import {
  createGeminiTripParser,
  GeminiParseError,
} from "../../src/integrations/gemini/geminiTripParser";
import { summaryShapedInterpretationResult } from "../fixtures/contracts/malformedContracts";
import {
  validDraftInterpretationResult,
  validInsufficientInterpretationResult,
} from "../fixtures/contracts/validContracts";

const source: UnifiedSourceDocument = {
  schema_version: "unified-source-document.v1",
  source_id: "source:fixture-001",
  display_name: "Fixture",
  input_mode: "pasted_markdown",
  source_format: "markdown",
  evidence_units: [
    {
      id: "source-block:001",
      source_order: 0,
      parent_ref: null,
      locator: "paste:lines:1-1",
      raw_value: "One day in Osaka",
      display_value: "One day in Osaka",
      links: [],
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: "paragraph",
          depth: 0,
          line_start: 1,
          line_end: 1,
        },
      ],
    },
  ],
  extraction_findings: [],
};

function responseWith(value: unknown, status = 200) {
  const body =
    status >= 200 && status < 300
      ? {
          candidates: [
            { content: { parts: [{ text: JSON.stringify(value) }] } },
          ],
        }
      : { error: { message: "sensitive provider detail" } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const createParser = (fetch: typeof globalThis.fetch, overrides = {}) =>
  createGeminiTripParser({
    model: "gemini-test-model",
    fetch,
    retryDelayMs: () => 1,
    wait: async () => undefined,
    ...overrides,
  });

describe("Gemini trip parser", () => {
  it.each([
    ["draft", validDraftInterpretationResult],
    ["insufficient", validInsufficientInterpretationResult],
  ])("returns a locally validated %s outcome", async (_, result) => {
    const fetch = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        responseWith(result),
    );
    const parser = createParser(fetch as typeof globalThis.fetch);

    await expect(
      parser({ credential: "secret-key", source, sourceId: source.source_id }),
    ).resolves.toEqual(result);

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toContain("gemini-test-model:generateContent");
    expect(String(url)).not.toContain("secret-key");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "secret-key" });
    expect(String(init?.body)).not.toContain("secret-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "medium" },
      },
    });
  });

  it("rejects malformed JSON, schema-invalid output, wrong source identity, and incomplete coverage", async () => {
    const cases: Array<[unknown, string]> = [
      [
        { candidates: [{ content: { parts: [{ text: "not json" }] } }] },
        "malformed_response",
      ],
      [
        { candidates: [{ content: { parts: [{ text: "{}" }] } }] },
        "invalid_response",
      ],
      [
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      ...validDraftInterpretationResult,
                      source_id: "source:wrong",
                    }),
                  },
                ],
              },
            },
          ],
        },
        "invalid_response",
      ],
      [
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      ...validDraftInterpretationResult,
                      coverage: {
                        total_blocks: 1,
                        block_dispositions: [],
                        unparsed_items: [],
                      },
                    }),
                  },
                ],
              },
            },
          ],
        },
        "invalid_response",
      ],
    ];

    for (const [envelope, code] of cases) {
      const parser = createParser(
        vi.fn(
          async () =>
            new Response(JSON.stringify(envelope), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        ) as typeof globalThis.fetch,
      );
      await expect(
        parser({
          credential: "secret-key",
          source,
          sourceId: source.source_id,
        }),
      ).rejects.toMatchObject({ code });
    }
  });

  it("rejects the captured summary-shaped draft before Review", async () => {
    const fetch = vi.fn(async () =>
      responseWith(summaryShapedInterpretationResult),
    );
    const parser = createParser(fetch as typeof globalThis.fetch);

    const error = await parser({
      credential: "secret-key",
      source,
      sourceId: source.source_id,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(GeminiParseError);
    expect(error).toMatchObject({ code: "invalid_response" });
    expect((error as GeminiParseError).findings).toEqual([
      {
        code: "SCHEMA_INVALID",
        message: "Interpretation response schema is invalid.",
        blocking: true,
      },
    ]);
    expect((error as GeminiParseError).message).not.toContain(
      "Kansai itinerary",
    );
  });

  it("reports a pre-Review gate failure as its own phase, not a schema failure", async () => {
    const orphanedEntity = structuredClone(validDraftInterpretationResult);
    orphanedEntity.draft!.entities[0]!.day_id = "day:not-in-draft";
    const fetch = vi.fn(async () => responseWith(orphanedEntity));

    await expect(
      createParser(fetch as typeof globalThis.fetch)({
        credential: "key",
        source,
        sourceId: source.source_id,
      }),
    ).rejects.toMatchObject({ code: "draft_not_reviewable" });
  });

  it("honors cancellation before and during a request", async () => {
    const before = new AbortController();
    before.abort();
    const untouchedFetch = vi.fn();
    const parser = createParser(untouchedFetch as typeof globalThis.fetch);
    await expect(
      parser({
        credential: "key",
        signal: before.signal,
        source,
        sourceId: source.source_id,
      }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(untouchedFetch).not.toHaveBeenCalled();

    const during = new AbortController();
    const abortingFetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const pending = createParser(abortingFetch as typeof globalThis.fetch)({
      credential: "key",
      signal: during.signal,
      source,
      sourceId: source.source_id,
    });
    during.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });

  it("retries transient 429 and 503 responses but not other provider failures", async () => {
    const wait = vi.fn(
      async (_milliseconds: number, _signal?: AbortSignal) => undefined,
    );
    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValueOnce(responseWith({}, 429))
      .mockResolvedValueOnce(responseWith({}, 429))
      .mockResolvedValueOnce(responseWith(validDraftInterpretationResult));
    const parser = createGeminiTripParser({
      model: "gemini-test-model",
      fetch: rateLimitedFetch as typeof globalThis.fetch,
      maxAttempts: 3,
      retryDelayMs: (attempt) => attempt * 100,
      wait,
    });

    await expect(
      parser({ credential: "key", source, sourceId: source.source_id }),
    ).resolves.toEqual(validDraftInterpretationResult);
    expect(rateLimitedFetch).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls.map(([delay]) => delay)).toEqual([100, 200]);

    const unavailableFetch = vi
      .fn()
      .mockResolvedValueOnce(responseWith({}, 503))
      .mockResolvedValueOnce(responseWith(validDraftInterpretationResult));
    await expect(
      createParser(unavailableFetch as typeof globalThis.fetch)({
        credential: "key",
        source,
        sourceId: source.source_id,
      }),
    ).resolves.toEqual(validDraftInterpretationResult);
    expect(unavailableFetch).toHaveBeenCalledTimes(2);

    const failedFetch = vi.fn(async () => responseWith({}, 500));
    await expect(
      createParser(failedFetch as typeof globalThis.fetch)({
        credential: "key",
        source,
        sourceId: source.source_id,
      }),
    ).rejects.toMatchObject({ code: "provider_unavailable" });
    expect(failedFetch).toHaveBeenCalledOnce();
  });

  it.each([
    [400, "provider_rejected"],
    [404, "provider_rejected"],
    [422, "provider_rejected"],
    [500, "provider_unavailable"],
    [503, "provider_unavailable"],
  ])(
    "reports HTTP %i as %s rather than a lost connection",
    async (status, code) => {
      const fetch = vi.fn(async () => responseWith({}, status as number));

      await expect(
        createParser(fetch as typeof globalThis.fetch, { maxAttempts: 1 })({
          credential: "key",
          source,
          sourceId: source.source_id,
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it.each([401, 403])(
    "reports HTTP %i as a refused credential, not a missing one",
    async (status) => {
      const fetch = vi.fn(async () => responseWith({}, status));

      await expect(
        createParser(fetch as typeof globalThis.fetch)({
          credential: "key",
          source,
          sourceId: source.source_id,
        }),
      ).rejects.toMatchObject({ code: "authentication_failed" });
    },
  );

  it("reports a lost connection separately from a rejected request", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      createParser(fetch as typeof globalThis.fetch)({
        credential: "key",
        source,
        sourceId: source.source_id,
      }),
    ).rejects.toMatchObject({ code: "provider_unreachable" });
  });

  it("ends a request that never answers so the interaction lock releases", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const pending = createParser(fetch as typeof globalThis.fetch, {
        requestTimeoutMs: 5_000,
      })({ credential: "key", source, sourceId: source.source_id });
      const settled = expect(pending).rejects.toMatchObject({
        code: "provider_timeout",
      });

      await vi.advanceTimersByTimeAsync(5_000);
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the request deadline once an attempt settles", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn(async () =>
        responseWith(validDraftInterpretationResult),
      );

      await expect(
        createParser(fetch as typeof globalThis.fetch, {
          requestTimeoutMs: 5_000,
        })({ credential: "key", source, sourceId: source.source_id }),
      ).resolves.toEqual(validDraftInterpretationResult);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops after the configured rate-limit attempts with an actionable safe error", async () => {
    const fetch = vi.fn(async () => responseWith({}, 429));
    const parser = createParser(fetch as typeof globalThis.fetch, {
      maxAttempts: 2,
    });

    const error = await parser({
      credential: "key",
      source,
      sourceId: source.source_id,
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(GeminiParseError);
    expect(error).toMatchObject({ code: "rate_limited" });
    expect(String(error)).not.toContain("sensitive provider detail");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("blocks oversized requests before fetch", async () => {
    const fetch = vi.fn();
    const parser = createParser(fetch as typeof globalThis.fetch, {
      maxRequestBytes: 100,
    });

    await expect(
      parser({ credential: "key", source, sourceId: source.source_id }),
    ).rejects.toMatchObject({
      code: "preflight_limit",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Gemini pre-provider input gate", () => {
  const neverCalled = vi.fn(async () => {
    throw new Error("provider must not be invoked");
  });

  const expectRejected = async (
    request: { source: unknown; sourceId?: string },
    fetch = vi.fn(async () => responseWith(validDraftInterpretationResult)),
  ) => {
    const parser = createParser(fetch as unknown as typeof globalThis.fetch);
    const error = await parser({
      credential: "secret-key",
      source: request.source as UnifiedSourceDocument,
      sourceId: request.sourceId ?? source.source_id,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(GeminiParseError);
    expect(fetch).not.toHaveBeenCalled();
    return error as GeminiParseError;
  };

  it("refuses a schema-invalid source document without calling the provider", async () => {
    const unknownMember = structuredClone(source) as Record<string, unknown>;
    unknownMember.model = "gemini-3.5-flash";

    const error = await expectRejected({ source: unknownMember });
    expect(error.code).toBe("source_document_invalid");
  });

  it("refuses a source document that fails deterministic integrity", async () => {
    const duplicated = structuredClone(source);
    duplicated.evidence_units = [
      duplicated.evidence_units[0]!,
      { ...duplicated.evidence_units[0]!, source_order: 1 },
    ];

    const error = await expectRejected({ source: duplicated });
    expect(error.code).toBe("source_document_invalid");
  });

  it("refuses a document paired with a different source identity", async () => {
    const error = await expectRejected({
      source,
      sourceId: "source:some-other-import",
    });
    expect(error.code).toBe("source_document_invalid");
  });

  it("keeps source content, schema paths, and credentials out of the failure", async () => {
    const broken = structuredClone(source) as Record<string, unknown>;
    delete broken.evidence_units;

    const error = await expectRejected({ source: broken });
    expect(error.message).not.toContain("One day in Osaka");
    expect(error.message).not.toContain("secret-key");
    expect(error.message).not.toContain("evidence_units");
    expect(error.message).not.toContain("#/");
  });

  it("never reaches the provider when the document is rejected", async () => {
    const parser = createParser(
      neverCalled as unknown as typeof globalThis.fetch,
    );
    const orphan = structuredClone(source);
    orphan.evidence_units[0]!.parent_ref = "source-block:404";

    await expect(
      parser({
        credential: "secret-key",
        source: orphan,
        sourceId: source.source_id,
      }),
    ).rejects.toMatchObject({ code: "source_document_invalid" });
    expect(neverCalled).not.toHaveBeenCalled();
  });

  it("sends every evidence unit identity for a valid document", async () => {
    const fetch = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        responseWith(validDraftInterpretationResult),
    );
    const parser = createParser(fetch as typeof globalThis.fetch);

    await parser({
      credential: "secret-key",
      source,
      sourceId: source.source_id,
    });

    const body = String(fetch.mock.calls[0]![1]?.body);
    for (const unit of source.evidence_units) {
      expect(body).toContain(unit.id);
      expect(body).toContain(unit.locator);
    }
  });
});
