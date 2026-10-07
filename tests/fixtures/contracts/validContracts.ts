import type {
  CanonicalTrip,
  ParsedTripDraft,
  SemanticInterpretationResult,
  TextSourceInput,
} from "../../../src/domain/trip/types";

export const validTextSourceInput: TextSourceInput = {
  schema_version: "text-source-input.v1",
  source_id: "source:fixture-001",
  input_mode: "pasted_markdown",
  media_type: "text/markdown",
  content: "# One day",
  display_name: "Pasted itinerary",
};

export const validParsedTripDraft: ParsedTripDraft = {
  schema_version: "parsed-trip-draft.v1",
  trip: {
    id: "trip:fixture-001",
    title: "One day",
    start_date: "2026-09-10",
    end_date: "2026-09-10",
    timezone: "Asia/Tokyo",
    geography: ["Osaka"],
    source_refs: ["source-block:001"],
  },
  days: [
    {
      id: "day:2026-09-10",
      date: "2026-09-10",
      source_order: 0,
      label: "Arrival",
      title: "Arrival",
      subtitle: null,
      leave_by: null,
      source_refs: ["source-block:001"],
    },
  ],
  entities: [
    {
      id: "entity:arrival",
      day_id: "day:2026-09-10",
      semantic_type: "activity",
      title: "Arrive",
      raw_label: "Arrive",
      place: {
        name: null,
        address: null,
        url: null,
        raw_text: null,
        unresolved: false,
      },
      time: {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
      state: {
        optional: false,
        tentative: false,
        flexible: false,
        unresolved: false,
      },
      reservation: null,
      ticket: null,
      readiness: null,
      notes: [],
      actions: [],
      unresolved_fields: [],
      confidence: "high",
      provenance: { origin: "interpreter", overridden_fields: [] },
      source_refs: ["source-block:001"],
    },
  ],
  relationships: [],
  supporting_items: [],
  findings: [],
};

export const validDraftInterpretationResult: SemanticInterpretationResult = {
  schema_version: "semantic-interpretation-result.v2",
  source_schema_version: "unified-source-document.v1",
  source_id: "source:fixture-001",
  status: "draft",
  draft: validParsedTripDraft,
  findings: [],
  coverage: {
    total_blocks: 1,
    block_dispositions: [
      { source_ref: "source-block:001", disposition: "interpreted" },
    ],
    unparsed_items: [],
  },
};

export const validInsufficientInterpretationResult: SemanticInterpretationResult =
  {
    schema_version: "semantic-interpretation-result.v2",
    source_schema_version: "unified-source-document.v1",
    source_id: "source:fixture-001",
    status: "insufficient",
    draft: null,
    findings: [
      {
        id: "finding:missing-structure",
        severity: "error",
        code: "MISSING_TRIP_STRUCTURE",
        message: "A supported trip/day structure could not be established.",
        blocking: true,
        entity_refs: [],
        source_refs: ["source-block:001"],
      },
    ],
    coverage: {
      total_blocks: 1,
      block_dispositions: [
        { source_ref: "source-block:001", disposition: "unparsed" },
      ],
      unparsed_items: [
        {
          source_ref: "source-block:001",
          locator: "lines 1-1",
          reason_code: "missing_trip_structure",
          severity: "error",
          message: "Trip structure is missing.",
        },
      ],
    },
  };

export const validCanonicalTrip: CanonicalTrip = {
  schema_version: "canonical-trip.v3",
  id: "trip:fixture-001",
  title: "One day",
  start_date: "2026-09-10",
  end_date: "2026-09-10",
  timezone: "Asia/Tokyo",
  geography: ["Osaka"],
  days: [
    {
      id: "day:2026-09-10",
      date: "2026-09-10",
      source_order: 0,
      label: "Arrival",
      title: "Arrival",
      subtitle: null,
      leave_by: null,
    },
  ],
  entities: [
    {
      id: "entity:arrival",
      day_id: "day:2026-09-10",
      semantic_type: "activity",
      title: "Arrive",
      place: { name: null, address: null, url: null, unresolved: false },
      time: {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
      state: {
        optional: false,
        tentative: false,
        flexible: false,
        unresolved: false,
      },
      reservation: null,
      ticket: null,
      readiness: null,
      notes: [],
      actions: [],
      provenance: {
        origin: "source",
        overridden_fields: [],
        source_id: "source:fixture-001",
        locator_refs: ["source-block:001"],
      },
    },
  ],
  relationships: [],
  supporting_items: [],
};
