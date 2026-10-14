import type { ValidatedUnifiedSourceDocument } from "../source/types";
import type { InterpretationChunkPlan } from "../source/planSourceChunks";
import {
  specificDateAnchor,
  regionChunkBoundaryRefs,
} from "../source/regionChunkIdentity";
import { assessTabularDateSupport } from "../source/assessTabularDateSupport";
import { validateInterpretationFidelity } from "../source/validateInterpretationFidelity";
import type {
  DraftDay,
  DraftEntity,
  ParsedTripDraft,
  SemanticInterpretationResult,
  TripFinding,
} from "./types";

const unique = <T>(values: T[]): T[] => [...new Set(values)];
const refIdentity = (refs: readonly string[]) =>
  JSON.stringify([...new Set(refs)].sort());
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  return value;
}

/** IDs are request-local; every other entity field still has to agree. */
function entityMeaning(entity: DraftEntity) {
  const { id: _id, day_id: _day, ...meaning } = structuredClone(entity);
  meaning.source_refs.sort();
  meaning.actions = meaning.actions.map((action) => ({ ...action, id: "" }));
  for (const dependency of [
    meaning.reservation,
    meaning.ticket,
    meaning.readiness,
  ])
    if (dependency) dependency.todo_id = null;
  return JSON.stringify(stableValue(meaning));
}

const findingIdentity = (finding: TripFinding) =>
  JSON.stringify({
    id: finding.id,
    severity: finding.severity,
    code: finding.code,
    message: finding.message,
    blocking: finding.blocking,
    refs: finding.refs,
    entity_refs: finding.entity_refs,
    source_refs: finding.source_refs,
  });

function sourceNamespace(sourceId: string) {
  // Real spreadsheet identities already contain the complete SHA-256 digest.
  // Keep it, so unrelated workbooks cannot share persisted trip/todo IDs.
  const digest = /^source:tabular:([a-f0-9]{64})$/u.exec(sourceId)?.[1];
  if (digest) return digest;
  // Contract fixtures and legacy source IDs are opaque and may fill all 128
  // characters. A deterministic bounded namespace keeps those IDs compatible.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < sourceId.length; index += 1) {
    const code = sourceId.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return [first, second]
    .map((value) => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function namespaceChunk(
  result: SemanticInterpretationResult,
  index: number,
  source: ValidatedUnifiedSourceDocument,
) {
  const copy = structuredClone(result);
  // Provider IDs are opaque: a local-looking prefix proves no ownership. Only
  // exact findings reproduced by our detector are removed before recomputing
  // against the reconciled draft; provider ambiguities must remain in Review.
  const localFindings = new Set(
    validateInterpretationFidelity(result, source).map(findingIdentity),
  );
  const keepFinding = (finding: TripFinding) =>
    !localFindings.has(findingIdentity(finding));
  const ids = new Map<string, string>();
  const namespace = sourceNamespace(result.source_id);
  const id = (value: string): string => {
    let mapped = ids.get(value);
    if (!mapped) {
      mapped = `chunk:${namespace}:${index}:id:${ids.size}`;
      ids.set(value, mapped);
    }
    return mapped;
  };
  const refs = (values: string[] | undefined) => values?.map(id);
  const mapFinding = (finding: TripFinding): TripFinding => ({
    ...finding,
    ...(finding.id ? { id: id(finding.id) } : {}),
    ...(finding.refs ? { refs: refs(finding.refs) } : {}),
    ...(finding.entity_refs ? { entity_refs: refs(finding.entity_refs) } : {}),
  });
  // Source IDs and source_refs belong to the document, never this namespace.
  copy.findings = copy.findings.filter(keepFinding).map(mapFinding);
  if (copy.draft) {
    const draft = copy.draft;
    draft.trip.id = id(draft.trip.id);
    for (const day of draft.days) day.id = id(day.id);
    for (const entity of draft.entities) {
      entity.id = id(entity.id);
      entity.day_id = entity.day_id === null ? null : id(entity.day_id);
      for (const action of entity.actions) action.id = id(action.id);
      for (const dependency of [
        entity.reservation,
        entity.ticket,
        entity.readiness,
      ])
        if (dependency?.todo_id) dependency.todo_id = id(dependency.todo_id);
    }
    for (const relation of draft.relationships) {
      relation.id = id(relation.id);
      relation.member_entity_ids = relation.member_entity_ids.map(id);
      relation.parent_entity_id =
        relation.parent_entity_id === null
          ? null
          : id(relation.parent_entity_id);
      relation.child_entity_ids = relation.child_entity_ids.map(id);
    }
    for (const item of draft.supporting_items) {
      item.id = id(item.id);
      if (item.group) item.group.id = id(item.group.id);
    }
    draft.findings = draft.findings
      .filter(keepFinding)
      .map((item) => mapFinding(item) as typeof item);
  }
  return copy;
}

export function reconcileInterpretationChunks(
  results: readonly SemanticInterpretationResult[],
  source: ValidatedUnifiedSourceDocument,
  plans?: readonly InterpretationChunkPlan[],
):
  | { valid: true; result: SemanticInterpretationResult }
  | { valid: false; findings: TripFinding[] } {
  if (results.length === 0)
    return {
      valid: false,
      findings: [
        {
          code: "CHUNK_RESULTS_MISSING",
          message: "No interpretation chunks are available.",
          blocking: true,
        },
      ],
    };
  const invalid = (code: string, message: string) => ({
    valid: false as const,
    findings: [{ code, message, blocking: true }],
  });
  const expectedIds = new Set(source.evidence_units.map((unit) => unit.id));
  let projectedResults = [...results];
  if (plans) {
    if (plans.length !== results.length)
      return invalid(
        "CHUNK_PLAN_COUNT_MISMATCH",
        "Chunk plans and results do not match.",
      );
    const original = new Map(
      source.evidence_units.map((unit) => [unit.id, unit]),
    );
    const owners = new Set<string>();
    for (const [index, plan] of plans.entries()) {
      if (
        plan.source.source_id !== source.source_id ||
        plan.source.schema_version !== source.schema_version
      )
        return invalid(
          "CHUNK_SOURCE_IDENTITY_MISMATCH",
          "Chunk plan identity does not match the original source.",
        );
      const submitted = new Set(
        plan.source.evidence_units.map((unit) => unit.id),
      );
      const declared = [...plan.ownedIds, ...plan.contextIds];
      if (
        plan.ownedIds.length === 0 ||
        submitted.size !== plan.source.evidence_units.length ||
        new Set(declared).size !== declared.length ||
        declared.length !== submitted.size ||
        declared.some((id) => !submitted.has(id))
      )
        return invalid(
          "CHUNK_PLAN_SCOPE_INVALID",
          "Chunk owned and context identities must exactly partition submitted evidence.",
        );
      for (const unit of plan.source.evidence_units) {
        const actual = original.get(unit.id);
        if (
          !actual ||
          JSON.stringify(stableValue({ ...unit, source_order: 0 })) !==
            JSON.stringify(stableValue({ ...actual, source_order: 0 }))
        )
          return invalid(
            "CHUNK_CONTEXT_MUTATED",
            "Chunk evidence must be an exact original-source projection.",
          );
      }
      for (const id of plan.ownedIds) {
        if (owners.has(id))
          return invalid(
            "CHUNK_DUPLICATE_SOURCE_UNIT",
            "Source evidence must have exactly one chunk owner.",
          );
        owners.add(id);
      }
      const result = results[index]!;
      const refs = result.coverage.block_dispositions.map(
        (item) => item.source_ref,
      );
      if (
        result.coverage.block_disposition_ranges?.length ||
        result.coverage.total_blocks !== submitted.size ||
        refs.length !== submitted.size ||
        new Set(refs).size !== submitted.size ||
        refs.some((id) => !submitted.has(id))
      )
        return invalid(
          "CHUNK_PLAN_COVERAGE_MISMATCH",
          "Each result must cover exactly its submitted owned and context evidence.",
        );
      const recordRefs = [
        ...result.findings.flatMap((item) => item.source_refs ?? []),
        ...(result.draft
          ? [
              result.draft.trip,
              ...result.draft.days,
              ...result.draft.entities,
              ...result.draft.relationships,
              ...result.draft.supporting_items,
              ...result.draft.findings,
            ].flatMap((item) => item.source_refs)
          : []),
        ...result.coverage.unparsed_items.map((item) => item.source_ref),
      ];
      if (recordRefs.some((id) => !submitted.has(id)))
        return invalid(
          "CHUNK_FOREIGN_SOURCE_REFERENCE",
          "Chunk semantics reference evidence that was not submitted.",
        );
    }
    if (owners.size !== expectedIds.size)
      return invalid(
        "CHUNK_MISSING_SOURCE_UNIT",
        "Chunk ownership does not cover the original source.",
      );
    const hasDraft = results.some((result) => result.status === "draft");
    projectedResults = results.map((originalResult, index) => {
      const result = structuredClone(originalResult);
      const owned = new Set(plans[index]!.ownedIds);
      result.coverage = {
        total_blocks: owned.size,
        block_dispositions: result.coverage.block_dispositions.filter((item) =>
          owned.has(item.source_ref),
        ),
        unparsed_items: result.coverage.unparsed_items.filter((item) =>
          owned.has(item.source_ref),
        ),
      };
      if (
        hasDraft &&
        result.status === "insufficient" &&
        result.coverage.block_dispositions.some(
          (item) => item.disposition === "supporting",
        ) &&
        result.coverage.block_dispositions.every(
          (item) => item.disposition !== "interpreted",
        )
      ) {
        result.status = "draft";
        result.draft = {
          schema_version: "parsed-trip-draft.v1",
          trip: {
            id: "trip:reference-projection",
            title: null,
            start_date: null,
            end_date: null,
            timezone: null,
            geography: [],
            source_refs: [...owned],
          },
          days: [],
          entities: [],
          relationships: [],
          findings: [],
          supporting_items: source.evidence_units
            .filter((unit) => owned.has(unit.id))
            .flatMap((unit) => {
              const entries: ParsedTripDraft["supporting_items"] = [];
              if (unit.display_value.trim())
                entries.push({
                  id: `projection:note:${entries.length}:${unit.id}`,
                  kind: "note",
                  text: unit.display_value,
                  url: null,
                  unresolved: true,
                  source_refs: [unit.id],
                });
              for (const link of unit.links)
                entries.push({
                  id: `projection:link:${entries.length}:${unit.id}`,
                  kind: "reference",
                  text: link.label
                    ? link.target.startsWith("https://")
                      ? link.label
                      : link.label + " " + link.target
                    : link.target,
                  url: link.target.startsWith("https://") ? link.target : null,
                  unresolved: true,
                  source_refs: [unit.id],
                });
              return entries;
            }),
        };
      }
      return result;
    });
  }
  const coveredIds = new Set<string>();
  for (const result of projectedResults) {
    if (
      result.source_id !== source.source_id ||
      result.source_schema_version !== source.schema_version
    )
      return invalid(
        "CHUNK_SOURCE_IDENTITY_MISMATCH",
        "Chunk source identity or version does not match the original source.",
      );
    if (result.coverage.block_disposition_ranges?.length)
      return invalid(
        "CHUNK_COVERAGE_NOT_EXPANDED",
        "Chunk coverage must be expanded and validated before reconciliation.",
      );
    if (
      result.coverage.total_blocks !== result.coverage.block_dispositions.length
    )
      return invalid(
        "CHUNK_COVERAGE_TOTAL_MISMATCH",
        "Chunk coverage count does not match its dispositions.",
      );
    for (const item of result.coverage.block_dispositions) {
      if (!expectedIds.has(item.source_ref))
        return invalid(
          "CHUNK_UNKNOWN_SOURCE_UNIT",
          "Chunk coverage contains an unknown source unit.",
        );
      if (coveredIds.has(item.source_ref))
        return invalid(
          "CHUNK_DUPLICATE_SOURCE_UNIT",
          "Source units must occur in exactly one interpretation chunk.",
        );
      coveredIds.add(item.source_ref);
    }
  }
  if (coveredIds.size !== expectedIds.size)
    return invalid(
      "CHUNK_MISSING_SOURCE_UNIT",
      "Chunk coverage does not cover the complete original source.",
    );
  const chunks = projectedResults.map((result, index) =>
    namespaceChunk(result, index, source),
  );
  const entityAliases = new Map<string, string>();
  if (plans && chunks.every((chunk) => chunk.status === "draft")) {
    const ownedEntities = chunks.flatMap((chunk, index) =>
      chunk.draft!.entities.filter((entity) =>
        entity.source_refs.some((ref) => plans[index]!.ownedIds.includes(ref)),
      ),
    );
    for (const [index, chunk] of chunks.entries()) {
      const owned = new Set(plans[index]!.ownedIds);
      const draft = chunk.draft!;
      const referenced = new Set(
        draft.relationships.flatMap((relation) => [
          ...relation.member_entity_ids,
          ...relation.child_entity_ids,
          ...(relation.parent_entity_id ? [relation.parent_entity_id] : []),
        ]),
      );
      for (const stub of draft.entities.filter(
        (entity) => !entity.source_refs.some((ref) => owned.has(ref)),
      )) {
        const owners = ownedEntities.filter(
          (entity) =>
            refIdentity(entity.source_refs) === refIdentity(stub.source_refs) &&
            entityMeaning(entity) === entityMeaning(stub),
        );
        if (!referenced.has(stub.id) || owners.length !== 1)
          return invalid(
            "CHUNK_CONTEXT_ENTITY_CONFLICT",
            "A context entity must be an exact relationship stub for one uniquely owned entity.",
          );
        const owner = owners[0]!;
        entityAliases.set(stub.id, owner.id);
        stub.actions.forEach((action, actionIndex) =>
          entityAliases.set(action.id, owner.actions[actionIndex]!.id),
        );
        for (const key of ["reservation", "ticket", "readiness"] as const)
          if (stub[key]?.todo_id && owner[key]?.todo_id)
            entityAliases.set(stub[key]!.todo_id!, owner[key]!.todo_id!);
      }
      draft.entities = draft.entities.filter((entity) =>
        entity.source_refs.some((ref) => owned.has(ref)),
      );
      draft.supporting_items = draft.supporting_items.filter((item) =>
        item.source_refs.some((ref) => owned.has(ref)),
      );
    }
    const alias = (id: string) => entityAliases.get(id) ?? id;
    for (const chunk of chunks)
      for (const relation of chunk.draft!.relationships) {
        relation.member_entity_ids = relation.member_entity_ids.map(alias);
        relation.child_entity_ids = relation.child_entity_ids.map(alias);
        if (relation.parent_entity_id)
          relation.parent_entity_id = alias(relation.parent_entity_id);
      }
  }
  const findings = chunks.flatMap((chunk) => chunk.findings);
  const dispositions = new Map(
    chunks
      .flatMap((chunk) => chunk.coverage.block_dispositions)
      .map((item) => [item.source_ref, item]),
  );
  const coverage = {
    total_blocks: source.evidence_units.length,
    block_dispositions: source.evidence_units.flatMap((unit) => {
      const disposition = dispositions.get(unit.id);
      return disposition ? [disposition] : [];
    }),
    unparsed_items: chunks.flatMap((chunk) => chunk.coverage.unparsed_items),
  };
  const base = {
    schema_version: "semantic-interpretation-result.v2" as const,
    source_schema_version: source.schema_version,
    source_id: source.source_id,
    coverage,
  };
  if (chunks.some((chunk) => chunk.status === "insufficient")) {
    return {
      valid: true,
      result: {
        ...base,
        status: "insufficient",
        draft: null,
        findings: [
          ...findings,
          ...chunks.flatMap((chunk) => chunk.draft?.findings ?? []),
        ].map((item) => ({
          ...item,
          entity_refs: [],
          ...(item.refs ? { refs: [] } : {}),
        })),
      },
    };
  }
  const drafts = chunks.map((chunk) => chunk.draft!);
  const dateSupport = drafts.map((draft) =>
    assessTabularDateSupport(draft, source),
  );
  const unsupportedDayIds = new Set(
    dateSupport.flatMap((assessment) =>
      assessment.dateDecisions.flatMap((decision) =>
        decision.target.kind === "day" ? [decision.target.day_id] : [],
      ),
    ),
  );
  const timezones = unique(
    drafts.flatMap((draft) =>
      draft.trip.timezone ? [draft.trip.timezone] : [],
    ),
  );
  if (timezones.length > 1) {
    return {
      valid: false,
      findings: [
        {
          code: "CHUNK_TIMEZONE_CONFLICT",
          message: "Selected sheets contain conflicting trip timezones.",
          blocking: true,
        },
      ],
    };
  }
  const aliases = new Map<string, string>(entityAliases);
  const days: DraftDay[] = [];
  const dated = new Map<string, DraftDay>();
  const anchored = new Map<string, DraftDay>();
  const dayLeaveBys = new Map<
    string,
    { values: Set<string>; finding: TripFinding | null }
  >();
  const dayTexts = new Map<
    string,
    Record<"label" | "title" | "subtitle", Set<string>>
  >();
  for (const draft of drafts) {
    for (const day of [...draft.days].sort(
      (left, right) => left.source_order - right.source_order,
    )) {
      const mergeableDate =
        day.date !== null && !unsupportedDayIds.has(day.id) ? day.date : null;
      const anchor = plans ? specificDateAnchor(day.source_refs, source) : null;
      const existing =
        (anchor ? anchored.get(anchor) : undefined) ??
        (mergeableDate === null ? undefined : dated.get(mergeableDate));
      if (
        existing &&
        day.date !== null &&
        existing.date !== null &&
        existing.date !== day.date
      )
        return invalid(
          "CHUNK_DAY_DATE_CONFLICT",
          "The same source date anchor produced conflicting Day dates.",
        );
      if (!existing) {
        const added = { ...day, source_order: days.length };
        days.push(added);
        dayTexts.set(added.id, {
          label: new Set(day.label ? [day.label] : []),
          title: new Set(day.title ? [day.title] : []),
          subtitle: new Set(day.subtitle ? [day.subtitle] : []),
        });
        dayLeaveBys.set(added.id, {
          values: new Set(day.leave_by ? [day.leave_by] : []),
          finding: null,
        });
        if (mergeableDate) dated.set(mergeableDate, added);
        if (anchor) anchored.set(anchor, added);
      } else {
        aliases.set(day.id, existing.id);
        existing.source_refs = unique([
          ...existing.source_refs,
          ...day.source_refs,
        ]);
        // Unknown remains unknown if any continuation could not establish its
        // complete date; a neighbouring response must not silently fill it.
        if (day.date === null || unsupportedDayIds.has(day.id))
          existing.date = null;
        if (anchor) anchored.set(anchor, existing);
        for (const field of ["label", "title", "subtitle"] as const) {
          const texts = dayTexts.get(existing.id)![field];
          if (day[field]) texts.add(day[field]);
          existing[field] = texts.size ? [...texts].join(" / ") : null;
        }
        const leaveBys = dayLeaveBys.get(existing.id)!;
        if (day.leave_by) leaveBys.values.add(day.leave_by);
        if (leaveBys.values.size > 1) {
          if (!leaveBys.finding) {
            leaveBys.finding = {
              id: `finding:chunk:leave-by:${findings.length}`,
              code: "CHUNK_DAY_LEAVE_BY_CONFLICT",
              severity: "review",
              message: "",
              blocking: true,
              entity_refs: [],
              source_refs: [],
            };
            findings.push(leaveBys.finding);
          }
          leaveBys.finding.message = `Same-date sheets contain different leave-by times: ${[...leaveBys.values].join(" / ")}.`;
          leaveBys.finding.source_refs = [...existing.source_refs];
          existing.leave_by = null;
        } else existing.leave_by = [...leaveBys.values][0] ?? null;
      }
    }
  }
  const first = drafts[0]!;
  for (const draft of drafts) aliases.set(draft.trip.id, first.trip.id);
  const remap = (id: string) => aliases.get(id) ?? id;
  const remapFinding = (finding: TripFinding): TripFinding => ({
    ...finding,
    ...(finding.refs ? { refs: unique(finding.refs.map(remap)) } : {}),
    ...(finding.entity_refs
      ? { entity_refs: unique(finding.entity_refs.map(remap)) }
      : {}),
  });
  const titles = unique(
    drafts.flatMap((draft) => (draft.trip.title ? [draft.trip.title] : [])),
  );
  if (titles.length > 1) {
    findings.push({
      id: "finding:chunk:trip-title",
      code: "CHUNK_TRIP_TITLE_CONFLICT",
      severity: "review",
      message: `Selected sheets describe different trip titles: ${titles.join(" / ")}. Please confirm the trip title.`,
      blocking: true,
      entity_refs: [],
      source_refs: unique(drafts.flatMap((draft) => draft.trip.source_refs)),
    });
  }
  const bound = (field: "start_date" | "end_date") => {
    if (
      dateSupport.some((assessment) =>
        assessment.dateDecisions.some(
          (decision) =>
            decision.target.kind === "trip" && decision.target.field === field,
        ),
      )
    )
      return null;
    const dates = drafts.map((draft) => draft.trip[field]);
    if (dates.some((date) => date === null)) return null;
    const sorted = (dates as string[]).sort();
    return field === "start_date" ? sorted[0]! : sorted.at(-1)!;
  };
  const draft: ParsedTripDraft = {
    schema_version: "parsed-trip-draft.v1",
    trip: {
      ...first.trip,
      title: titles[0] ?? null,
      start_date: bound("start_date"),
      end_date: bound("end_date"),
      timezone: timezones[0] ?? null,
      geography: unique(drafts.flatMap((draft) => draft.trip.geography)),
      source_refs: unique(drafts.flatMap((draft) => draft.trip.source_refs)),
    },
    days,
    entities: drafts
      .flatMap((draft) => draft.entities)
      .map((entity) => ({
        ...entity,
        day_id: entity.day_id === null ? null : remap(entity.day_id),
      })),
    relationships: drafts.flatMap((draft) => draft.relationships),
    supporting_items: drafts.flatMap((draft) => draft.supporting_items),
    findings: drafts
      .flatMap((draft) => draft.findings)
      .map((finding) => remapFinding(finding) as typeof finding),
  };
  if (plans) {
    const boundaryRefs = regionChunkBoundaryRefs(plans, source);
    if (boundaryRefs.length)
      findings.push({
        id: "finding:chunk:seam-review",
        severity: "review",
        code: "CHUNK_SEAM_REVIEW",
        blocking: true,
        message:
          "這份工作表分段判讀；請核對分段交界的日期、順序與活動關係，再確認完整行程。",
        source_refs: unique(boundaryRefs),
        entity_refs: [],
      });
  }
  // Bounds are cleared here, before the Review date-adjustment stage. Preserve
  // their own chunk's partial expression now: a later full-source year must
  // neither confirm it nor cause it to disappear when there are no Days.
  const retainedPartialDates = new Set<string>();
  const namespace = sourceNamespace(source.source_id);
  for (const assessment of dateSupport) {
    for (const decision of assessment.dateDecisions) {
      if (decision.target.kind !== "trip") continue;
      const identity = JSON.stringify([
        decision.partial_text,
        [...decision.source_refs].sort(),
      ]);
      if (retainedPartialDates.has(identity)) continue;
      retainedPartialDates.add(identity);
      const suffix = retainedPartialDates.size - 1;
      if (
        decision.partial_text &&
        !draft.supporting_items.some(
          (item) =>
            item.text === decision.partial_text &&
            JSON.stringify([...item.source_refs].sort()) ===
              JSON.stringify([...decision.source_refs].sort()),
        )
      ) {
        draft.supporting_items.push({
          id: `supporting:chunk:partial-date:${namespace}:${suffix}`,
          kind: "note",
          text: decision.partial_text,
          url: null,
          unresolved: true,
          source_refs: [...decision.source_refs],
        });
      }
      findings.push({
        id: `finding:chunk:missing-year:${namespace}:${suffix}`,
        severity: "review",
        code: "MISSING_YEAR",
        message: decision.partial_text
          ? `「${decision.partial_text}」沒有支持完整年份；合併分頁判讀已保留原文為參考備註，行程完整日期維持未指定。`
          : "引用的分頁原文沒有支持完整年份；合併判讀已將行程完整日期保留為未指定。",
        blocking: false,
        entity_refs: [],
        source_refs: [...decision.source_refs],
      });
    }
  }
  return {
    valid: true,
    result: {
      ...base,
      status: "draft",
      draft,
      findings: findings.map(remapFinding),
    },
  };
}
