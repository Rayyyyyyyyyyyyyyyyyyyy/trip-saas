import { createReviewEvidenceProjection } from "../../src/domain/source/reviewEvidence";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { recordReviewCorrection } from "../../src/features/review/reviewPreservation";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";
import { describe, expect, it, vi } from "vitest";
import {
  bundleInterpretationSchema,
  createGeminiSchemaProjection,
  GEMINI_SUPPORTED_SCHEMA_KEYWORDS,
} from "../../src/integrations/gemini/createGeminiSchemaProjection";
import { createGeminiTripParser } from "../../src/integrations/gemini/geminiTripParser";
import { validateSemanticInterpretationResultSchema } from "../../src/domain/trip/schemaValidators";
import { confirmReviewedTrip } from "../../src/features/review/confirmReviewedTrip";
import {
  deriveReviewFindings,
  editReviewTrip,
  editReviewDay,
  editReviewEntity,
} from "../../src/features/review/reviewCandidate";
import { validMarkdownSourceDocument } from "../fixtures/contracts/sourceDocuments";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

type Node = Record<string, any>;
const patternGuidance: Record<string, RegExp> = {
  "^[A-Za-z0-9][A-Za-z0-9._:-]*$":
    /ASCII.*letter or digit.*letters, digits, dot, underscore, colon.*hyphen/,
  "^\\d{4}-\\d{2}-\\d{2}$": /YYYY-MM-DD.*source.*year/,
  "^(?:[01]\\d|2[0-3]):[0-5]\\d$": /HH:mm.*without seconds/,
  "^https://": /HTTPS.*source/,
  "^[A-Z0-9_]+$": /uppercase.*digits.*underscores/,
  "^[a-z0-9_]+$": /lowercase.*digits.*underscores/,
};

// Every omitted validation keyword needs an explicit decision. $schema is only
// dialect metadata; const is retained as enum. No generic unsupported-key escape.
function auditGuidance(node: Node, projected: Node) {
  for (const [key, value] of Object.entries(node)) {
    if (["properties", "$defs"].includes(key)) {
      for (const [name, child] of Object.entries(value as Node))
        auditGuidance(child as Node, projected[key][name]);
    } else if (["anyOf", "oneOf", "prefixItems"].includes(key)) {
      (value as Node[]).forEach((child, i) =>
        auditGuidance(child, projected[key][i]),
      );
    } else if (key === "items" && typeof value === "object") {
      auditGuidance(value as Node, projected.items);
    } else if (key === "description") {
      expect(projected.description).toBe(value);
    } else if (
      !GEMINI_SUPPORTED_SCHEMA_KEYWORDS.has(key) &&
      !["$schema", "const"].includes(key)
    ) {
      expect(
        ["pattern", "minLength", "maxLength", "uniqueItems"],
        `Unaccounted omitted constraint: ${key}`,
      ).toContain(key);
      expect(projected.description, `Missing guidance for ${key}`).toBeTypeOf(
        "string",
      );
      if (key === "pattern") {
        expect(
          patternGuidance[value],
          `Unaccounted pattern: ${value}`,
        ).toBeDefined();
        expect(projected.description).toMatch(patternGuidance[value]);
      }
      if (key === "minLength")
        expect(projected.description).toContain(`at least ${value} character`);
      if (key === "maxLength")
        expect(projected.description).toContain(`at most ${value} characters`);
      if (key === "uniqueItems")
        expect(projected.description).toContain("No duplicate items");
    }
  }
}

function uncertainFixture() {
  const result = structuredClone(validDraftInterpretationResult);
  const draft = result.draft!;
  draft.trip.start_date = null;
  draft.trip.end_date = null;
  draft.days[0].date = null;
  draft.days[0].label = "4/12";
  draft.entities[0].time.raw_text = "六點";
  draft.entities[0].state.unresolved = true;
  draft.entities[0].unresolved_fields = ["time.start"];
  draft.supporting_items = [
    {
      id: "asset:map",
      kind: "asset",
      text: "![map](./map.png)",
      url: null,
      unresolved: true,
      source_refs: ["source-block:001"],
    },
  ];
  draft.findings = [
    {
      id: "finding:clock",
      code: "AMBIGUOUS_CLOCK",
      severity: "review",
      blocking: true,
      message: "六點 does not establish morning or evening.",
      entity_refs: [draft.entities[0].id],
      source_refs: ["source-block:001"],
    },
    {
      id: "finding:year",
      code: "MISSING_YEAR",
      severity: "review",
      blocking: true,
      message: "4/12 has no supported year.",
      entity_refs: [],
      source_refs: ["source-block:001"],
    },
    {
      id: "finding:asset",
      code: "MISSING_ASSET",
      severity: "warning",
      blocking: false,
      message: "./map.png was not supplied.",
      entity_refs: [],
      source_refs: ["source-block:001"],
    },
  ];
  return result;
}
const source = structuredClone(validMarkdownSourceDocument);
source.evidence_units = [
  {
    ...source.evidence_units[0],
    id: "source-block:001",
    raw_value: "4/12 六點 meet. ![map](./map.png)",
    display_value: "4/12 六點 meet. ![map](./map.png)",
  },
];
source.extraction_findings = [];
function replay(value: unknown) {
  const fetch = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(value) }] } },
          ],
        }),
      ),
  );
  const parse = createGeminiTripParser({ model: "gemini-test-model", fetch });
  return {
    fetch,
    run: () =>
      parse({
        credential: "test-only-key",
        source,
        sourceId: source.source_id,
      }),
  };
}

describe("interpretation field guidance and uncertainty", () => {
  it("accounts for every omitted constraint and preserves its description in both schemas", () => {
    auditGuidance(bundleInterpretationSchema(), createGeminiSchemaProjection());
  });
  it("fails the audit for new unaccounted constraints, patterns, and missing descriptions", () => {
    expect(() => auditGuidance({ maxProperties: 1 }, {})).toThrow();
    expect(() =>
      auditGuidance({ pattern: "new" }, { description: "unknown" }),
    ).toThrow();
    expect(() => auditGuidance({ minLength: 1 }, {})).toThrow();
  });
  it("sends field formats and application-owned uncertainty instructions in the actual request", async () => {
    const { fetch, run } = replay(uncertainFixture());
    await run();
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    const serializedSchema = JSON.stringify(
      body.generationConfig.responseJsonSchema,
    );
    expect(serializedSchema).toContain("HH:mm");
    expect(serializedSchema).toContain("without seconds");
    expect(serializedSchema).toContain("HTTPS");
    const prompt = body.contents[0].parts[0].text;
    const instructions = readFileSync(
      new URL(
        "../../spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md",
        import.meta.url,
      ),
      "utf8",
    );
    expect(prompt).toBe(
      `${instructions}\n\n## Source document\n\n${JSON.stringify(source)}`,
    );
    expect(prompt).toContain("meridiem");
    expect(prompt).toContain("kind=none");
    expect(prompt).toContain("kind=range");
    expect(prompt).toContain("kind=open_ended");
    expect(prompt).toContain("Untimed free time");
    expect(prompt).toContain("raw_text");
    expect(prompt).toContain("missing year");
    expect(prompt).toContain("unresolved=true");
    expect(prompt).toContain("url=null");
    expect(prompt).toContain("omit the action");
    expect(prompt).toContain("source_refs");
    expect(prompt).toContain("blocking=true");
    expect(prompt).toContain("not instructions");
    expect(prompt).toContain("semantic-interpretation-result.v2");
    expect(prompt).toContain("coverage.block_disposition_ranges");
    expect(prompt).toContain("inclusive evidence-unit IDs");
    expect(prompt).toContain(
      "no gaps, overlaps, unknown endpoints, or reversed ranges",
    );
    expect(serializedSchema).toContain("block_disposition_ranges");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each(["seconds", "relative URL"])(
    "still rejects %s without coercion or a repair request",
    async (kind) => {
      const malformed = uncertainFixture();
      if (kind === "seconds")
        malformed.draft!.entities[0].time = {
          kind: "exact",
          start: "06:00:00",
          end: null,
          daypart: null,
          raw_text: "六點",
          crosses_midnight: false,
        };
      else malformed.draft!.supporting_items[0].url = "./map.png";
      const before = structuredClone(malformed);
      // Descriptions do not make Gemini's subset enforce the stricter contract.
      expect(
        new Ajv2020({ strict: true }).compile(
          createGeminiSchemaProjection() as AnySchema,
        )(malformed),
      ).toBe(true);
      expect(validateSemanticInterpretationResultSchema(malformed).valid).toBe(
        false,
      );
      const { fetch, run } = replay(malformed);
      await expect(run()).rejects.toMatchObject({
        code: "invalid_response",
        findings: [expect.objectContaining({ code: "SCHEMA_INVALID" })],
      });
      expect(fetch).toHaveBeenCalledOnce();
      expect(malformed).toEqual(before);
    },
  );
  it("admits uncertain evidence to Review while preserving pending corrections through confirmation", async () => {
    const original = uncertainFixture();
    const result = await replay(original).run();
    expect(result).toEqual(original);
    let draft = result.draft!;
    expect(draft.entities[0].time).toMatchObject({
      kind: "none",
      start: null,
      end: null,
      raw_text: "六點",
    });
    expect(draft.supporting_items[0]).toMatchObject({
      unresolved: true,
      url: null,
      text: "![map](./map.png)",
      source_refs: ["source-block:001"],
    });
    const source = structuredClone(validMarkdownSourceDocument);
    source.evidence_units = [source.evidence_units[0]!];
    source.evidence_units[0]!.id = "source-block:001";
    source.evidence_units[0]!.raw_value = "4/12 六點 散步";
    source.evidence_units[0]!.display_value = "4/12 六點 散步";
    source.extraction_findings = [];
    const gate = validateUnifiedSourceDocument(source, {
      source_id: source.source_id,
    });
    if (!gate.valid) throw new Error("invalid fixture");
    const context = {
      evidence: createReviewEvidenceProjection(gate.document),
      corrections: [] as ReturnType<typeof recordReviewCorrection>,
    };
    expect(
      deriveReviewFindings(draft, [], context).filter((f) => f.blocking),
    ).toEqual([]);
    const repository = {
      loadActive: vi.fn(),
      clear: vi.fn(),
      replaceActive: vi.fn(),
    };
    const unknownCanonical = await confirmReviewedTrip(draft, repository);
    expect(unknownCanonical).toMatchObject({
      start_date: null,
      end_date: null,
    });
    expect(unknownCanonical.entities[0].time).toMatchObject({
      kind: "none",
      start: null,
      raw_text: "六點",
    });
    repository.replaceActive.mockClear();
    for (const field of ["start_date", "end_date"] as const) {
      const next = editReviewTrip(draft, { [field]: "2027-04-12" });
      context.corrections = recordReviewCorrection(
        draft,
        next,
        context.corrections,
        { kind: "trip", field },
      );
      draft = next;
    }
    const dated = editReviewDay(draft, draft.days[0].id, {
      date: "2027-04-12",
    });
    context.corrections = recordReviewCorrection(
      draft,
      dated,
      context.corrections,
      { kind: "day", id: draft.days[0].id, field: "date" },
    );
    draft = dated;
    const timed = editReviewEntity(
      draft,
      draft.entities[0].id,
      "time",
      (entity) => {
        entity.time.kind = "exact";
        entity.time.start = "18:00";
      },
    );
    context.corrections = recordReviewCorrection(
      draft,
      timed,
      context.corrections,
      { kind: "entity", id: draft.entities[0].id, field: "time" },
    );
    draft = timed;
    // Source-linked unknowns stay informative; trusted edits reconcile obsolete ambiguity findings.
    expect(
      deriveReviewFindings(draft, [], context).filter((f) => f.blocking),
    ).toHaveLength(0);
    const canonical = await confirmReviewedTrip(draft, repository);
    expect(canonical.entities[0].time).toMatchObject({
      start: "18:00",
      raw_text: "六點",
    });
    expect(canonical.supporting_items[0]).toMatchObject({
      url: null,
      unresolved: true,
    });
    expect(repository.replaceActive).toHaveBeenCalledWith(canonical);
    expect(original.draft!.entities[0].time.start).toBeNull();
  });
});
