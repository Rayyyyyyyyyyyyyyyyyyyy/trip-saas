import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";
import { describe, expect, it } from "vitest";
import {
  createGeminiSchemaProjection,
  GEMINI_SUPPORTED_SCHEMA_KEYWORDS,
  bundleInterpretationSchema,
} from "../../src/integrations/gemini/createGeminiSchemaProjection";
import { validateSemanticInterpretationResultSchema } from "../../src/domain/trip/schemaValidators";
import { DEFAULT_GEMINI_MAX_REQUEST_BYTES } from "../../src/integrations/gemini/geminiTripParser";
import { summaryShapedInterpretationResult } from "../fixtures/contracts/malformedContracts";
import {
  validDraftInterpretationResult,
  validInsufficientInterpretationResult,
} from "../fixtures/contracts/validContracts";

type SchemaNode = Record<string, any>;

function assertContractPreserved(
  authoritative: SchemaNode,
  projected: SchemaNode,
  path = "#",
) {
  if (authoritative.required) {
    expect(projected.required, `${path} required`).toEqual(
      authoritative.required,
    );
  }
  if (authoritative.type) {
    expect(projected.type, `${path} type`).toEqual(authoritative.type);
  }
  if (authoritative.enum) {
    expect(projected.enum, `${path} enum`).toEqual(authoritative.enum);
  }
  if (Object.hasOwn(authoritative, "const")) {
    expect(projected.enum, `${path} const projection`).toEqual([
      authoritative.const,
    ]);
  }

  for (const dictionaryKey of ["properties", "$defs"]) {
    if (!authoritative[dictionaryKey]) continue;
    expect(
      Object.keys(projected[dictionaryKey] ?? {}),
      `${path} ${dictionaryKey}`,
    ).toEqual(Object.keys(authoritative[dictionaryKey]));
    for (const [name, child] of Object.entries(authoritative[dictionaryKey])) {
      assertContractPreserved(
        child as SchemaNode,
        projected[dictionaryKey][name] as SchemaNode,
        `${path}/${dictionaryKey}/${name}`,
      );
    }
  }

  for (const arrayKey of ["anyOf", "oneOf", "prefixItems"]) {
    if (!authoritative[arrayKey]) continue;
    expect(projected[arrayKey], `${path} ${arrayKey}`).toHaveLength(
      authoritative[arrayKey].length,
    );
    (authoritative[arrayKey] as SchemaNode[]).forEach((child, index: number) =>
      assertContractPreserved(
        child,
        projected[arrayKey][index],
        `${path}/${arrayKey}/${index}`,
      ),
    );
  }

  if (authoritative.items && typeof authoritative.items === "object") {
    assertContractPreserved(
      authoritative.items as SchemaNode,
      projected.items as SchemaNode,
      `${path}/items`,
    );
  }
}

function collectUnsupportedKeywords(
  value: unknown,
  path = "#",
  result: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsupportedKeywords(item, `${path}/${index}`, result),
    );
    return result;
  }
  if (!value || typeof value !== "object") return result;

  for (const [key, child] of Object.entries(value)) {
    if (key === "properties" || key === "$defs") {
      for (const [name, schema] of Object.entries(
        child as Record<string, unknown>,
      )) {
        collectUnsupportedKeywords(schema, `${path}/${key}/${name}`, result);
      }
      continue;
    }
    if (!GEMINI_SUPPORTED_SCHEMA_KEYWORDS.has(key))
      result.push(`${path}/${key}`);
    collectUnsupportedKeywords(child, `${path}/${key}`, result);
  }
  return result;
}

describe("Gemini structured-output schema projection", () => {
  const authoritative = bundleInterpretationSchema();
  const projected = createGeminiSchemaProjection();

  it("preserves every required field, type, enum, and discriminator branch", () => {
    assertContractPreserved(
      authoritative as SchemaNode,
      projected as SchemaNode,
    );
  });

  it("contains only officially supported provider keywords", () => {
    expect(collectUnsupportedKeywords(projected)).toEqual([]);
  });

  it("compiles and accepts the same valid response shape", () => {
    const providerValidator = new Ajv2020({ strict: true }).compile(
      projected as AnySchema,
    );

    expect(providerValidator(validDraftInterpretationResult)).toBe(true);
    expect(
      validateSemanticInterpretationResultSchema(validDraftInterpretationResult)
        .valid,
    ).toBe(true);
  });

  it("constrains the direct draft property to a complete draft or null", () => {
    const draftProperty = (projected as SchemaNode).properties
      .draft as SchemaNode;

    expect(Object.keys(draftProperty).length).toBeGreaterThan(0);
    expect(draftProperty.anyOf).toEqual([
      { $ref: "#/$defs/parsedTripDraft" },
      { type: "null" },
    ]);
    expect(
      Object.keys(
        ((projected as SchemaNode).$defs.parsedTripDraft as SchemaNode)
          .properties,
      ),
    ).toEqual([
      "schema_version",
      "trip",
      "days",
      "entities",
      "relationships",
      "supporting_items",
      "findings",
    ]);
  });

  it("accepts valid draft and insufficient results and rejects the summary-shaped draft", () => {
    const providerValidator = new Ajv2020({ strict: true }).compile(
      projected as AnySchema,
    );

    expect(providerValidator(validDraftInterpretationResult)).toBe(true);
    expect(providerValidator(validInsufficientInterpretationResult)).toBe(true);
    expect(providerValidator(summaryShapedInterpretationResult)).toBe(false);
    expect(
      validateSemanticInterpretationResultSchema(
        summaryShapedInterpretationResult,
      ).valid,
    ).toBe(false);
  });

  it("rejects incompatible time fields before a provider response reaches local semantics", () => {
    const providerValidator = new Ajv2020({ strict: true }).compile(
      projected as AnySchema,
    );
    const exactWithEnd = structuredClone(validDraftInterpretationResult);
    exactWithEnd.draft!.entities[0].time = {
      kind: "exact",
      start: "11:55",
      end: "15:35",
      daypart: null,
      raw_text: "11:55 - 15:35",
      crosses_midnight: false,
    };
    const openEndedWithoutStart = structuredClone(
      validDraftInterpretationResult,
    );
    openEndedWithoutStart.draft!.entities[0].time = {
      kind: "open_ended",
      start: null,
      end: null,
      daypart: null,
      raw_text: "Free Time",
      crosses_midnight: false,
    };
    const validRange = structuredClone(exactWithEnd);
    validRange.draft!.entities[0].time.kind = "range";
    const validCrossMidnightRange = structuredClone(validRange);
    validCrossMidnightRange.draft!.entities[0].time = {
      kind: "range",
      start: "23:00",
      end: "00:35",
      daypart: null,
      raw_text: "23:00 - 00:35",
      crosses_midnight: true,
    };
    const validUntimedFreeTime = structuredClone(openEndedWithoutStart);
    validUntimedFreeTime.draft!.entities[0].time.kind = "none";

    expect(providerValidator(exactWithEnd)).toBe(false);
    expect(providerValidator(openEndedWithoutStart)).toBe(false);
    expect(providerValidator(validRange)).toBe(true);
    expect(providerValidator(validCrossMidnightRange)).toBe(true);
    expect(providerValidator(validUntimedFreeTime)).toBe(true);
  });

  it("stays well inside the provider request-size preflight limit", () => {
    const schemaBytes = new TextEncoder().encode(
      JSON.stringify(projected),
    ).byteLength;

    expect(schemaBytes).toBeLessThan(DEFAULT_GEMINI_MAX_REQUEST_BYTES / 10);
  });
});
