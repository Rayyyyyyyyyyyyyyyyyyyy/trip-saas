import {
  validateCanonicalTripSchema,
  validateCanonicalTripV1Schema,
} from "./schemaValidators";
import type { CanonicalTrip, LegacyCanonicalTripV1 } from "./types";

export type CanonicalTripDecodeResult =
  | { valid: true; trip: CanonicalTrip; migratedFrom: "canonical-trip.v1" | null }
  | { valid: false };

export function decodeCanonicalTrip(value: unknown): CanonicalTripDecodeResult {
  if (validateCanonicalTripSchema(value).valid) {
    return {
      valid: true,
      trip: structuredClone(value as CanonicalTrip),
      migratedFrom: null,
    };
  }
  if (!validateCanonicalTripV1Schema(value).valid) return { valid: false };

  const legacy = value as LegacyCanonicalTripV1;
  const migrated: CanonicalTrip = {
    ...structuredClone(legacy),
    schema_version: "canonical-trip.v2",
    entities: legacy.entities.map((entity) => ({
      ...structuredClone(entity),
      provenance: {
        origin:
          entity.provenance.origin === "user" ? "user" : "legacy_unavailable",
        overridden_fields: structuredClone(
          entity.provenance.overridden_fields,
        ),
        source_id: null,
        locator_refs: [],
      },
    })),
  };
  return validateCanonicalTripSchema(migrated).valid
    ? { valid: true, trip: migrated, migratedFrom: "canonical-trip.v1" }
    : { valid: false };
}
