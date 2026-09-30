import { describe, expect, it, vi } from "vitest";

import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import {
  importCanonicalTripFile,
  MAX_CANONICAL_JSON_BYTES,
} from "../../src/features/import/canonicalTripImport";
import type { ConfirmedTripRepository } from "../../src/persistence/confirmedTripRepository";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const trip = buildCanonicalTrip(validParsedTripDraft);

function repository(): ConfirmedTripRepository {
  return {
    clear: vi.fn(async () => undefined),
    loadActive: vi.fn(async () => ({ status: "empty" as const })),
    replaceActive: vi.fn(async () => undefined),
  };
}

describe("CanonicalTrip JSON import", () => {
  it("validates and transactionally activates an allowlisted CanonicalTrip", async () => {
    const target = repository();
    const result = await importCanonicalTripFile(
      {
        name: "trip.json",
        size: 100,
        type: "application/json",
        text: async () => JSON.stringify(trip),
      },
      target,
    );

    expect(result).toEqual(trip);
    expect(target.replaceActive).toHaveBeenCalledWith(trip);
  });

  it("migrates supported v1 provenance without changing trip or checklist identities", async () => {
    const target = repository();
    const legacy = structuredClone(trip) as any;
    legacy.schema_version = "canonical-trip.v1";
    legacy.entities = legacy.entities.map((entity: any, index: number) => ({
      ...entity,
      reservation:
        index === 0
          ? {
              status: "confirmed",
              reference: null,
              detail: null,
              todo_id: "todo:legacy-reservation",
            }
          : entity.reservation,
      provenance: {
        origin: index === 0 ? "source" : "user",
        overridden_fields: entity.provenance.overridden_fields,
      },
    }));

    const migrated = await importCanonicalTripFile(
      {
        name: "legacy-trip.json",
        size: 100,
        type: "application/json",
        text: async () => JSON.stringify(legacy),
      },
      target,
    );

    expect(migrated.schema_version).toBe("canonical-trip.v2");
    expect(migrated.id).toBe(legacy.id);
    expect(migrated.entities[0]).toMatchObject({
      id: legacy.entities[0].id,
      reservation: { todo_id: "todo:legacy-reservation" },
      provenance: {
        origin: "legacy_unavailable",
        source_id: null,
        locator_refs: [],
      },
    });
    expect(target.replaceActive).toHaveBeenCalledWith(migrated);
  });

  it("rejects unknown members, invalid JSON, and oversized input without replacement", async () => {
    const target = repository();

    await expect(
      importCanonicalTripFile(
        {
          name: "trip.json",
          size: 100,
          type: "application/json",
          text: async () =>
            JSON.stringify({ ...trip, provider_metadata: { model: "x" } }),
        },
        target,
      ),
    ).rejects.toMatchObject({ code: "invalid_trip" });

    await expect(
      importCanonicalTripFile(
        {
          name: "trip.json",
          size: 10,
          type: "application/json",
          text: async () => "not json",
        },
        target,
      ),
    ).rejects.toMatchObject({ code: "invalid_json" });

    await expect(
      importCanonicalTripFile(
        {
          name: "trip.json",
          size: MAX_CANONICAL_JSON_BYTES + 1,
          type: "application/json",
          text: async () => JSON.stringify(trip),
        },
        target,
      ),
    ).rejects.toMatchObject({ code: "too_large" });

    expect(target.replaceActive).not.toHaveBeenCalled();
  });

  it("rejects impossible/reversed dates and malformed known time shapes", async () => {
    const target = repository();
    const invalid = structuredClone(trip);
    invalid.start_date = "2026-02-31";
    invalid.end_date = "2026-02-01";
    invalid.entities[0].time = {
      kind: "exact",
      start: null,
      end: null,
      daypart: null,
      raw_text: null,
      crosses_midnight: false,
    };

    await expect(
      importCanonicalTripFile(
        {
          name: "invalid-trip.json",
          size: 100,
          type: "application/json",
          text: async () => JSON.stringify(invalid),
        },
        target,
      ),
    ).rejects.toMatchObject({ code: "invalid_trip" });
    expect(target.replaceActive).not.toHaveBeenCalled();
  });

  it("rejects an empty trip and content-bearing provenance fields", async () => {
    const target = repository();
    const empty = {
      ...structuredClone(trip),
      days: [],
      entities: [],
      relationships: [],
      supporting_items: [],
    };
    const contentBearingProvenance = structuredClone(trip);
    contentBearingProvenance.entities[0].provenance.overridden_fields = [
      "source filename.md",
    ];

    for (const invalid of [empty, contentBearingProvenance]) {
      await expect(
        importCanonicalTripFile(
          {
            name: "invalid-trip.json",
            size: 100,
            type: "application/json",
            text: async () => JSON.stringify(invalid),
          },
          target,
        ),
      ).rejects.toMatchObject({ code: "invalid_trip" });
    }
    expect(target.replaceActive).not.toHaveBeenCalled();
  });
});
