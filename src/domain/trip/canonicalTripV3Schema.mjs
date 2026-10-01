/**
 * CanonicalTrip v3 adds only the required nullable SupportingItem group. The
 * v2 schema remains registered independently as a read-only migration input.
 */
export function createCanonicalTripV3Schema(canonicalTripV2) {
  return {
    ...canonicalTripV2,
    $id: "https://trip-runtime.local/schemas/canonical-trip.v3.schema.json",
    title: "CanonicalTrip v3",
    properties: {
      ...canonicalTripV2.properties,
      schema_version: { const: "canonical-trip.v3" },
    },
    $defs: {
      ...canonicalTripV2.$defs,
      supportingGroup: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "order"],
        properties: {
          id: {
            type: "string",
            minLength: 1,
            maxLength: 256,
            pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
          },
          label: {
            type: "string",
            minLength: 1,
            maxLength: 256,
            pattern: "\\S",
          },
          order: { type: "integer", minimum: 0 },
        },
      },
      supportingItem: {
        ...canonicalTripV2.$defs.supportingItem,
        required: [...canonicalTripV2.$defs.supportingItem.required, "group"],
        properties: {
          ...canonicalTripV2.$defs.supportingItem.properties,
          group: {
            oneOf: [{ $ref: "#/$defs/supportingGroup" }, { type: "null" }],
          },
        },
      },
    },
  };
}
