import parsedTripDraftSchema from "../../domain/trip/schemas/parsed-trip-draft.v1.schema.json";
import semanticInterpretationResultSchema from "../../domain/trip/schemas/semantic-interpretation-result.v2.schema.json";

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export const GEMINI_SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

const parsedDraftSchemaId = parsedTripDraftSchema.$id;
const bundledDraftPointer = "#/$defs/parsedTripDraft";

function rewriteRefs(
  value: JsonValue,
  rewrite: (reference: string) => string,
): JsonValue {
  if (Array.isArray(value))
    return value.map((item) => rewriteRefs(item, rewrite));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === "$ref" && typeof child === "string"
        ? rewrite(child)
        : rewriteRefs(child, rewrite),
    ]),
  );
}

export function bundleInterpretationSchema(): JsonObject {
  const bundledDraft = rewriteRefs(
    parsedTripDraftSchema as unknown as JsonObject,
    (reference) =>
      reference.startsWith("#/$defs/")
        ? `${bundledDraftPointer}/${reference.slice(2)}`
        : reference,
  ) as JsonObject;
  delete bundledDraft.$id;
  const bundledResult = rewriteRefs(
    semanticInterpretationResultSchema as unknown as JsonObject,
    (reference) => {
      if (reference === parsedDraftSchemaId) return bundledDraftPointer;
      if (reference.startsWith(`${parsedDraftSchemaId}#/$defs/`)) {
        return `${bundledDraftPointer}/$defs/${reference.split("#/$defs/")[1]}`;
      }
      return reference;
    },
  ) as JsonObject;

  const existingDefinitions =
    bundledResult.$defs &&
    typeof bundledResult.$defs === "object" &&
    !Array.isArray(bundledResult.$defs)
      ? bundledResult.$defs
      : {};

  return {
    ...bundledResult,
    $defs: {
      ...existingDefinitions,
      parsedTripDraft: bundledDraft,
    },
  };
}

function projectSchemaNode(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(projectSchemaNode);
  if (!value || typeof value !== "object") return value;

  const projected: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "const") {
      projected.enum = [structuredClone(child)];
      continue;
    }
    if (!GEMINI_SUPPORTED_SCHEMA_KEYWORDS.has(key)) continue;
    if (key === "properties" || key === "$defs") {
      const childObject = child as JsonObject;
      projected[key] = Object.fromEntries(
        Object.entries(childObject).map(([name, schema]) => [
          name,
          projectSchemaNode(schema),
        ]),
      );
      continue;
    }
    projected[key] = projectSchemaNode(child);
  }
  return projected;
}

// Gemini accepted the strict bundle but ignored the top-level conditional union,
// returning a summary-shaped draft against the unconstrained `properties.draft`.
// The provider-facing schema therefore states the draft contract directly; the
// strict local schema stays authoritative for the status/draft relationship.
function constrainDraftProperty(projection: JsonObject): JsonObject {
  const properties = projection.properties as JsonObject;
  return {
    ...projection,
    properties: {
      ...properties,
      draft: {
        ...(properties.draft as JsonObject),
        anyOf: [{ $ref: bundledDraftPointer }, { type: "null" }],
      },
    },
  };
}

const providerTimeShapeBranches: JsonObject[] = [
  {
    type: "object",
    properties: {
      kind: { enum: ["exact"] },
      start: { type: "string" },
      end: { type: "null" },
      daypart: { type: "null" },
      crosses_midnight: { enum: [false] },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["approximate"] },
      start: { type: "string" },
      end: { type: "null" },
      daypart: { type: "null" },
      crosses_midnight: { enum: [false] },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["range"] },
      start: { type: "string" },
      end: { type: "string" },
      daypart: { type: "null" },
      crosses_midnight: { type: "boolean" },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["daypart"] },
      start: { type: "null" },
      end: { type: "null" },
      daypart: {
        enum: ["morning", "afternoon", "evening", "night", "unknown"],
      },
      crosses_midnight: { enum: [false] },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["none"] },
      start: { type: "null" },
      end: { type: "null" },
      daypart: { type: "null" },
      crosses_midnight: { enum: [false] },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["open_ended"] },
      start: { type: "string" },
      end: { type: "null" },
      daypart: { type: "null" },
      crosses_midnight: { enum: [false] },
    },
  },
  {
    type: "object",
    properties: {
      kind: { enum: ["all_day"] },
      start: { type: "null" },
      end: { type: "null" },
      daypart: { type: "null" },
      crosses_midnight: { enum: [false] },
    },
  },
];

// The authoritative draft schema leaves cross-field semantics to deterministic
// validation so Review can represent temporarily incomplete edits precisely.
// Gemini's structured-output schema can prevent those incompatible combinations
// earlier without changing that local Review contract.
function constrainProviderTimeShapes(schema: JsonObject): JsonObject {
  const definitions = schema.$defs as JsonObject;
  const parsedTripDraft = definitions.parsedTripDraft as JsonObject;
  const draftDefinitions = parsedTripDraft.$defs as JsonObject;
  const time = draftDefinitions.time as JsonObject;

  return {
    ...schema,
    $defs: {
      ...definitions,
      parsedTripDraft: {
        ...parsedTripDraft,
        $defs: {
          ...draftDefinitions,
          time: {
            ...time,
            anyOf: providerTimeShapeBranches,
          },
        },
      },
    },
  };
}

export function createGeminiSchemaProjection() {
  return constrainProviderTimeShapes(
    constrainDraftProperty(
      projectSchemaNode(bundleInterpretationSchema()) as JsonObject,
    ),
  );
}
