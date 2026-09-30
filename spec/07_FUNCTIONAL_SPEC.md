# Trip Runtime — Functional Product Spec

> Status: Working Product Behavior Contract — local Review/Result implementation verified; live parser acceptance pending

Current correction work is tracked in
[`complete-faithful-markdown-journey`](../openspec/changes/complete-faithful-markdown-journey/tasks.md).
The full review found limits in the earlier local verification, including
unknown-date confirmation, undated placement and Canonical date/time validation.
The following remains a behavior contract, not proof that every scenario passes.

This is a normative behavior contract. Local verification now covers the
executable source-document gate, provider-neutral interpretation gates,
application-owned stage/overall deadlines, visible `停止這次判讀`, inactive
late-result rejection, non-overlapping Result placement, explicit sample routing,
and Review-before-confirmation replacement safety. See the active change's
[`validation.md`](../openspec/changes/archive/2026-09-07-harden-source-to-render-boundaries/validation.md)
for the observed test boundaries. This is not a deployment claim. Live
`gemini-3.8-flash` acceptance and production-default activation remain gated.
> Scope: Observable behavior for Generalized Product V0.
> Visual styling belongs to `06_RESULT_UI_SPEC.md`.

## 1. V0 user flow

```text
Home
→ Provide Markdown
→ Parse
→ Review
→ Confirm
→ Local Overview / Day
```

With an existing confirmed trip:

```text
Existing Trip stays active
→ Candidate Import runs separately
→ Successful confirmation replaces active trip
```

## 2. Workflow states

```text
idle
validating_source
extracting
parsing
validating_draft
review_required
confirming
confirmed
failed
cancelled
```

UI may group internal states visually, but behavior must respect them.

One application workflow owns the current candidate, source document,
processing stage, request/session identity, interpretation, Review,
confirmation, failure, cancellation, and terminal cleanup. Intake controls may
retain unsubmitted file/paste form values but must not keep a synchronized
processing or failure state.

## 3. Home

### Purpose

Entry point for starting/resuming an import and opening the active confirmed trip when one exists.

### Must provide

- Markdown file upload
- pasted Markdown text input
- Gemini parser settings
- browser-local Gemini API-key controls
- Canonical JSON import
- format/privacy guidance
- explicit sample/fallback path

### Must not

- force traveler profile fields
- require provider key to read confirmed trip
- auto-activate bundled sample

Home may place Gemini credentials, Canonical JSON import, and sample controls in a secondary settings/import surface; they do not all need equal first-viewport emphasis. Every required secondary capability must remain reachable through an explicit visible control rather than explanatory copy alone.

Format guidance must distinguish formats currently enabled from roadmap
formats. It must not imply that spreadsheet import is supported before its gated
Source Adapter ships. PDF must be identified as unsupported input, not as a
roadmap promise. When spreadsheet import is enabled, the intake explanation must state
before upload/processing that:

- the product first extracts available text and structure
- semantic interpretation is performed by Gemini
- a valid Gemini API key is required
- source content used for interpretation is sent to Gemini

Acceptable concise copy:

> Excel／CSV 會先抽取儲存格內容與表格結構，再交由 Gemini 判讀。需先設定 Gemini API key；用於判讀的內容會傳送至 Gemini。PDF 目前不支援匯入。

If no valid Gemini key is stored, spreadsheet processing must remain disabled
and expose a direct route to credential setup. This credential gate
must not block Canonical JSON import or reading an already confirmed trip.

With an active trip, Home may show:

- the single active confirmed trip
- a separate candidate import/review state

It must not imply a persisted multi-trip library in Generalized V0.

## 4. Markdown input

### Action

Either:

- select or drag one Markdown file
- paste Markdown text, treated as an ephemeral Markdown source

Pasted Markdown requires an actual text-input surface with explicit submit/start behavior, empty-input validation, and clear/replace behavior. Mentioning paste support in explanatory copy is not sufficient.

Both modes normalize into the same required `TextSourceInput` schema before extraction. Pasted text does not expand V0 beyond the Markdown Source Adapter. It must receive a session source identifier, required display name, and stable line/block locators for Review evidence.

### System flow

```text
validate source
→ extract
→ UnifiedSourceDocument
→ validate source document
→ parse
→ SemanticInterpretationResult
→ required response / Reviewable Draft gates
→ ParsedTripDraft
→ deterministic draft validation
→ Review
```

### Progress presentation

UI may group internal states into these user-facing stages:

```text
Read source
→ Build source document
→ Interpret semantics
→ Validate and prepare Review
```

Progress copy must describe completed/current work without claiming unsupported precision or success before the corresponding stage finishes.

The blocking progress modal derives from the application workflow. Configured
stage/overall deadlines cover reading, extraction, source-document validation,
provider work, and local response validation independently of the provider's
per-attempt deadline. Escape/backdrop dismissal may remain disabled to avoid
hidden work, but the modal must expose `停止這次判讀` and abort the active
session/request when used.

Success, insufficient, failure, timeout, and explicit stop must all clear active
timers and leave the blocking modal. Timeout/stop/failure preserves the selected
source where technically possible and never replaces or hides the confirmed
trip. A late result from an inactive identity is ignored.

### Privacy copy

Privacy guidance must distinguish:

- local/session handling and durable storage
- content sent to the selected parser provider
- data excluded from CanonicalTrip

The UI must not claim that content never leaves the device when the configured Semantic Interpreter transmits content to an external provider.

### Failure

Examples:

- unsupported type
- unreadable/empty file
- extraction failure
  Required:
- clear error
- existing active trip preserved
- retry/replace path

If extraction succeeds but day/date structure cannot be interpreted conservatively, recovery may offer:

- supply the missing trip date/day grouping
- explicitly treat the source as a single-day list
- replace the source

This is structural correction, not itinerary planning. The system must not guess a day order or silently distribute items.

If interpretation is structurally insufficient or some source content cannot be parsed safely, the response must list every known missing requirement and unparsed item with its source locator and reason. The UI must distinguish:

- invalid/schema-malformed parser output → parse failure + retry
- schema-valid but insufficient interpretation → bounded recovery + replace source
- reviewable draft with non-blocking unparsed content → Review with explicit findings

No validated evidence unit may disappear silently in any case.

An explicit unknown/none value is not itself a missing parse result. For example, a source item with no time remains an untimed item; the system must not report a missing exact time or invent one merely to satisfy the required schema.

## 5. Replacement import

Precondition:
active confirmed trip exists.
Contract:

```text
candidate source validate
→ parse
→ validate draft
→ review
→ validate candidate
→ confirm
→ persist
→ atomically replace active trip
```

Before final confirmation:

- active trip remains readable
- failure preserves it
- cancel preserves it
- surface close ≠ implicit request cancel unless explicitly defined
- stale responses never advance current workflow

After successful persistence and replacement:

- the confirmed candidate is the single active trip
- the candidate import/review state is cleared
- Home and all confirmation-success actions resolve the same new active trip
- the replaced trip must not continue to appear as active

## 6. Parser provider behavior

Generalized Product V0 uses one Gemini adapter behind the neutral parse
contract. Other providers are later optimization scope.
Provider/model metadata must not enter CanonicalTrip.
Credential rules:

- persisted browser-locally for Gemini
- survives reload on the same browser/device; does not sync across devices
- must not be stored as plaintext in `localStorage`; use the approved
  browser-local credential store and make its security boundary clear
- explicit clear action
- no server synchronization or hosted-publication transfer
- no key in URL
- confirmed trip readable without parser credentials
- spreadsheet semantic interpretation cannot start without a valid Gemini key

Exact `gemini-3.8-flash` is the selected stable default candidate. Production
must remain without an accepted default until that exact model passes the
generated-schema checks, deterministic parser fixtures, and live External
Markdown Benchmark #001. After acceptance, use the exact stable ID rather than
a moving alias. Model changes rerun the same gates, and the application must not
silently fall back to another model.

The provider-neutral interpretation interface owns source assertion, request
preflight, provider invocation, local response-schema validation, complete
coverage Gate A, and Reviewable Draft Gate B in that order. The Gemini adapter
owns transport only: endpoint/model selection, authentication header,
request/response envelope handling, HTTP translation, per-attempt timeout,
bounded `429`/`503` retry, cancellation, and structured-value extraction.

## 7. Parse result

`ParsedTripDraft` is provisional.
May include:

- interpreted entities
- confidence
- unresolved semantics
- provenance
- validation findings
- preserved references
  Must not be treated as confirmed truth.

The provider-neutral `SemanticInterpretationResult` is required for both file and pasted input. It always contains:

- schema version
- matching source ID
- `draft | insufficient` status
- draft or explicit null
- structured findings
- complete validated evidence-unit coverage accounting
- explicit unparsed-item list, including an empty list when none exist

Minimum gates:

- a schema-valid, coverage-complete response is required before any parse outcome is shown
- at least one supported trip/day structure and one linked itinerary entity are required for normal Review
- authoritative validation, confirmation, and persistence are required for Overview/Day

A numeric confidence percentage alone must not unlock Review, confirmation, or Result UI.

## 8. Review

Purpose:

> "I understood your itinerary this way. Is this correct?"

### Required actions

- edit date/time/title/type/note
- correct time precision where supported
- toggle optional/tentative/flexible independently; these are three separate
  flags and are not a mutually exclusive mode selector
- correct place text
- delete false parser entity
- add missing entity
- confirm

### Required visibility

- source locator/evidence
- warnings
- ambiguity
- low confidence
- conflicts
- broken evidence
- preserved references
- unparsed source items and missing required structure
- user override identity

### Approved Review composition

- mobile and desktop use the same centered single-column Review reading flow
- every material question or correction surface shows its relevant read-only
  source excerpt before the question/fields
- technical source locators remain available to provenance and diagnostics but
  need not be presented as Markdown-style line numbers to the traveler
- the source remains read-only
- automatically interpreted items may be summarized, but remain inspectable and editable before confirmation
- every supported viewport provides the same required correction capabilities; responsive composition may differ, field/action availability may not
- a user correction is visibly identified as user-authored in subsequent Review and Result detail where provenance is shown
- an edited item may expose a `你的校正` field-by-field difference from the
  interpreted value to the user-confirmed value; this is provenance, not new
  itinerary intent

### Must not become

- planner
- route optimizer
- recommendation editor
- drag/drop scheduler
- AI replan flow

## 9. User overrides

Any manual correction must remain identifiable as user-authored.
Reparse/resolution/enrichment must not overwrite it.

## 10. Confirmation

Preconditions:

- blocking validation resolved
- candidate CanonicalTrip passes authoritative validation
  Transaction:

```text
validate candidate
→ persist candidate
→ update active trip
```

Persistence failure:

- do not replace active trip
- surface error
- retain candidate for safe recovery when possible

### Confirmation success

Only after authoritative validation and successful persistence may UI show a confirmed success state.

Source-supported unknown values are valid confirmation inputs. Trip title,
trip/day full dates, timezone, Day labels/titles, Day association and place
facts may remain null where their executable contracts allow it. The user is
not required to fill source-absent facts. Home, success and Result use neutral
presentation-only labels for those values and do not persist those labels.

Malformed known values remain blocking: impossible dates, reversed trip/day
ranges, invalid time-kind shapes or rollover, duplicate IDs/source order and
unresolved references cannot be imported, confirmed, written or activated.

The current durable write format is `canonical-trip.v2`. Supported v1 JSON and
stored records are decoded non-destructively to v2; missing v1 source trace is
represented as `legacy_unavailable`, never guessed. A failed decode/migration
preserves the existing active record and pointer. Durable entity provenance is
limited to origin, overridden field paths, an opaque source ID and bounded
evidence-unit locator IDs; raw source/evidence/provider content remains absent.

The success surface may summarize:

- trip identity
- day/entity count
- user-confirmed correction count

It must provide a direct action to open the confirmed trip and a secondary action back to Home/current trip management.

After a replacement import, both actions must resolve against the newly active trip. Returning Home must not show the confirmed candidate as pending or the replaced trip as active.

## 11. Canonical JSON import

Purpose:
allow an existing valid CanonicalTrip file to enter the local V0 without rerunning source parsing and Review.
Import behavior:

- accept only supported Canonical schema versions
- validate before activation
- invalid import does not replace active trip
- activation only after authoritative validation
- imported non-trip data must not enter CanonicalTrip or persisted trip data

V0 does not provide Canonical JSON export.

## 12. Overview

Purpose:
pre-trip compression.
Must expose when available:

- trip identity
- date range
- geography/phases
- day index
- critical anchors
- readiness states
  Day selection opens that Day.
  Missing flight/hotel/reservation:
  omit; do not fake placeholder content.

When readiness is editable on Overview:

- each item changes independently between `已備妥` and `待備妥`
- `全部標記為已備妥` may update every visible readiness dependency in one
  explicit action
- all-ready state collapses to a low-emphasis summary while retaining an
  explicit inspect/reset path
- UI copy states `已備妥 ≠ 已完成`; readiness never records event completion

## 13. Day

Purpose:
primary travel-time reading surface in Generalized V0.
Must preserve:

- day/date identity
- event order
- time precision
- free time
- optional
- alternative/conditional relations when modeled
- source-provided transit
- reservation/readiness
- source links
- notes
- unresolved states
  Must not:
- invent transit
- invent resolution
- invent exact time
- convert free time into task completion

Presentation Projection must emit one ordered Day display tree with exactly one
primary placement per canonical entity. Relationship members render primarily
inside their group and not again as standalone full entities; sequence controls
order without duplicating content. Compact summaries may reference a placed
entity. Relationship templates preserve complete supported member semantics and
actions, while incompatible overlapping primary groups block confirmation.

## 14. External actions

When CanonicalTrip contains an exact source-provided URL:

- preserve exact URL
- open safely
- use safe rel attributes
  If no valid link exists:
  do not synthesize one unless an explicit fallback capability is defined.

## 15. Golden Viewer compatibility

Do not regress the current checked-in Osaka viewer where the clean-start branch continues to expose it.
No discarded-branch behavior is an inherited requirement.
Viewer-specific capability may include:

- Today
- checklist
- reservations
- directions
- runtime prototypes
  Compatibility ≠ generalized scope.

Generalized V0 production navigation must not expose Today or other runtime-only destinations when those capabilities are unavailable. A design/prototype may display them only when clearly identified as Golden Viewer/later-track material.

## 16. Runtime failure

If runtime-derived data is unavailable:

- Overview remains usable
- Day remains usable
- unsupported NOW/NEXT/leave-by omitted
- no stale/guessed replacement

## 17. Persistence scopes

Clear actions must be explicit:

- trip data
- provider key
- all local data
  Rules:
- clearing trip does not silently clear keys
- clearing key does not delete confirmed trip

## 18. Failure matrix

| Failure                                             | Required outcome                               |
| --------------------------------------------------- | ---------------------------------------------- |
| invalid source input                                | active trip unchanged                          |
| extraction failure                                  | error + retry/replace                          |
| invalid source document / unsafe request size       | stop before provider + retry/replace           |
| provider failure                                    | active trip unchanged                          |
| processing deadline                                 | abort + close modal + preserved-source retry   |
| explicit processing stop                            | abort + close modal + selected source retained |
| malformed model output                              | parse failure + retry                          |
| valid response below Reviewable Draft gate          | list missing/unparsed items + bounded recovery |
| reviewable draft with non-blocking unparsed content | explicit Review findings; no silent omission   |
| validation error                                    | Review/blocking state                          |
| confirm validation fail                             | no activation                                  |
| persistence failure                                 | old trip preserved                             |
| stale async response                                | ignored                                        |
| runtime API failure                                 | static trip preserved                          |
| invalid persisted trip                              | no Viewer entry; recovery path                 |

## 19. V0 functional acceptance

V0 is functionally complete when:

- unfamiliar Markdown reaches Review
- Markdown can be provided through either a real file-input path or a real pasted-text input path
- both input modes satisfy one required normalized input schema and one provider-neutral response schema
- every validated evidence unit is accounted for and every unparsed item is explicitly listed with locator + reason
- invalid/unvalidated source documents never invoke the provider
- blocking processing always has an application deadline and explicit stop path; every terminal outcome closes the modal and clears timers
- exact `gemini-3.8-flash` remains benchmark-gated until live acceptance and no alternate model is selected silently
- structurally insufficient input receives a bounded recovery response instead of an invented draft
- material ambiguity is visible
- parser mistakes can be corrected through the full required action set on mobile and desktop
- confirmation creates valid CanonicalTrip
- a valid supported CanonicalTrip can be imported without persisting non-trip data
- required secondary Home capabilities are visibly reachable
- replacement is transactional and successful replacement leaves one consistent active-trip state across Home, success, Overview, and Day
- Overview/Day render from CanonicalTrip only
- Day entities have one primary placement and relationship groups retain complete member semantics without duplicate full rendering
- source precision/flexible semantics survive
- failure never destroys a previously confirmed trip
