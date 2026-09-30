/**
 * Single authoritative CanonicalTrip v2 schema composition. The generator
 * passes the immutable v1 schema in so v1 remains a separate read contract.
 */
export function createCanonicalTripV2Schema(canonicalTripV1) {
  return {
    ...canonicalTripV1,
    $id: "https://trip-runtime.local/schemas/canonical-trip.v2.schema.json",
    title: "CanonicalTrip v2",
    properties: {
      ...canonicalTripV1.properties,
      schema_version: { const: "canonical-trip.v2" },
    },
    $defs: {
      ...canonicalTripV1.$defs,
      provenance: {
        type: "object",
        additionalProperties: false,
        required: ["origin", "overridden_fields", "source_id", "locator_refs"],
        properties: {
          origin: { enum: ["source", "user", "legacy_unavailable"] },
          overridden_fields: {
            type: "array",
            uniqueItems: true,
            maxItems: 64,
            items: { $ref: "#/$defs/stableId" },
          },
          source_id: {
            anyOf: [{ $ref: "#/$defs/stableId" }, { type: "null" }],
          },
          locator_refs: {
            type: "array",
            uniqueItems: true,
            maxItems: 128,
            items: { $ref: "#/$defs/stableId" },
          },
        },
        allOf: [
          {
            if: { properties: { origin: { const: "source" } } },
            then: {
              properties: {
                source_id: { $ref: "#/$defs/stableId" },
                locator_refs: { type: "array", minItems: 1 },
              },
            },
            else: {
              properties: {
                source_id: { type: "null" },
                locator_refs: { type: "array", maxItems: 0 },
              },
            },
          },
        ],
      },
    },
  };
}
