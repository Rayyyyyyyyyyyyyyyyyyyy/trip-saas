export type StableId = string;
export type NullableText = string | null;

export type SemanticType =
  | "flight"
  | "accommodation"
  | "transit"
  | "activity"
  | "restaurant"
  | "free_time"
  | "reservation"
  | "ticket"
  | "preparation"
  | "note"
  | "unknown";

export type TimeKind =
  | "exact"
  | "approximate"
  | "range"
  | "daypart"
  | "none"
  | "open_ended"
  | "all_day";

export type Daypart =
  "morning" | "afternoon" | "evening" | "night" | "unknown" | null;

export interface TripTime {
  kind: TimeKind;
  start: NullableText;
  end: NullableText;
  daypart: Daypart;
  raw_text: NullableText;
  crosses_midnight: boolean;
}

export interface TripState {
  optional: boolean;
  tentative: boolean;
  flexible: boolean;
  unresolved: boolean;
}

export interface TripPlace {
  name: NullableText;
  address: NullableText;
  url: NullableText;
  unresolved: boolean;
}

export interface DraftTripPlace extends TripPlace {
  raw_text: NullableText;
}

export interface TripAction {
  id: StableId;
  kind: "map" | "restaurant" | "reference";
  label: string;
  url: string;
}

export interface ReservationDependency {
  status:
    | "unknown"
    | "not_required"
    | "action_needed"
    | "pending"
    | "confirmed"
    | "cancelled";
  reference: NullableText;
  detail: NullableText;
  todo_id: NullableText;
}

export interface TicketDependency {
  status:
    | "unknown"
    | "not_required"
    | "action_needed"
    | "pending"
    | "ready"
    | "unavailable";
  reference: NullableText;
  detail: NullableText;
  todo_id: NullableText;
}

export interface ReadinessDependency {
  kind: "reservation" | "ticket" | "document" | "payment" | "other";
  status:
    | "unknown"
    | "not_required"
    | "action_needed"
    | "pending"
    | "ready"
    | "blocked";
  detail: NullableText;
  todo_id: NullableText;
}

export interface TripProvenance {
  origin: "source" | "user" | "legacy_unavailable";
  overridden_fields: string[];
  source_id: StableId | null;
  locator_refs: StableId[];
}

export interface DraftProvenance {
  origin: "interpreter" | "user";
  overridden_fields: string[];
}

export interface CanonicalDay {
  id: StableId;
  date: NullableText;
  source_order: number;
  label: NullableText;
  title: NullableText;
  subtitle: NullableText;
  leave_by: NullableText;
}

export interface DraftDay extends CanonicalDay {
  source_refs: string[];
}

export interface CanonicalEntity {
  id: StableId;
  day_id: StableId | null;
  semantic_type: SemanticType;
  title: string;
  place: TripPlace;
  time: TripTime;
  state: TripState;
  reservation: ReservationDependency | null;
  ticket: TicketDependency | null;
  readiness: ReadinessDependency | null;
  notes: string[];
  actions: TripAction[];
  provenance: TripProvenance;
}

export interface DraftEntity extends Omit<
  CanonicalEntity,
  "place" | "provenance"
> {
  raw_label: NullableText;
  place: DraftTripPlace;
  unresolved_fields: string[];
  confidence: "high" | "medium" | "low" | "unknown";
  provenance: DraftProvenance;
  source_refs: string[];
}

export type RelationshipType =
  "sequence" | "alternative" | "conditional" | "fallback" | "parent_child";

export interface TripRelationship {
  id: StableId;
  type: RelationshipType;
  member_entity_ids: StableId[];
  parent_entity_id: StableId | null;
  child_entity_ids: StableId[];
  condition: NullableText;
}

export interface DraftRelationship extends TripRelationship {
  source_refs: string[];
}

export interface SupportingItem {
  id: StableId;
  kind: "reference" | "instruction" | "timetable" | "asset" | "note" | "other";
  text: NullableText;
  url: NullableText;
  unresolved: boolean;
}

export interface DraftSupportingItem extends SupportingItem {
  source_refs: string[];
}

export interface TripFinding {
  id?: StableId;
  severity?: "error" | "warning" | "review" | "info";
  code: string;
  message: string;
  blocking: boolean;
  refs?: string[];
  entity_refs?: string[];
  source_refs?: string[];
}

export interface ParsedTripDraft {
  schema_version: "parsed-trip-draft.v1";
  trip: {
    id: StableId;
    title: NullableText;
    start_date: NullableText;
    end_date: NullableText;
    timezone: NullableText;
    geography: string[];
    source_refs: string[];
  };
  days: DraftDay[];
  entities: DraftEntity[];
  relationships: DraftRelationship[];
  supporting_items: DraftSupportingItem[];
  findings: Array<TripFinding & { id: StableId; source_refs: string[] }>;
}

export interface CanonicalTrip {
  schema_version: "canonical-trip.v2";
  id: StableId;
  title: NullableText;
  start_date: NullableText;
  end_date: NullableText;
  timezone: NullableText;
  geography: string[];
  days: CanonicalDay[];
  entities: CanonicalEntity[];
  relationships: TripRelationship[];
  supporting_items: SupportingItem[];
}

export interface LegacyCanonicalTripV1
  extends Omit<CanonicalTrip, "schema_version" | "entities"> {
  schema_version: "canonical-trip.v1";
  entities: Array<
    Omit<CanonicalEntity, "provenance"> & {
      provenance: {
        origin: "source" | "user";
        overridden_fields: string[];
      };
    }
  >;
}

export interface SourceExpectation {
  source_id: string;
  schema_version: string;
  block_ids: string[];
}

export interface Coverage {
  total_blocks: number;
  block_dispositions: Array<{
    source_ref: string;
    disposition: "interpreted" | "supporting" | "unparsed";
  }>;
  unparsed_items: Array<{
    source_ref: string;
    locator: string;
    reason_code: string;
    severity: "error" | "warning" | "info";
    message: string;
  }>;
}

export interface SemanticInterpretationResult {
  schema_version: "semantic-interpretation-result.v1";
  source_schema_version: string;
  source_id: string;
  status: "draft" | "insufficient";
  draft: ParsedTripDraft | null;
  findings: TripFinding[];
  coverage: Coverage;
}

export interface TextSourceInput {
  schema_version: "text-source-input.v1";
  source_id: string;
  input_mode: "markdown_file" | "pasted_markdown";
  media_type: "text/markdown";
  content: string;
  display_name: string;
}

export interface ValidationResult {
  valid: boolean;
  findings: TripFinding[];
  schemaErrors: unknown[];
}
