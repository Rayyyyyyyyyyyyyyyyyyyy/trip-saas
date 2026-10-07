import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ParseTrip, ParseTripRequest } from "../../src/app/parseTrip";
import { TripRuntimeStartup } from "../../src/app/TripRuntimeStartup";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import type { SemanticInterpretationResult } from "../../src/domain/trip/types";
import { createIntakeFailure } from "../../src/features/import/intakeFailure";
import type { ConfirmedTripRepository } from "../../src/persistence/confirmedTripRepository";
import type { GeminiCredentialRepository } from "../../src/persistence/geminiCredentialRepository";
import type { LocalDataOperations } from "../../src/persistence/localDataOperations";
import {
  validInsufficientInterpretationResult,
  validParsedTripDraft,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";

const sampleTrip = buildCanonicalTrip(validParsedTripDraft);

const credentialRepository: GeminiCredentialRepository = {
  clear: vi.fn(),
  load: vi.fn(async () => ({
    status: "ready" as const,
    credential: "test-key",
  })),
  probePersistence: vi.fn(async () => ({ supported: true as const })),
  save: vi.fn(),
};

const localDataOperations = {
  clearAllLocalData: vi.fn(),
  clearCredential: vi.fn(),
  clearTripData: vi.fn(),
} as unknown as LocalDataOperations;

function createRepository(
  options: {
    active?: typeof sampleTrip | null;
    replaceActive?: ConfirmedTripRepository["replaceActive"];
  } = {},
): ConfirmedTripRepository {
  return {
    clear: vi.fn(),
    loadActive: vi.fn(async () =>
      options.active
        ? { status: "ready" as const, trip: options.active }
        : { status: "empty" as const },
    ),
    replaceActive: vi.fn(options.replaceActive ?? (async () => undefined)),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const parseTrip: ParseTrip = vi.fn(async ({ source }: ParseTripRequest) => {
  const sourceRef = source.evidence_units[0]!.id;
  const draft = structuredClone(validParsedTripDraft);
  draft.trip = {
    ...draft.trip,
    id: "trip:workflow-confirmed",
    title: "Workflow confirmed trip",
    source_refs: [sourceRef],
  };
  draft.days = draft.days.map((day) => ({
    ...day,
    source_refs: [sourceRef],
  }));
  draft.entities = draft.entities.map((entity) => ({
    ...entity,
    source_refs: [sourceRef],
  }));
  return {
    schema_version: "semantic-interpretation-result.v2",
    source_schema_version: source.schema_version,
    source_id: source.source_id,
    status: "draft",
    draft,
    findings: [],
    coverage: {
      total_blocks: source.evidence_units.length,
      block_dispositions: source.evidence_units.map((unit) => ({
        source_ref: unit.id,
        disposition: "interpreted" as const,
      })),
      unparsed_items: [],
    },
  } satisfies SemanticInterpretationResult;
});

async function startPasteWorkflow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("tab", { name: "直接貼上" }));
  await user.type(
    screen.getByLabelText("貼上 Markdown 行程內容"),
    validTextSourceInput.content,
  );
  await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
  expect(
    await screen.findByRole("heading", { name: "對照原文，把行程確認清楚。" }),
  ).toBeVisible();
}

describe("integrated local Review workflow", () => {
  it("derives supporting groups after provider gates and carries them through Review confirmation", async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    let recordedDraft: typeof validParsedTripDraft | null = null;
    const parser: ParseTrip = vi.fn(async ({ source }: ParseTripRequest) => {
      const pizza = source.evidence_units.find(
        (unit) => unit.display_value === "Pizza",
      )!;
      const firstSourceRef = source.evidence_units[0]!.id;
      const draft = structuredClone(validParsedTripDraft);
      draft.trip.source_refs = [firstSourceRef];
      draft.days[0]!.source_refs = [firstSourceRef];
      draft.entities[0]!.source_refs = [firstSourceRef];
      draft.supporting_items = [
        {
          id: "support:food",
          kind: "note",
          text: "Pizza",
          url: null,
          unresolved: false,
          source_refs: [pizza.id],
        },
      ];
      recordedDraft = draft;
      return {
        schema_version: "semantic-interpretation-result.v2",
        source_schema_version: source.schema_version,
        source_id: source.source_id,
        status: "draft",
        draft,
        findings: [],
        coverage: {
          total_blocks: source.evidence_units.length,
          block_dispositions: source.evidence_units.map((unit, index) => ({
            source_ref: unit.id,
            disposition: index === 0 ? "interpreted" : "supporting",
          })),
          unparsed_items: [],
        },
      } satisfies SemanticInterpretationResult;
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={parser}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip) => <h1>Viewer: {trip.title}</h1>}
      />,
    );

    await user.click(await screen.findByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByLabelText("貼上 Markdown 行程內容"),
      "# Travel\n\n## Food list\n\nPizza",
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));
    expect(
      await screen.findByRole("heading", {
        name: "對照原文，把行程確認清楚。",
      }),
    ).toBeVisible();
    expect(recordedDraft!.supporting_items[0]!.group).toBeUndefined();

    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));
    expect(screen.getByText("分類：Food list")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );

    await waitFor(() =>
      expect(repository.replaceActive).toHaveBeenCalledOnce(),
    );
    expect(
      vi.mocked(repository.replaceActive).mock.calls[0]![0].supporting_items[0]!
        .group,
    ).toEqual({
      id: expect.stringMatching(/^heading:source:.*:block:0002$/),
      label: "Food list",
      order: 1,
    });
  });

  it("keeps the original interpretation intact while confirming only the conservatively adjusted candidate", async () => {
    const user = userEvent.setup();
    const repository = createRepository({ active: sampleTrip });
    let recordedInterpretation: SemanticInterpretationResult | null = null;
    const parser: ParseTrip = vi.fn(async ({ source }: ParseTripRequest) => {
      const sourceRef = source.evidence_units[0]!.id;
      const draft = structuredClone(validParsedTripDraft);
      draft.trip = {
        ...draft.trip,
        id: "trip:adjusted-review",
        title: "Adjusted Review Trip",
        source_refs: [sourceRef],
      };
      draft.days = draft.days.map((day) => ({
        ...day,
        source_refs: [sourceRef],
      }));
      draft.entities = draft.entities.map((entity) => ({
        ...entity,
        source_refs: [sourceRef],
        time: {
          kind: "exact" as const,
          start: "06:30",
          end: null,
          daypart: null,
          raw_text: "6:30",
          crosses_midnight: false,
        },
      }));
      recordedInterpretation = {
        schema_version: "semantic-interpretation-result.v2",
        source_schema_version: source.schema_version,
        source_id: source.source_id,
        status: "draft",
        draft,
        findings: [
          {
            id: "finding:local-fidelity:ambiguous_clock_precision_inferred:workflow",
            blocking: true,
            code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
            message: "6:30 has no supported meridiem.",
            severity: "review",
            entity_refs: [draft.entities[0]!.id],
            source_refs: [sourceRef],
          },
        ],
        coverage: {
          total_blocks: source.evidence_units.length,
          block_dispositions: source.evidence_units.map((unit) => ({
            source_ref: unit.id,
            disposition: "interpreted" as const,
          })),
          unparsed_items: [],
        },
      };
      return recordedInterpretation;
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={parser}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await startPasteWorkflow(user);

    expect(screen.getByText("系統保守調整 1 項")).toBeVisible();
    expect(screen.getByText(/現在：時間未定，保留「6:30」/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeEnabled();
    expect(repository.replaceActive).not.toHaveBeenCalled();
    expect(recordedInterpretation!.draft!.entities[0]!.time).toMatchObject({
      kind: "exact",
      start: "06:30",
    });

    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));
    expect(
      screen.getByRole("combobox", { name: "時間精度" }),
    ).toHaveTextContent("沒有時間");
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );

    await waitFor(() =>
      expect(repository.replaceActive).toHaveBeenCalledOnce(),
    );
    expect(vi.mocked(repository.replaceActive).mock.calls[0]![0]).toMatchObject(
      {
        id: "trip:adjusted-review",
        entities: [
          {
            time: {
              kind: "none",
              start: null,
              raw_text: "6:30",
            },
            state: { unresolved: true },
          },
        ],
      },
    );
  });

  it("offers a configured fallback only after provider unavailability and reuses the selected source explicitly", async () => {
    const user = userEvent.setup();
    const primaryParser: ParseTrip = vi.fn(async () => {
      throw Object.assign(new Error("primary model overloaded"), {
        code: "provider_unavailable",
      });
    });
    const fallbackParser: ParseTrip = vi.fn((request) => parseTrip(request));

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        fallbackModel="gemini-3.6-flash"
        fallbackParseTrip={fallbackParser}
        localDataOperations={localDataOperations}
        parseTrip={primaryParser}
        repository={createRepository()}
        sampleTrip={sampleTrip}
        renderViewer={(trip) => <h1>Viewer: {trip.title}</h1>}
      />,
    );

    await user.click(await screen.findByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByLabelText("貼上 Markdown 行程內容"),
      validTextSourceInput.content,
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      createIntakeFailure("provider_unavailable").message,
    );
    expect(primaryParser).toHaveBeenCalledOnce();
    expect(fallbackParser).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: "改用 gemini-3.6-flash 重試",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "對照原文，把行程確認清楚。",
      }),
    ).toBeVisible();
    expect(fallbackParser).toHaveBeenCalledOnce();
    const primaryRequest = vi.mocked(primaryParser).mock.calls[0]![0];
    const fallbackRequest = vi.mocked(fallbackParser).mock.calls[0]![0];
    expect(
      fallbackRequest.source.evidence_units.map((unit) => unit.display_value),
    ).toEqual(
      primaryRequest.source.evidence_units.map((unit) => unit.display_value),
    );
    expect(fallbackRequest.sourceId).toBe(fallbackRequest.source.source_id);
  });

  it("releases the interaction lock and names the timed-out phase", async () => {
    const user = userEvent.setup();
    const repository = createRepository({ active: sampleTrip });
    // The adapter enforces its own request deadline and reports it through the
    // port. This proves the app half: the blocking dialog closes, the notice
    // names the provider-request phase, and the active trip is untouched.
    const timingOutParser: ParseTrip = vi.fn(async () => {
      throw Object.assign(new Error("raw provider internals"), {
        code: "provider_timeout",
      });
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={timingOutParser}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByLabelText("貼上 Markdown 行程內容"),
      validTextSourceInput.content,
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent(
      createIntakeFailure("provider_timed_out").message,
    );
    expect(notice).not.toHaveTextContent("raw provider internals");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("button", { name: "重新送出這份行程" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("heading", { name: "對照原文，把行程確認清楚。" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "回到目前行程" }),
    ).toHaveTextContent(sampleTrip.title!);
  });

  it("keeps an insufficient interpretation out of Review and preserves the active trip on recovery", async () => {
    const user = userEvent.setup();
    const repository = createRepository({ active: sampleTrip });
    const insufficientParser: ParseTrip = vi.fn(
      async ({ source }: ParseTripRequest) => {
        const sourceRef = source.evidence_units[0]!.id;
        const result = structuredClone(validInsufficientInterpretationResult);
        result.source_schema_version = source.schema_version;
        result.source_id = source.source_id;
        result.findings = result.findings.map((finding) => ({
          ...finding,
          source_refs: [sourceRef],
        }));
        result.coverage = {
          total_blocks: source.evidence_units.length,
          block_dispositions: source.evidence_units.map((unit) => ({
            source_ref: unit.id,
            disposition: "unparsed" as const,
          })),
          unparsed_items: result.coverage.unparsed_items.map((item) => ({
            ...item,
            source_ref: sourceRef,
          })),
        };
        return result;
      },
    );

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={insufficientParser}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await user.click(screen.getByRole("tab", { name: "直接貼上" }));
    await user.type(
      screen.getByLabelText("貼上 Markdown 行程內容"),
      validTextSourceInput.content,
    );
    await user.click(screen.getByRole("button", { name: "送給 Gemini 判讀" }));

    expect(
      await screen.findByRole("heading", {
        name: "目前還無法安全整理這份行程。",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "對照原文，把行程確認清楚。" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "換一份內容" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "取消這次匯入" }));

    const openActive = screen.getByRole("button", { name: "回到目前行程" });
    expect(openActive).toHaveTextContent(sampleTrip.title!);
    expect(repository.replaceActive).not.toHaveBeenCalled();
  });

  it("shows pending confirmation until persistence commits, then opens the exact active trip on request", async () => {
    const user = userEvent.setup();
    const replacement = createDeferred<void>();
    const repository = createRepository({
      replaceActive: () => replacement.promise,
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={parseTrip}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip) => <h1>Viewer: {trip.title}</h1>}
      />,
    );

    await startPasteWorkflow(user);
    expect(repository.replaceActive).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );

    await waitFor(() =>
      expect(repository.replaceActive).toHaveBeenCalledOnce(),
    );
    const persisted = vi.mocked(repository.replaceActive).mock.calls[0]![0];
    expect(persisted.schema_version).toBe("canonical-trip.v3");
    expect(persisted.entities[0].provenance).toMatchObject({
      origin: "source",
      source_id: expect.stringMatching(/^source:/),
      locator_refs: [expect.stringMatching(/^source:/)],
    });
    expect(
      screen.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "正在安全儲存…" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("heading", {
        name: "「Workflow confirmed trip」已經可以使用",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Viewer: Workflow confirmed trip",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "「Workflow confirmed trip」已經可以使用",
      }),
    ).not.toBeInTheDocument();

    replacement.resolve();

    expect(
      await screen.findByRole("heading", {
        name: "「Workflow confirmed trip」已經可以使用",
      }),
    ).toBeVisible();
    expect(screen.getByText("儲存完成")).toBeVisible();
    expect(screen.getByRole("button", { name: "開啟這份行程" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "回到首頁管理行程" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "開啟這份行程" }));
    expect(
      screen.getByRole("heading", {
        name: "Viewer: Workflow confirmed trip",
      }),
    ).toBeVisible();
  });

  it("routes success back to Home with the newly committed trip as the only active trip", async () => {
    const user = userEvent.setup();
    const repository = createRepository({ active: sampleTrip });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={parseTrip}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await startPasteWorkflow(user);
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "回到首頁管理行程",
      }),
    );

    const openActive = screen.getByRole("button", { name: "回到目前行程" });
    expect(openActive).toHaveTextContent("Workflow confirmed trip");
    expect(openActive).not.toHaveTextContent(sampleTrip.title!);
    expect(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue("");

    await user.click(openActive);
    expect(
      screen.getByRole("heading", {
        name: "Viewer: Workflow confirmed trip",
      }),
    ).toBeVisible();
  });

  it("keeps Review recoverable and never shows success when persistence fails", async () => {
    const user = userEvent.setup();
    const repository = createRepository({
      active: sampleTrip,
      replaceActive: async () => {
        throw new Error("transaction aborted");
      },
    });

    render(
      <TripRuntimeStartup
        credentialRepository={credentialRepository}
        localDataOperations={localDataOperations}
        parseTrip={parseTrip}
        repository={repository}
        sampleTrip={sampleTrip}
        renderViewer={(trip, controls) => (
          <div>
            <h1>Viewer: {trip.title}</h1>
            <button onClick={controls.onShowHome}>Show Home</button>
          </div>
        )}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Show Home" }));
    await startPasteWorkflow(user);
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );

    expect(
      await screen.findByText("行程尚未安全儲存，原本的行程仍然保留。"),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: "Viewer: Workflow confirmed trip",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "取消匯入，保留目前行程" }),
    );
    expect(
      screen.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue(validTextSourceInput.content);
    await user.click(screen.getByRole("button", { name: "回到目前行程" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: `Viewer: ${sampleTrip.title}` }),
      ).toBeVisible(),
    );
  });

  it("reloads a committed trip directly in Viewer without persisting the success surface", async () => {
    const user = userEvent.setup();
    let persistedTrip: typeof sampleTrip | null = null;
    const repository: ConfirmedTripRepository = {
      clear: vi.fn(),
      loadActive: vi.fn(async () =>
        persistedTrip
          ? { status: "ready" as const, trip: persistedTrip }
          : { status: "empty" as const },
      ),
      replaceActive: vi.fn(async (trip) => {
        persistedTrip = trip;
      }),
    };
    const props = {
      credentialRepository,
      localDataOperations,
      parseTrip,
      repository,
      sampleTrip,
      renderViewer: (trip: typeof sampleTrip) => <h1>Viewer: {trip.title}</h1>,
    };
    const first = render(<TripRuntimeStartup {...props} />);

    await startPasteWorkflow(user);
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "「Workflow confirmed trip」已經可以使用",
      }),
    ).toBeVisible();

    first.unmount();
    render(<TripRuntimeStartup {...props} />);

    expect(
      await screen.findByRole("heading", {
        name: "Viewer: Workflow confirmed trip",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: "「Workflow confirmed trip」已經可以使用",
      }),
    ).not.toBeInTheDocument();
  });
});
