import { describe, expect, it, vi } from "vitest";

import { validateCanonicalTripAuthoritatively } from "../../src/domain/trip/buildCanonicalTrip";
import { decodeCanonicalTrip } from "../../src/domain/trip/decodeCanonicalTrip";
import { validateCanonicalTripSchema } from "../../src/domain/trip/schemaValidators";
import { importCanonicalTripFile } from "../../src/features/import/canonicalTripImport";
import type { ConfirmedTripRepository } from "../../src/persistence/confirmedTripRepository";
import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

function v2Fixture() {
  const v2 = structuredClone(validCanonicalTrip) as any;
  v2.schema_version = "canonical-trip.v2";
  v2.supporting_items = [
    {
      id: "support:legacy",
      kind: "note",
      text: "Legacy note",
      url: null,
      unresolved: false,
    },
  ];
  return v2;
}

describe("CanonicalTrip v3", () => {
  it("requires a nullable supporting group with strict id, label, and order", () => {
    const grouped = structuredClone(validCanonicalTrip);
    grouped.supporting_items = [
      {
        id: "support:food",
        kind: "note",
        text: "Pizza",
        url: null,
        unresolved: false,
        group: { id: "sheet:food", label: "美食清單", order: 2 },
      },
    ];
    expect(validateCanonicalTripSchema(grouped).valid).toBe(true);
    expect(decodeCanonicalTrip(grouped)).toMatchObject({
      valid: true,
      migratedFrom: null,
      trip: {
        supporting_items: [
          {
            group: { id: "sheet:food", label: "美食清單", order: 2 },
          },
        ],
      },
    });

    const missing = structuredClone(grouped) as any;
    delete missing.supporting_items[0].group;
    const invalidOrder = structuredClone(grouped);
    invalidOrder.supporting_items[0]!.group!.order = -1;

    expect(validateCanonicalTripSchema(missing).valid).toBe(false);
    expect(validateCanonicalTripSchema(invalidOrder).valid).toBe(false);
  });

  it("decodes v2 to v3 by adding only group null and does not mutate the input", () => {
    const v2 = v2Fixture();
    const before = structuredClone(v2);

    const decoded = decodeCanonicalTrip(v2);

    expect(decoded).toMatchObject({
      valid: true,
      migratedFrom: "canonical-trip.v2",
      trip: {
        schema_version: "canonical-trip.v3",
        supporting_items: [{ id: "support:legacy", group: null }],
      },
    });
    expect(v2).toEqual(before);
    if (decoded.valid) {
      const roundTrip = structuredClone(decoded.trip) as any;
      roundTrip.schema_version = "canonical-trip.v2";
      roundTrip.supporting_items = roundTrip.supporting_items.map(
        ({ group: _group, ...item }: any) => item,
      );
      expect(roundTrip).toEqual(before);
    }
  });

  it("rejects inconsistent label/order for one group id while preserving distinct ids with the same label", () => {
    const trip = structuredClone(validCanonicalTrip);
    trip.supporting_items = [
      {
        id: "support:first",
        kind: "note",
        text: "First",
        url: null,
        unresolved: false,
        group: { id: "sheet:first", label: "清單", order: 1 },
      },
      {
        id: "support:second",
        kind: "note",
        text: "Second",
        url: null,
        unresolved: false,
        group: { id: "sheet:second", label: "清單", order: 2 },
      },
    ];
    expect(validateCanonicalTripAuthoritatively(trip).valid).toBe(true);

    trip.supporting_items[1]!.group = {
      id: "sheet:first",
      label: "不同標籤",
      order: 9,
    };
    expect(
      validateCanonicalTripAuthoritatively(trip).findings.map(
        (finding) => finding.code,
      ),
    ).toContain("SUPPORTING_GROUP_INCONSISTENT");
  });

  it("leaves the prior record and active pointer untouched when v2 migration fails", async () => {
    const records = new Map([[validCanonicalTrip.id, validCanonicalTrip]]);
    let activePointer = validCanonicalTrip.id;
    const repository: ConfirmedTripRepository = {
      clear: vi.fn(async () => undefined),
      loadActive: vi.fn(async () => ({
        status: "ready" as const,
        trip: structuredClone(records.get(activePointer)!),
      })),
      replaceActive: vi.fn(async (trip) => {
        records.clear();
        records.set(trip.id, structuredClone(trip));
        activePointer = trip.id;
      }),
    };
    const invalidV2 = v2Fixture();
    invalidV2.supporting_items[0].unexpected = "not allowlisted";

    await expect(
      importCanonicalTripFile(
        {
          name: "invalid-v2.json",
          size: 100,
          type: "application/json",
          text: async () => JSON.stringify(invalidV2),
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "invalid_trip" });

    expect(repository.replaceActive).not.toHaveBeenCalled();
    expect(activePointer).toBe(validCanonicalTrip.id);
    expect([...records]).toEqual([[validCanonicalTrip.id, validCanonicalTrip]]);
  });
});
