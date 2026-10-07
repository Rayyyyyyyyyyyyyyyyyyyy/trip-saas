import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { describe, expect, it, vi } from "vitest";
import { createInterpretTrip } from "../../src/app/interpretTrip";
import { ParseTripError } from "../../src/app/parseTrip";
import type { InterpretationTransport } from "../../src/app/interpretationTransport";
import { validMarkdownSourceDocument } from "../fixtures/contracts/sourceDocuments";
import {
  validDraftInterpretationResult,
  validInsufficientInterpretationResult,
} from "../fixtures/contracts/validContracts";

const source = structuredClone(validMarkdownSourceDocument);
source.evidence_units = [
  { ...source.evidence_units[0], id: "source-block:001" },
];
source.extraction_findings = [];
const sourceGate = validateUnifiedSourceDocument(source, {
  source_id: source.source_id,
});
if (!sourceGate.valid) throw new Error("fixture must validate");
const request = {
  credential: "private-key",
  source: sourceGate.document,
  sourceId: source.source_id,
};
function fakeTransport(
  value: unknown,
  sizes = { requestBytes: 100, estimatedInputTokens: 20 },
) {
  const send = vi.fn(async () => value);
  const prepare = vi.fn((_prompt: string) => ({ ...sizes, send }));
  return { send, prepare };
}

describe("deep interpretation boundary", () => {
  it("expands range coverage before returning a draft and leaves the original response untouched", async () => {
    const value = structuredClone(validDraftInterpretationResult);
    value.coverage.block_dispositions = [];
    value.coverage.block_disposition_ranges = [
      {
        from_id: "source-block:001",
        to_id: "source-block:001",
        disposition: "interpreted",
      },
    ];
    const before = structuredClone(value);
    const result = await createInterpretTrip({
      transport: fakeTransport(value),
    })(request);
    expect(result.coverage).toEqual(validDraftInterpretationResult.coverage);
    expect(value).toEqual(before);
  });
  it("rejects invalid ranges before the draft gate with a recoverable coverage failure", async () => {
    const value = structuredClone(validDraftInterpretationResult);
    value.draft!.entities[0]!.day_id = "invalid:day";
    value.coverage.block_disposition_ranges = [
      {
        from_id: "source-block:001",
        to_id: "source-block:001",
        disposition: "supporting",
      },
    ];
    const onFailure = vi.fn();
    await expect(
      createInterpretTrip({ transport: fakeTransport(value), onFailure })(
        request,
      ),
    ).rejects.toMatchObject({
      code: "coverage_invalid",
      findings: [{ code: "DUPLICATE_BLOCK_DISPOSITION" }],
    });
    expect(onFailure.mock.calls[0]![1]).toBe("response");
  });
  it.each([
    validDraftInterpretationResult,
    validInsufficientInterpretationResult,
  ])("returns only a gated $status outcome", async (value) => {
    const transport = fakeTransport(value);
    const stages: string[] = [];
    const parse = createInterpretTrip({ transport });
    await expect(
      parse({ ...request, onStage: (stage) => stages.push(stage) }),
    ).resolves.toEqual(value);
    expect(stages).toEqual([
      "source_validation",
      "interpreting",
      "output_validation",
    ]);
    expect(transport.prepare).toHaveBeenCalledOnce();
    expect(transport.prepare.mock.calls[0][0]).toContain(
      '"id":"source-block:001"',
    );
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it("rejects invalid source before even constructing a provider envelope", async () => {
    const transport = fakeTransport(validDraftInterpretationResult);
    await expect(
      createInterpretTrip({ transport })({ ...request, sourceId: "wrong" }),
    ).rejects.toMatchObject({ code: "source_document_invalid" });
    expect(transport.prepare).not.toHaveBeenCalled();
  });

  it.each([
    { requestBytes: 101, estimatedInputTokens: 1 },
    { requestBytes: 1, estimatedInputTokens: 21 },
    { requestBytes: NaN, estimatedInputTokens: 1 },
  ])(
    "rejects request budget overflow before transmission: %j",
    async (sizes) => {
      const transport = fakeTransport({}, sizes);
      await expect(
        createInterpretTrip({
          transport,
          maxRequestBytes: 100,
          maxEstimatedInputTokens: 20,
        })(request),
      ).rejects.toMatchObject({ code: "preflight_limit" });
      expect(transport.send).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["schema", {}, "invalid_response"],
    [
      "source identity",
      { ...validDraftInterpretationResult, source_id: "wrong" },
      "invalid_response",
    ],
    [
      "coverage",
      {
        ...validDraftInterpretationResult,
        coverage: {
          ...validDraftInterpretationResult.coverage,
          block_dispositions: [],
        },
      },
      "invalid_response",
    ],
    [
      "reviewability",
      (() => {
        const value = structuredClone(validDraftInterpretationResult);
        value.draft!.entities[0].day_id = "absent";
        return value;
      })(),
      "draft_not_reviewable",
    ],
  ])(
    "rejects invalid %s after transport extraction",
    async (_name, value, code) => {
      const transport = fakeTransport(value);
      const onFailure = vi.fn();
      await expect(
        createInterpretTrip({ transport, onFailure })(request),
      ).rejects.toMatchObject({ code });
      expect(transport.send).toHaveBeenCalledOnce();
      expect(onFailure.mock.calls[0][1]).toBe("response");
    },
  );

  it.each([
    "malformed_response",
    "provider_timeout",
    "authentication_failed",
    "rate_limited",
    "aborted",
  ] as const)("preserves bounded transport failure %s", async (code) => {
    const transport = fakeTransport(null);
    transport.send.mockRejectedValue(new ParseTripError(code, "safe failure"));
    await expect(
      createInterpretTrip({ transport })(request),
    ).rejects.toMatchObject({ code });
  });

  it("sanitizes unexpected transport failures instead of exposing their message", async () => {
    const transport = fakeTransport(null);
    transport.send.mockRejectedValue(new Error("private-key source body"));
    const onFailure = vi.fn();
    const error = await createInterpretTrip({ transport, onFailure })(
      request,
    ).catch((error) => error);
    expect(error.code).toBe("provider_unreachable");
    expect(JSON.stringify(error) + error.message).not.toContain("private-key");
    expect(onFailure.mock.calls[0][1]).toBe("request");
  });

  it("rejects a late transport success after cancellation without validating output", async () => {
    const controller = new AbortController();
    let resolve!: (value: unknown) => void;
    const transport: InterpretationTransport = {
      prepare: () => ({
        requestBytes: 1,
        estimatedInputTokens: 1,
        send: () =>
          new Promise((r) => {
            resolve = r;
          }),
      }),
    };
    const stages: string[] = [];
    const pending = createInterpretTrip({ transport })({
      ...request,
      signal: controller.signal,
      onStage: (stage) => stages.push(stage),
    });
    controller.abort();
    resolve(validDraftInterpretationResult);
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
    expect(stages).toEqual(["source_validation", "interpreting"]);
  });

  it("respects cancellation at the validation stage boundary", async () => {
    const controller = new AbortController();
    const onFailure = vi.fn();
    await expect(
      createInterpretTrip({ transport: fakeTransport({}), onFailure })({
        ...request,
        signal: controller.signal,
        onStage: (stage) => {
          if (stage === "output_validation") controller.abort();
        },
      }),
    ).rejects.toMatchObject({ code: "aborted" });
    expect(onFailure.mock.calls[0][1]).toBe("request");
  });
});

describe("bounded configuration and diagnostic failures", () => {
  it.each([NaN, -1, Infinity])(
    "rejects invalid configured request limits %s",
    async (limit) => {
      const transport = fakeTransport({});
      await expect(
        createInterpretTrip({ transport, maxRequestBytes: limit })(request),
      ).rejects.toMatchObject({ code: "preflight_limit" });
      expect(transport.send).not.toHaveBeenCalled();
    },
  );
  it("bounds prepare failures even when the diagnostic sink also throws", async () => {
    const transport: InterpretationTransport = {
      prepare: () => {
        throw new Error("private-key source-body");
      },
    };
    const result = await createInterpretTrip({
      transport,
      onFailure: () => {
        throw new Error("private-key");
      },
    })(request).catch((error) => error);
    expect(result.code).toBe("preflight_limit");
    expect(result.message).not.toContain("private-key");
  });
});
