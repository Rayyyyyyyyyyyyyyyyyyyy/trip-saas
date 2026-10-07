# Trip Runtime — Product Validation Plan

> Status: Validation Contract  
> Purpose: Define how product and pipeline hypotheses are tested before scope expansion.

## 1. Validation hierarchy

Trip Runtime must validate in this order:

```text
Parser Quality
→ Review Recovery
→ Result Usability
→ Travel-time Replacement
→ Willingness to Pay
```

Do not use later-stage features to hide failure in earlier stages.

## 2. Experiment A — Parser Quality

### Question
Can unfamiliar Markdown become a structurally valid, semantically conservative draft before user correction?

### Fixture
External Markdown Benchmark #001, Sample #23.

### Measure
- critical missing events
- critical invented events
- unsupported exact critical facts
- ambiguity recall
- schema validity
- required response-envelope validity
- validated evidence-unit accounting coverage
- unparsed-item locator/reason completeness
- silent omission count
- semantic preservation

### Pass gate
Pre-Review draft must have:
- zero missing critical events
- zero invented critical events
- zero unsupported exact critical dates/times/places
- all annotated ambiguities surfaced
- 100% validated evidence-unit accounting as interpreted, preserved supporting/non-itinerary, or explicitly unparsed
- zero silently omitted evidence units
- every unparsed item linked to a stable locator with a structured reason and severity
- valid required `SemanticInterpretationResult` schema

Failing this gate blocks Hosted Delivery implementation.

## 3. Experiment B — Review Recovery

### Question
Can a traveler efficiently recover parser mistakes without rebuilding the itinerary?

### Measure
- time to confirm
- corrected fields
- added missing entities
- deleted false entities
- critical correction count
- unresolved ambiguities after confirmation
- "easier to redo manually" qualitative response

### Required tasks
On both mobile and desktop, ask a tester to:
- inspect and edit an automatically interpreted item
- correct date/day, title, type, note, place text, and time precision
- toggle optional, tentative, and flexible state
- add one parser-missed entity
- delete one parser-created false entity
- verify the relevant source locator/evidence remains available
- identify the correction as user-authored before and after confirmation where provenance is shown

### Success signal
Review behaves as a trust layer, not a second itinerary-authoring workflow.

No fixed universal threshold is yet validated beyond the critical correctness gate; collect evidence before setting a commercial-grade target.

## 4. Experiment C — Result Usability

### Question
Is Overview/Day materially more usable on mobile than the source Markdown?

### Tasks
Ask a tester to locate:
- today's main plan
- next fixed anchor
- reservation state
- an address/link
- optional content
- flexible time
- a personal note
- an approximate or untimed item without interpreting it as exact
- an alternative/conditional relationship without flattening it
- an unresolved item

Ask a tester to perform:
- switch to another Day and verify orientation returns to that Day's start
- distinguish readiness/preparedness from event completion
- read the readiness dependencies on Overview and confirm they are not phrased
  as event completion (readiness is read-only in Generalized V0; add the
  per-item / bulk-ready / inspect-reset steps only once that behavior is built)
- move between Overview and Day without reopening the source

Before the usability session, verify implementation fidelity to the approved
September 2026 visual contract at mobile and desktop viewports:

- white paper / black ink newspaper hierarchy with no card, shadow, rounded
  container, or dark-mode substitution
- frozen `Noto Serif TC` / `Noto Sans TC` font roles and §19 semantic markers
  from `06_RESULT_UI_SPEC.md`
- time remains inline before event titles and does not imply extra precision
- active Date Rail state is black/white and keyboard-operable
- primary desktop reading measure remains approximately 680px
- 44px minimum mobile controls, no horizontal overflow, and acceptable
  light-mode contrast

These checks establish prototype fidelity and operability. They are not, by
themselves, evidence that the Result is more useful than the source.

### Measure
- task completion
- time-to-find
- wrong interpretation
- return-to-source behavior
- qualitative preference

### Failure signal
If Result UI is only "Markdown with nicer CSS," V0 does not prove sufficient value.

## 5. Experiment D — Travel-time Replacement

### Question
During an actual trip, does Trip Runtime replace the original itinerary as the primary reference?

### Measure
- Trip Runtime opens
- original itinerary opens
- reason for reopening source
- missing information type
- most-used Result surface
- failed runtime moments

### Primary product metric
`Original itinerary reopen rate during travel`

### Strong success signal
The traveler can complete travel-time information retrieval without routinely returning to the original source.

## 6. Experiment E — Runtime Value

Run only after static Result usability is credible.

### Question
Do runtime primitives create additional value beyond static webification?

Candidate primitives:
- NOW
- NEXT
- source-derived leave-by
- directions
- reservation readiness
- contextual instructions

### Measure
- usage frequency
- time saved
- avoided mistakes
- confidence
- whether users still reopen source documents

## 7. Experiment F — Commercial Validation

Run only after core product use is demonstrated.

### B2C questions
- Is per-trip payment more acceptable than subscription?
- Is value high enough for NT$99–299/trip?
- Is travel frequency too low for retention?

### B2B questions
- Can operators keep spreadsheet authoring, or provide a supported export,
  without requiring PDF import?
- Does white-label runtime delivery reduce support burden?
- Is parser/review cost acceptable at operator scale?

No business model is currently validated.

## 8. Instrumentation requirements

Minimum event taxonomy for experiments:

```text
source_intake_started
source_intake_failed
parse_started
parse_failed
review_opened
review_correction
review_confirmed
overview_opened
day_opened
external_link_opened
source_reopened
runtime_surface_used
```

Instrumentation must not store raw itinerary contents or sensitive source evidence by default.

## 9. Evidence required for scope expansion

### Hosted Delivery
Requires:
External Markdown Benchmark #001 pass.

### Spreadsheet V0.2
Requires:
Markdown trust pipeline stable enough that a new Source Adapter can reuse it.

### Place Resolution
Requires:
evidence that unresolved places materially block Result usability.

### Today runtime
Requires:
evidence that travel-time execution value exceeds a static Day view.

### Weather / Flight / Live Transit
Requires:
travel-time usage evidence and a clear failure-safe runtime architecture.

### Account / cross-device ownership
Requires:
evidence that browser-local single-device ownership is insufficient.

## 10. Stop / kill criteria

Reassess or stop if:
- parser quality remains expensive to recover
- users prefer original files during travel
- Review burden cancels presentation value
- generalized sources require format-specific Result UIs
- runtime value depends on heavy recommendation/planning features
- users will not pay enough to cover parser/resolution costs
- B2C usage frequency cannot support the model and B2B does not validate

## 11. V0 workflow integrity checks

### Source intake and secondary capability reachability
- file upload and pasted Markdown are separate, operable input paths
- both normalize into the same required `TextSourceInput` schema
- every Source Adapter result passes the executable `UnifiedSourceDocument` schema and deterministic integrity gate before any provider call
- both require the same versioned `SemanticInterpretationResult` response schema
- pasted Markdown rejects empty input and produces stable Review locators
- provider/settings, credential controls, privacy guidance, Canonical JSON import, and sample/fallback are reachable through visible controls

### Minimum output gates
- schema-invalid provider output is rejected and never reaches Review
- a schema-valid but structurally insufficient result lists every known missing requirement and unparsed item
- insufficient results offer only bounded structural recovery or source replacement
- normal Review is unavailable until at least one supported trip/day structure and one linked itinerary entity exist
- no confidence percentage bypasses the structural gate
- Overview/Day remains unavailable until authoritative validation, confirmation, and persistence succeed

### Processing termination and model gate
- permanently pending reading, extraction, source validation, provider, and local response-validation fixtures leave the blocking modal through the configured application deadline
- `停止這次判讀` aborts the current identity, closes the modal, retains the selected source where technically possible, and preserves the confirmed trip
- success, insufficient, failure, timeout, and stop clear active timers; inactive late success/failure cannot advance or reopen the workflow
- production uses no accepted default until exact `gemini-3.5-flash` passes generated-schema, deterministic parser, and live External Markdown Benchmark #001 gates
- no moving alias or silent alternate-model fallback is observed

### Replacement transaction
Given Osaka is active and Seoul is the candidate:
- before confirmation, Osaka remains readable
- successful authoritative validation + persistence makes Seoul the single active trip
- after success, Home no longer shows Seoul as pending or Osaka as active
- success actions, Home, Overview, and Day resolve the same Seoul active trip
- validation failure, persistence failure, cancel, and stale async response preserve Osaka

### Result placement integrity
- every canonical entity has exactly one primary placement in its Day display tree
- relationship members retain supported time, place, modifiers, dependencies, notes, unresolved state, and actions without duplicate standalone full rendering
- incompatible overlapping primary groups block confirmation instead of being silently chosen by Result UI

### Canonical import safety
- invalid Canonical JSON never replaces the active trip
- unsupported Canonical schema versions are rejected
- imported non-trip data does not enter CanonicalTrip or persisted trip data

## 12. Reporting format

Every validation cycle should report:

```text
Hypothesis
Test fixture / participants
Observed result
Metric
Pass / Fail / Inconclusive
What changed
What remains unvalidated
Next gate
```

Do not report prototype aesthetics as product validation.
