import { projectedLeaves } from "../fixtures/semantics/projectedLeaves";
import { describe, expect, it } from "vitest";
import { validateCanonicalTripAuthoritatively } from "../../src/domain/trip/buildCanonicalTrip";
import { createTripPresentation } from "../../src/features/result/createTripPresentation";
import { relationshipStateCanonicalTrip } from "../fixtures/semantics/relationshipStateSemantics";

describe("relationship and state semantic fixtures", () => {
  const presentation = createTripPresentation(relationshipStateCanonicalTrip);
  const projectedDay = presentation.days[0];

  it("is a valid CanonicalTrip fixture", () => {
    expect(
      validateCanonicalTripAuthoritatively(relationshipStateCanonicalTrip)
        .valid,
    ).toBe(true);
  });

  it("keeps optional-heavy and free-time-heavy content out of task semantics", () => {
    expect(projectedLeaves(projectedDay.optional)).toHaveLength(4);
    expect(
      projectedLeaves(projectedDay.optional).every(
        (entity) => entity.role === "optional",
      ),
    ).toBe(true);

    const freeTime = projectedLeaves(projectedDay.items).filter(
      (entity) => entity.semanticType === "free_time",
    );
    expect(freeTime).toHaveLength(2);
    expect(freeTime.every((entity) => entity.role === "flexible_space")).toBe(
      true,
    );
    expect(freeTime[1].modifiers).toEqual(["tentative", "flexible"]);
  });

  it("preserves alternatives, conditions, fallbacks, and parent-child structure", () => {
    const groups = [...projectedDay.optional, ...projectedDay.items].filter(
      (item) => item.role === "relationship_group",
    );
    expect(groups.map((item) => item.relationship.type)).toEqual([
      "fallback",
      "conditional",
      "parent_child",
    ]);
    expect(groups[0].items[0]).toMatchObject({
      role: "relationship_group",
      relationship: { type: "alternative" },
    });
    expect(groups[1].relationship.condition).toBe("下雨時");
    expect(
      projectedLeaves(groups[2].items).map((entity) => entity.title),
    ).toEqual(["Free morning", "Free evening"]);
  });

  it("keeps readiness separate and unresolved places actionless", () => {
    const readiness = projectedLeaves(projectedDay.items).find(
      (entity) => entity.title === "Document check",
    );
    const unresolved = projectedLeaves(projectedDay.items).find(
      (entity) => entity.title === "Unresolved dinner place",
    );

    expect(readiness!.dependencies).toEqual([
      {
        type: "readiness",
        kind: "document",
        status: "action_needed",
        detail: "護照影本",
        todo_id: "todo:passport-copy",
      },
    ]);
    expect(unresolved).toMatchObject({
      actions: [],
      unresolved: { entity: true, place: true, any: true },
    });
  });
});
