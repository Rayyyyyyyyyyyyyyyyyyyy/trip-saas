import { describe, expect, it } from "vitest";
import type { InterpretationChunkPlan } from "../../src/domain/source/planSourceChunks";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { reconcileInterpretationChunks } from "../../src/domain/trip/reconcileInterpretationChunks";
import { evaluateReviewableDraft } from "../../src/domain/trip/evaluateTripGates";
import { sourceExpectationFor } from "../../src/domain/source/sourceCoverage";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function fixture() {
  const document: UnifiedSourceDocument = {
    schema_version: "unified-source-document.v1",
    source_id: "source:regional-fixture",
    display_name: "Trip.xlsx",
    input_mode: "spreadsheet_file",
    source_format: "tabular",
    extraction_findings: [],
    evidence_units: ["8/16", "Park", "Program", "Map instructions"].map(
      (value, index) => ({
        id: "cell:" + index,
        source_order: index,
        parent_ref: null,
        locator: "sheet:Trip!A" + (index + 1),
        raw_value: value,
        display_value: value,
        links:
          index === 3
            ? [
                {
                  kind: "link",
                  label: "Directions",
                  target: "https://example.com/map",
                },
              ]
            : [],
        structural_evidence: [
          {
            evidence_kind: "tabular_region",
            sheet_id: "sheet:trip",
            sheet_name: "Trip",
            sheet_order: 0,
            row_start: index + 1,
            row_end: index + 1,
            column_start: 1,
            column_end: 1,
            merge_ref: null,
            header_ref: null,
          },
        ],
      }),
    ),
  };
  const gate = validateUnifiedSourceDocument(document, {
    source_id: document.source_id,
  });
  if (!gate.valid) throw new Error(JSON.stringify(gate.failures));
  const source = gate.document;
  const plans: InterpretationChunkPlan[] = [
    {
      source: {
        ...document,
        evidence_units: document.evidence_units.slice(0, 2),
      },
      ownedIds: ["cell:0", "cell:1"],
      contextIds: [],
    },
    {
      source: structuredClone(document),
      ownedIds: ["cell:2", "cell:3"],
      contextIds: ["cell:0", "cell:1"],
    },
  ];
  const responses = plans.map((plan, index) => {
    const result = structuredClone(validDraftInterpretationResult);
    result.source_id = document.source_id;
    result.findings = [];
    result.coverage = {
      total_blocks: plan.source.evidence_units.length,
      block_dispositions: plan.source.evidence_units.map((unit) => ({
        source_ref: unit.id,
        disposition: "interpreted" as const,
      })),
      unparsed_items: [],
    };
    const draft = result.draft!;
    draft.trip = {
      ...draft.trip,
      title: "Trip",
      start_date: null,
      end_date: null,
      source_refs: plan.source.evidence_units.map((unit) => unit.id),
    };
    draft.days[0] = {
      ...draft.days[0],
      date: null,
      label: index ? "8/16 continuation" : "8/16",
      title: index ? "Program" : "Park",
      source_refs: ["cell:0"],
    };
    const parent = draft.entities[0];
    parent.id = "parent";
    parent.title = "Park";
    parent.raw_label = "Park";
    parent.source_refs = ["cell:1"];
    if (index) {
      const child = structuredClone(parent);
      child.id = "child";
      child.title = "Program";
      child.raw_label = "Program";
      child.source_refs = ["cell:2"];
      draft.entities.push(child);
      draft.relationships.push({
        id: "relation",
        type: "parent_child",
        member_entity_ids: [],
        parent_entity_id: parent.id,
        child_entity_ids: [child.id],
        condition: null,
        source_refs: ["cell:1", "cell:2"],
      });
      draft.supporting_items.push(
        {
          id: "context-note",
          kind: "note",
          text: "Park",
          url: null,
          unresolved: false,
          source_refs: ["cell:1"],
        },
        {
          id: "owned-note",
          kind: "instruction",
          text: "Map instructions",
          url: null,
          unresolved: false,
          source_refs: ["cell:3"],
        },
      );
    }
    return result;
  });
  return { source, plans, responses };
}

describe("regional interpretation reconciliation", () => {
  it("covers each owned cell once while merging source-anchored partial Days and rebinding a parent stub", () => {
    const { source, plans, responses } = fixture();
    const before = structuredClone(responses);
    const merged = reconcileInterpretationChunks(responses, source, plans);
    expect(merged.valid).toBe(true);
    if (!merged.valid) return;
    expect(responses).toEqual(before);
    expect(merged.result.coverage.total_blocks).toBe(4);
    expect(
      merged.result.coverage.block_dispositions.map((item) => item.source_ref),
    ).toEqual(source.evidence_units.map((item) => item.id));
    const draft = merged.result.draft!;
    expect(draft.days).toHaveLength(1);
    expect(draft.days[0]).toMatchObject({
      date: null,
      label: "8/16 / 8/16 continuation",
      title: "Park / Program",
    });
    expect(draft.entities).toHaveLength(2);
    const parent = draft.entities.find((entity) => entity.title === "Park")!;
    const child = draft.entities.find((entity) => entity.title === "Program")!;
    expect(child.day_id).toBe(parent.day_id);
    expect(draft.relationships[0]).toMatchObject({
      parent_entity_id: parent.id,
      child_entity_ids: [child.id],
    });
    expect(draft.supporting_items.map((item) => item.text)).toEqual([
      "Map instructions",
    ]);
    expect(
      merged.result.findings.filter(
        (finding) => finding.code === "CHUNK_SEAM_REVIEW",
      ),
    ).toEqual([
      expect.objectContaining({
        blocking: true,
        source_refs: ["cell:1", "cell:2"],
      }),
    ]);
    expect(
      evaluateReviewableDraft(merged.result, sourceExpectationFor(source)),
    ).toMatchObject({ pass: true });
  });

  it("maps findings about the relationship stub to its global owner", () => {
    const { source, plans, responses } = fixture();
    responses[1].findings.push({
      id: "parent-finding",
      code: "CHECK_PARENT",
      message: "Check parent",
      blocking: true,
      source_refs: ["cell:1"],
      entity_refs: ["parent"],
    });
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    const parent = merged.result.draft!.entities.find(
      (entity) => entity.title === "Park",
    )!;
    expect(
      merged.result.findings.find((finding) => finding.code === "CHECK_PARENT")!
        .entity_refs,
    ).toEqual([parent.id]);
  });

  it("does not merge unknown-date Days through a generic shared header", () => {
    const { source, plans, responses } = fixture();
    source.evidence_units[0].display_value = "Itinerary";
    source.evidence_units[0].raw_value = "Itinerary";
    for (const plan of plans) {
      plan.source.evidence_units[0].display_value = "Itinerary";
      plan.source.evidence_units[0].raw_value = "Itinerary";
    }
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    expect(merged.result.draft!.days).toHaveLength(2);
  });

  it.each(["title", "time", "reservation", "unreferenced"] as const)(
    "rejects a %s context stub conflict",
    (field) => {
      const { source, plans, responses } = fixture();
      const stub = responses[1].draft!.entities[0];
      if (field === "title") stub.title = "Different park";
      if (field === "time")
        stub.time = {
          kind: "exact",
          start: "13:00",
          end: null,
          daypart: null,
          raw_text: "13:00",
          crosses_midnight: false,
        };
      if (field === "reservation")
        stub.reservation = {
          status: "confirmed",
          reference: "123",
          detail: null,
          todo_id: null,
        };
      if (field === "unreferenced") responses[1].draft!.relationships = [];
      expect(
        reconcileInterpretationChunks(responses, source, plans),
      ).toMatchObject({
        valid: false,
        findings: [
          expect.objectContaining({ code: "CHUNK_CONTEXT_ENTITY_CONFLICT" }),
        ],
      });
    },
  );

  it("ignores request-local action and todo IDs but retains their meaning", () => {
    const { source, plans, responses } = fixture();
    for (const [index, response] of responses.entries()) {
      const entity = response.draft!.entities[0];
      entity.actions = [
        {
          id: "action:" + index,
          kind: "reference",
          label: "Park website",
          url: "https://example.com/park",
        },
      ];
      entity.reservation = {
        status: "pending",
        reference: null,
        detail: "Book",
        todo_id: "todo:" + index,
      };
    }
    responses[1].findings.push({
      id: "action-note",
      code: "CHECK_ACTION",
      message: "Check action",
      blocking: true,
      source_refs: ["cell:1"],
      refs: ["parent", "action:1", "todo:1"],
    });
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    const parent = merged.result.draft!.entities.find(
      (entity) => entity.title === "Park",
    )!;
    expect(
      merged.result.findings.find((finding) => finding.code === "CHECK_ACTION")!
        .refs,
    ).toEqual([parent.id, parent.actions[0].id, parent.reservation!.todo_id]);
  });

  it("rejects a shared date anchor interpreted as conflicting full dates", () => {
    const { source, plans, responses } = fixture();
    responses[0].draft!.days[0].date = "2026-08-16";
    responses[1].draft!.days[0].date = "2027-08-16";
    expect(
      reconcileInterpretationChunks(responses, source, plans),
    ).toMatchObject({
      valid: false,
      findings: [expect.objectContaining({ code: "CHUNK_DAY_DATE_CONFLICT" })],
    });
  });

  it("rejects a context stub when more than one owned entity has that exact source identity and meaning", () => {
    const { source, plans, responses } = fixture();
    const duplicate = structuredClone(responses[0].draft!.entities[0]);
    duplicate.id = "duplicate-parent";
    responses[0].draft!.entities.push(duplicate);
    expect(
      reconcileInterpretationChunks(responses, source, plans),
    ).toMatchObject({
      valid: false,
      findings: [
        expect.objectContaining({ code: "CHUNK_CONTEXT_ENTITY_CONFLICT" }),
      ],
    });
  });

  it("requires the complete source-ref set instead of a shared subset for stub identity", () => {
    const { source, plans, responses } = fixture();
    responses[0].draft!.entities[0].source_refs = ["cell:0", "cell:1"];
    expect(
      reconcileInterpretationChunks(responses, source, plans),
    ).toMatchObject({
      valid: false,
      findings: [
        expect.objectContaining({ code: "CHUNK_CONTEXT_ENTITY_CONFLICT" }),
      ],
    });
  });

  it("retains all leave-by conflicts on one source-anchored unknown Day", () => {
    const { source, plans, responses } = fixture();
    responses[0].draft!.days[0].leave_by = "08:00";
    responses[1].draft!.days[0].leave_by = "09:00";
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    expect(merged.result.draft!.days[0].leave_by).toBeNull();
    expect(merged.result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CHUNK_DAY_LEAVE_BY_CONFLICT",
          blocking: true,
        }),
      ]),
    );
  });

  it("does not treat a clock-like dotted value as a specific date anchor", () => {
    const { source, plans, responses } = fixture();
    source.evidence_units[0].display_value = "12.30";
    source.evidence_units[0].raw_value = "12.30";
    for (const plan of plans) {
      plan.source.evidence_units[0].display_value = "12.30";
      plan.source.evidence_units[0].raw_value = "12.30";
    }
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    expect(merged.result.draft!.days).toHaveLength(2);
  });

  it.each(["02/30", "2026-02-29"])(
    "does not merge unknown Days through invalid calendar text %s",
    (text) => {
      const { source, plans, responses } = fixture();
      source.evidence_units[0].display_value = text;
      source.evidence_units[0].raw_value = text;
      for (const plan of plans) {
        plan.source.evidence_units[0].display_value = text;
        plan.source.evidence_units[0].raw_value = text;
      }
      const merged = reconcileInterpretationChunks(responses, source, plans);
      if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
      expect(merged.result.draft!.days).toHaveLength(2);
    },
  );

  it("projects a reference-only insufficient chunk without losing its text, links, unparsed details, or coverage", () => {
    const { source, plans, responses } = fixture();
    responses[1].status = "insufficient";
    responses[1].draft = null;
    responses[1].coverage.block_dispositions.forEach((item) => {
      item.disposition =
        item.source_ref === "cell:3" ? "unparsed" : "supporting";
    });
    responses[1].coverage.unparsed_items = [
      {
        source_ref: "cell:3",
        locator: "sheet:Trip!A4",
        reason_code: "reference_unknown",
        severity: "warning",
        message: "Check map instructions",
      },
    ];
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    expect(merged.result.status).toBe("draft");
    expect(merged.result.draft!.supporting_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Program", source_refs: ["cell:2"] }),
        expect.objectContaining({
          text: "Map instructions",
          source_refs: ["cell:3"],
        }),
        expect.objectContaining({
          text: "Directions",
          url: "https://example.com/map",
          source_refs: ["cell:3"],
        }),
      ]),
    );
    expect(merged.result.coverage.unparsed_items).toHaveLength(1);
    expect(
      evaluateReviewableDraft(merged.result, sourceExpectationFor(source)),
    ).toMatchObject({ pass: true });
  });

  it("retains whole-run insufficient when a failed chunk owns interpreted evidence", () => {
    const { source, plans, responses } = fixture();
    responses[1].status = "insufficient";
    responses[1].draft = null;
    const merged = reconcileInterpretationChunks(responses, source, plans);
    expect(merged).toMatchObject({
      valid: true,
      result: { status: "insufficient", draft: null },
    });
  });

  it("retains whole-run insufficient when every owned unit remains unparsed", () => {
    const { source, plans, responses } = fixture();
    responses[1].status = "insufficient";
    responses[1].draft = null;
    responses[1].coverage.block_dispositions.forEach((item) => {
      item.disposition = plans[1].ownedIds.includes(item.source_ref)
        ? "unparsed"
        : "supporting";
    });
    responses[1].coverage.unparsed_items = source.evidence_units
      .filter((unit) => plans[1].ownedIds.includes(unit.id))
      .map((unit) => ({
        source_ref: unit.id,
        locator: unit.locator,
        reason_code: "itinerary_unclear",
        severity: "warning" as const,
        message: "Itinerary semantics could not be established",
      }));
    const merged = reconcileInterpretationChunks(responses, source, plans);
    expect(merged).toMatchObject({
      valid: true,
      result: { status: "insufficient", draft: null },
    });
    if (!merged.valid) return;
    expect(merged.result.coverage.unparsed_items).toHaveLength(2);
    expect(merged.result.coverage.total_blocks).toBe(4);
  });

  it("retains a relative source link as text without inventing a canonical HTTPS URL", () => {
    const { source, plans, responses } = fixture();
    source.evidence_units[3].links[0].target = "./map.png";
    plans[1].source.evidence_units[3].links[0].target = "./map.png";
    responses[1].status = "insufficient";
    responses[1].draft = null;
    responses[1].coverage.block_dispositions.forEach((item) => {
      item.disposition = "supporting";
    });
    const merged = reconcileInterpretationChunks(responses, source, plans);
    if (!merged.valid) throw new Error(JSON.stringify(merged.findings));
    expect(merged.result.draft!.supporting_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "Directions ./map.png",
          url: null,
          source_refs: ["cell:3"],
        }),
      ]),
    );
    expect(
      evaluateReviewableDraft(merged.result, sourceExpectationFor(source)),
    ).toMatchObject({ pass: true });
  });

  it("keeps all-insufficient reference chunks insufficient", () => {
    const { source, plans, responses } = fixture();
    for (const result of responses) {
      result.status = "insufficient";
      result.draft = null;
      result.coverage.block_dispositions.forEach((item) => {
        item.disposition = "supporting";
      });
    }
    expect(
      reconcileInterpretationChunks(responses, source, plans),
    ).toMatchObject({ valid: true, result: { status: "insufficient" } });
  });

  it.each(["gap", "duplicate", "coverage", "foreign", "mutated"] as const)(
    "rejects %s scope corruption",
    (kind) => {
      const { source, plans, responses } = fixture();
      if (kind === "gap") {
        plans[1].ownedIds = ["cell:2"];
        plans[1].contextIds = ["cell:0", "cell:1", "cell:3"];
      }
      if (kind === "duplicate") {
        plans[1].ownedIds = ["cell:1", "cell:2", "cell:3"];
        plans[1].contextIds = ["cell:0"];
      }
      if (kind === "coverage") responses[1].coverage.block_dispositions.pop();
      if (kind === "foreign")
        responses[1].draft!.entities[1].source_refs = ["cell:foreign"];
      if (kind === "mutated")
        plans[1].source.evidence_units[0].display_value = "2026-08-16";
      expect(
        reconcileInterpretationChunks(responses, source, plans).valid,
      ).toBe(false);
    },
  );
});
