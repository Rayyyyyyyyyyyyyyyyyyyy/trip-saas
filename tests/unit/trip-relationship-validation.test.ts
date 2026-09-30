import { describe, expect, it } from "vitest";
import { validateTripRelationships } from "../../src/domain/trip/validateTripRelationships";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

describe("relationship and dependency validation", () => {
  it("accepts a sequence with known members", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities.push({
      ...structuredClone(draft.entities[0]),
      id: "entity:second",
    });
    draft.relationships.push({
      id: "relationship:sequence",
      type: "sequence",
      member_entity_ids: ["entity:arrival", "entity:second"],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
      source_refs: ["source-block:001"],
    });

    const result = validateTripRelationships(draft);
    expect(result.valid).toBe(true);
    expect(result.findings.map((item) => item.code)).toContain(
      "DUPLICATE_ENTITY_CANDIDATE",
    );
  });

  it("reports unknown and incomplete relationship references", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.relationships.push({
      id: "relationship:alternative",
      type: "alternative",
      member_entity_ids: ["entity:missing"],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
      source_refs: ["source-block:001"],
    });

    const codes = validateTripRelationships(draft).findings.map(
      (item) => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_ENTITY_REFERENCE",
        "RELATIONSHIP_MEMBERS_MISSING",
      ]),
    );
  });

  it("reports incomplete parent-child and conditional relationships", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.relationships.push(
      {
        id: "relationship:parent",
        type: "parent_child",
        member_entity_ids: [],
        parent_entity_id: "entity:arrival",
        child_entity_ids: [],
        condition: null,
        source_refs: ["source-block:001"],
      },
      {
        id: "relationship:conditional",
        type: "conditional",
        member_entity_ids: ["entity:arrival"],
        parent_entity_id: null,
        child_entity_ids: [],
        condition: null,
        source_refs: ["source-block:001"],
      },
    );

    const codes = validateTripRelationships(draft).findings.map(
      (item) => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "PARENT_CHILD_INCOMPLETE",
        "CONDITIONAL_RELATIONSHIP_INCOMPLETE",
      ]),
    );
  });

  it("reports conflicting readiness identities", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].reservation = {
      status: "confirmed",
      reference: null,
      detail: null,
      todo_id: "reservation:one",
    };
    draft.entities[0].readiness = {
      kind: "reservation",
      status: "ready",
      detail: null,
      todo_id: "reservation:two",
    };

    expect(
      validateTripRelationships(draft).findings.map((item) => item.code),
    ).toContain("DEPENDENCY_ID_CONFLICT");
  });
});
