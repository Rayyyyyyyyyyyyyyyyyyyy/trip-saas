import { describe, expect, it } from "vitest";
import { validateCanonicalTripAuthoritatively } from "../../src/domain/trip/buildCanonicalTrip";
import { createTripPresentation } from "../../src/features/result/createTripPresentation";
import { validCanonicalTrip } from "../fixtures/contracts/validContracts";
import { projectedLeaves } from "../fixtures/semantics/projectedLeaves";
import type { TripRelationship } from "../../src/domain/trip/types";

function fixture() {
  const trip = structuredClone(validCanonicalTrip);
  trip.entities = ["A", "B", "C", "D"].map((title) => ({
    ...structuredClone(trip.entities[0]),
    id: `entity:${title}`,
    title,
  }));
  return trip;
}
function group(
  type: TripRelationship["type"],
  members: string[],
  id: string = type,
): TripRelationship {
  return {
    id: `relationship:${id}`,
    type,
    member_entity_ids: members.map((name) => `entity:${name}`),
    parent_entity_id: null,
    child_entity_ids: [],
    condition: type === "conditional" ? "下雨時" : null,
  };
}

describe("authoritative unique Result placement", () => {
  it.each(["alternative", "conditional", "fallback", "parent_child"] as const)(
    "places %s members once and preserves full projected semantics",
    (type) => {
      const trip = fixture();
      const relationship = group(type, ["A", "B"]);
      if (type === "parent_child")
        Object.assign(relationship, {
          member_entity_ids: [],
          parent_entity_id: "entity:A",
          child_entity_ids: ["entity:B"],
        });
      trip.relationships = [relationship];
      const day = createTripPresentation(trip).days[0];
      expect(day.items[0]).toMatchObject({
        role: "relationship_group",
        relationship: { type },
      });
      expect(projectedLeaves(day.items).map((entity) => entity.id)).toEqual(
        trip.entities.map((entity) => entity.id),
      );
      expect(day.items).toHaveLength(3);
    },
  );

  it("nests parent-child under an alternative referencing its parent", () => {
    const trip = fixture();
    trip.entities = [
      trip.entities[1],
      trip.entities[0],
      ...trip.entities.slice(2),
    ];
    trip.relationships = [
      group("alternative", ["A", "C"]),
      {
        ...group("parent_child", []),
        parent_entity_id: "entity:A",
        child_entity_ids: ["entity:B"],
      },
    ];
    expect(validateCanonicalTripAuthoritatively(trip).valid).toBe(true);
    const day = createTripPresentation(trip).days[0];
    expect(day.items[0]).toMatchObject({
      role: "relationship_group",
      items: [
        {
          role: "relationship_group",
          items: [{ id: "entity:A" }, { id: "entity:B" }],
        },
        { id: "entity:C" },
      ],
    });
    expect(projectedLeaves(day.items)).toHaveLength(4);
  });

  it("blocks crossing or identical primary ownership before confirmation", () => {
    for (const members of [
      ["B", "C"],
      ["A", "B"],
    ]) {
      const trip = fixture();
      trip.relationships = [
        group("alternative", ["A", "B"]),
        group("alternative", members, "other"),
      ];
      const validation = validateCanonicalTripAuthoritatively(trip);
      expect(validation.valid).toBe(false);
      expect(validation.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "RELATIONSHIP_PLACEMENT_CONFLICT",
            blocking: true,
          }),
        ]),
      );
      expect(() => createTripPresentation(trip)).toThrow(/placement/);
    }
  });

  it("orders nested leaves and primary groups by sequence without a second group", () => {
    const trip = fixture();
    trip.relationships = [
      group("alternative", ["A", "B"]),
      group("sequence", ["D", "B", "A", "C"]),
    ];
    const day = createTripPresentation(trip).days[0];
    expect(projectedLeaves(day.items).map((entity) => entity.title)).toEqual([
      "D",
      "B",
      "A",
      "C",
    ]);
    expect(day.items).toHaveLength(3);
  });

  it("blocks contradictory ordering and sequence interleaving across a group", () => {
    const trip = fixture();
    trip.relationships = [
      group("alternative", ["A", "B"]),
      group("sequence", ["A", "C", "B"]),
    ];
    expect(validateCanonicalTripAuthoritatively(trip).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "RELATIONSHIP_SEQUENCE_CONFLICT",
          blocking: true,
        }),
      ]),
    );
  });

  it("separates optional members while retaining relationship context and one leaf each", () => {
    const trip = fixture();
    trip.entities[1].state.optional = true;
    trip.relationships = [group("alternative", ["A", "B"])];
    const day = createTripPresentation(trip).days[0];
    expect(projectedLeaves(day.items).map((entity) => entity.title)).toEqual([
      "A",
      "C",
      "D",
    ]);
    expect(projectedLeaves(day.optional).map((entity) => entity.title)).toEqual(
      ["B"],
    );
    expect(day.optional[0]).toMatchObject({
      role: "relationship_group",
      relationship: { type: "alternative" },
    });
  });

  it("preserves cross-day group context without importing another day's entity", () => {
    const trip = fixture();
    trip.days.push({ ...trip.days[0], id: "day:second", source_order: 1 });
    trip.entities[1].day_id = "day:second";
    trip.relationships = [
      group("alternative", ["A", "B"]),
      group("conditional", ["A"]),
    ];
    const days = createTripPresentation(trip).days;
    expect(
      projectedLeaves(days[0].items).map((entity) => entity.title),
    ).toEqual(["A", "C", "D"]);
    expect(
      projectedLeaves(days[1].items).map((entity) => entity.title),
    ).toEqual(["B"]);
  });

  it("places a null-Day entity once with its complete supported semantics", () => {
    const trip = fixture();
    const undated = trip.entities[0];
    undated.day_id = null;
    undated.title = "Undated medical visit";
    undated.place = {
      name: null,
      address: "SOURCE_ADDRESS_MARKER",
      url: null,
      unresolved: true,
    };
    undated.notes = ["SOURCE_NOTE_MARKER"];
    undated.actions = [
      {
        id: "action:undated-map",
        kind: "map",
        label: "查看地址",
        url: "https://maps.example.test/undated",
      },
    ];

    const presentation = createTripPresentation(trip);
    const leaves = projectedLeaves(presentation.undated.items);

    expect(leaves).toHaveLength(1);
    expect(leaves[0]).toMatchObject({
      id: undated.id,
      title: "Undated medical visit",
      place: { address: "SOURCE_ADDRESS_MARKER" },
      notes: ["SOURCE_NOTE_MARKER"],
      actions: [{ url: "https://maps.example.test/undated" }],
    });
    const allPrimaryIds = [
      ...presentation.days.flatMap((day) => [
        ...projectedLeaves(day.items).map((entity) => entity.id),
        ...projectedLeaves(day.optional).map((entity) => entity.id),
      ]),
      ...leaves.map((entity) => entity.id),
    ];
    expect(allPrimaryIds.filter((id) => id === undated.id)).toHaveLength(1);
  });

  it("preserves relationship identity and cross-region member references", () => {
    const trip = fixture();
    trip.entities[1].day_id = null;
    trip.relationships = [group("alternative", ["A", "B"])];

    const presentation = createTripPresentation(trip);
    const datedGroup = presentation.days[0].items[0];
    const undatedGroup = presentation.undated.items[0];

    expect(datedGroup).toMatchObject({
      role: "relationship_group",
      id: "relationship:alternative",
      relationship: {
        memberReferences: [expect.objectContaining({ id: "entity:B" })],
      },
    });
    expect(undatedGroup).toMatchObject({
      role: "relationship_group",
      id: "relationship:alternative",
      relationship: {
        memberReferences: [expect.objectContaining({ id: "entity:A" })],
      },
    });
    expect(projectedLeaves(presentation.days[0].items)).toHaveLength(3);
    expect(projectedLeaves(presentation.undated.items)).toHaveLength(1);
  });

  it("preserves sequence identity and references across dated and undated regions", () => {
    const trip = fixture();
    trip.entities[1].day_id = null;
    trip.relationships = [group("sequence", ["A", "B", "C"])];

    const presentation = createTripPresentation(trip);

    expect(presentation.days[0].sequenceContexts).toEqual([
      expect.objectContaining({
        id: "relationship:sequence",
        type: "sequence",
        memberReferences: [
          expect.objectContaining({ id: "entity:A" }),
          expect.objectContaining({ id: "entity:B" }),
          expect.objectContaining({ id: "entity:C" }),
        ],
      }),
    ]);
    expect(presentation.undated.sequenceContexts).toEqual([
      expect.objectContaining({ id: "relationship:sequence" }),
    ]);
    expect(projectedLeaves(presentation.days[0].items)).toHaveLength(3);
    expect(projectedLeaves(presentation.undated.items)).toHaveLength(1);
  });

  it("keeps a fixed booked transit prominent while ordinary transit stays connective", () => {
    const trip = fixture();
    trip.entities[0].semantic_type = "transit";
    trip.entities[1].semantic_type = "transit";
    trip.entities[0].time = {
      kind: "exact",
      start: "10:00",
      end: null,
      daypart: null,
      raw_text: "10:00",
      crosses_midnight: false,
    };
    trip.entities[0].ticket = {
      status: "ready",
      detail: "Reserved seat",
      reference: "R-1",
      todo_id: null,
    };
    const day = createTripPresentation(trip).days[0];
    expect(day.items[0]).toMatchObject({
      role: "entity",
      entity: {
        role: "fixed_anchor",
        dependencies: [{ type: "ticket", detail: "Reserved seat" }],
      },
    });
    expect(day.items[1]).toMatchObject({ role: "transit_connector" });
    expect(day.fixedAnchors[0]).not.toHaveProperty("dependencies");
  });
});
