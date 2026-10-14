import { describe, expect, it, vi } from "vitest";
import {
  createGeminiTransport,
  GEMINI_ACCEPTANCE_CANDIDATE,
} from "../../src/integrations/gemini/geminiTransport";

const envelope = (value: unknown) =>
  new Response(JSON.stringify(value), { status: 200 });

describe("Gemini structured transport", () => {
  it("extracts structured JSON without applying trip policy, and measures its exact request", async () => {
    const fetch = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        envelope({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }),
    );
    const transport = createGeminiTransport({
      fetch,
      model: GEMINI_ACCEPTANCE_CANDIDATE,
    });
    const prepared = transport.prepare("source prompt");
    expect(fetch).not.toHaveBeenCalled();
    await expect(prepared.send({ credential: "private-key" })).resolves.toEqual(
      {},
    );
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toContain("gemini-3.5-flash:generateContent");
    expect(String(url) + init?.body).not.toContain("private-key");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "private-key" });
    expect(prepared.requestBytes).toBe(
      new TextEncoder().encode(String(init?.body)).byteLength,
    );
  });

  it.each([
    { candidates: {} },
    { candidates: [null] },
    { candidates: [{ content: { parts: {} } }] },
    { candidates: [{ content: { parts: [null, { text: 5 }] } }] },
    { candidates: [{ content: { parts: [{ text: "not json" }] } }] },
  ])("bounds malformed nested envelopes: %j", async (value) => {
    const record = vi.fn();
    const transport = createGeminiTransport({
      model: GEMINI_ACCEPTANCE_CANDIDATE,
      fetch: vi.fn(async () => envelope(value)),
      diagnosticSink: { record },
    });
    await expect(
      transport.prepare("private-source").send({ credential: "private-key" }),
    ).rejects.toMatchObject({ code: "malformed_response" });
    const diagnostic = JSON.stringify(record.mock.calls);
    expect(diagnostic).not.toContain("private-source");
    expect(diagnostic).not.toContain("private-key");
    expect(record.mock.calls[0][0]).toMatchObject({
      phase: "response",
      httpStatus: 200,
    });
  });

  it("does not substitute a model after rejection", async () => {
    const fetch = vi.fn(
      async (_url: string | URL | Request) =>
        new Response("sensitive provider error", { status: 404 }),
    );
    const transport = createGeminiTransport({
      model: GEMINI_ACCEPTANCE_CANDIDATE,
      fetch,
    });
    await expect(
      transport.prepare("source").send({ credential: "key" }),
    ).rejects.toMatchObject({ code: "provider_rejected" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(fetch.mock.calls[0]?.[0])).toContain("gemini-3.5-flash");
  });

  it("cleans retry waiting listeners and timers after success", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 429 }))
        .mockResolvedValueOnce(
          envelope({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }),
        );
      const pending = createGeminiTransport({
        fetch,
        model: GEMINI_ACCEPTANCE_CANDIDATE,
        retryDelayMs: () => 100,
      })
        .prepare("source")
        .send({ credential: "key", signal: controller.signal });
      await vi.advanceTimersByTimeAsync(100);
      await expect(pending).resolves.toEqual({});
      expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      ]);
      expect(vi.getTimerCount()).toBe(0);
      expect(
        remove.mock.calls.filter(([event]) => event === "abort").length,
      ).toBeGreaterThanOrEqual(
        add.mock.calls.filter(([event]) => event === "abort").length,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("recovers from a transient 503 with bounded backoff", async () => {
    const wait = vi.fn(
      async (_milliseconds: number, _signal?: AbortSignal) => undefined,
    );
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(
        envelope({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }),
      );

    await expect(
      createGeminiTransport({
        fetch,
        model: GEMINI_ACCEPTANCE_CANDIDATE,
        retryDelayMs: () => 100,
        wait,
      })
        .prepare("source")
        .send({ credential: "key" }),
    ).resolves.toEqual({});

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    ]);
    expect(wait).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledWith(100, undefined);
  });

  it.each([
    [429, "rate_limited"],
    [503, "provider_unavailable"],
  ] as const)(
    "stops retrying persistent %s at the configured bound on the same exact model",
    async (status, code) => {
      const wait = vi.fn(
        async (_milliseconds: number, _signal?: AbortSignal) => undefined,
      );
      const fetch = vi.fn(
        async (_url: string | URL | Request) => new Response("{}", { status }),
      );

      await expect(
        createGeminiTransport({
          fetch,
          maxAttempts: 3,
          model: GEMINI_ACCEPTANCE_CANDIDATE,
          retryDelayMs: (attempt) => attempt * 100,
          wait,
        })
          .prepare("source")
          .send({ credential: "key" }),
      ).rejects.toMatchObject({ code });

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(wait.mock.calls.map(([delay]) => delay)).toEqual([100, 200]);
    },
  );
});

describe("noncooperative transport deadlines", () => {
  it.each(["fetch", "body"] as const)(
    "times out a permanently pending %s and clears timers",
    async (pendingStage) => {
      vi.useFakeTimers();
      try {
        const fetch = vi.fn(() =>
          pendingStage === "fetch"
            ? new Promise<Response>(() => {})
            : Promise.resolve({
                status: 200,
                ok: true,
                json: () => new Promise<unknown>(() => {}),
              } as Response),
        );
        const pending = createGeminiTransport({
          fetch,
          model: GEMINI_ACCEPTANCE_CANDIDATE,
          requestTimeoutMs: 100,
        })
          .prepare("source")
          .send({ credential: "key" });
        const assertion = expect(pending).rejects.toMatchObject({
          code: "provider_timeout",
        });
        await vi.advanceTimersByTimeAsync(100);
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    },
  );
  it("stops a noncooperative request immediately and removes its deadline", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const fetch = vi.fn(() => new Promise<Response>(() => {}));
      const pending = createGeminiTransport({
        fetch,
        model: GEMINI_ACCEPTANCE_CANDIDATE,
        requestTimeoutMs: 10_000,
      })
        .prepare("source")
        .send({ credential: "key", signal: controller.signal });
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: "aborted" });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps provider failures bounded when diagnostics throw", async () => {
    const transport = createGeminiTransport({
      model: GEMINI_ACCEPTANCE_CANDIDATE,
      fetch: vi.fn(
        async () => new Response("private-provider", { status: 401 }),
      ),
      diagnosticSink: {
        record() {
          throw new Error("private-key");
        },
      },
    });
    await expect(
      transport.prepare("source").send({ credential: "key" }),
    ).rejects.toMatchObject({ code: "authentication_failed" });
  });
});
