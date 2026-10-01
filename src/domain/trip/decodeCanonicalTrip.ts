import {
  validateCanonicalTripSchema,
  validateCanonicalTripV1Schema,
  validateCanonicalTripV2Schema,
} from "./schemaValidators";
import type {
  CanonicalTrip,
  LegacyCanonicalTripV1,
  LegacyCanonicalTripV2,
} from "./types";

export type CanonicalTripDecodeResult =
  | {
      valid: true;
      trip: CanonicalTrip;
      migratedFrom: "canonical-trip.v1" | "canonical-trip.v2" | null;
    }
  | { valid: false };

function migrateV2(legacy: LegacyCanonicalTripV2): CanonicalTrip {
  return {
    ...structuredClone(legacy),
    schema_version: "canonical-trip.v3",
    supporting_items: legacy.supporting_items.map((item) => ({
      ...structuredClone(item),
      group: null,
    })),
  };
}

export function decodeCanonicalTrip(value: unknown): CanonicalTripDecodeResult {
  if (validateCanonicalTripSchema(value).valid) {
    return {
      valid: true,
      trip: structuredClone(value as CanonicalTrip),
      migratedFrom: null,
    };
  }
  if (validateCanonicalTripV2Schema(value).valid) {
    const migrated = migrateV2(value as LegacyCanonicalTripV2);
    return validateCanonicalTripSchema(migrated).valid
      ? { valid: true, trip: migrated, migratedFrom: "canonical-trip.v2" }
      : { valid: false };
  }
  if (!validateCanonicalTripV1Schema(value).valid) return { valid: false };

  const legacy = value as LegacyCanonicalTripV1;
  const migratedV2: LegacyCanonicalTripV2 = {
    ...structuredClone(legacy),
    schema_version: "canonical-trip.v2",
    entities: legacy.entities.map((entity) => ({
      ...structuredClone(entity),
      provenance: {
        origin:
          entity.provenance.origin === "user" ? "user" : "legacy_unavailable",
        overridden_fields: structuredClone(entity.provenance.overridden_fields),
        source_id: null,
        locator_refs: [],
      },
    })),
  };
  const migrated = migrateV2(migratedV2);
  return validateCanonicalTripSchema(migrated).valid
    ? { valid: true, trip: migrated, migratedFrom: "canonical-trip.v1" }
    : { valid: false };
}
