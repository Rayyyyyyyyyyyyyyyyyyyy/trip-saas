# Trip Runtime — Documentation Map

> Status: Current  
> Purpose: Define document ownership, terminology, and precedence for humans and agents.

## 1. Product shorthand

```text
Existing Itinerary
→ Structured Trip
→ Useful Runtime UI
```

Trip Runtime is not an AI trip planner. It converts an existing itinerary into confirmed structured trip data and renders it as a travel-time web interface.

## 2. Architecture shorthand

```text
Source Data
→ Source Adapter
→ UnifiedSourceDocument
→ Semantic Interpreter
→ SemanticInterpretationResult
→ Required Response / Reviewable Draft Gates
→ ParsedTripDraft
→ Deterministic Draft Validation
→ Review / Correction
→ Authoritative Candidate Validation
→ User Confirmation
→ Confirmed CanonicalTrip
→ Presentation Projection
→ Result UI
```

Hosted delivery is a separate capability:

```text
Confirmed CanonicalTrip
→ PublishedTripSnapshot
→ TripPublication
→ Read-only Hosted Viewer
```

## 3. Document authority

When documents conflict, use this precedence:

```text
01_CANONICAL_CONTEXT.md
> 03_PIPELINE_SPEC.md
> MVP_UI_SCOPE_REPORT.md
> 07_FUNCTIONAL_SPEC.md
> 06_RESULT_UI_SPEC.md
> 08_PRODUCT_VALIDATION_PLAN.md
> 05_V0_IMPLEMENTATION_PLAN.md
> TRIP_RUNTIME_SEMANTIC_INTERPRETER.md
> ../temp/02_INPUT_RESEARCH.md / ../temp/04_RESPONSE_PAGE_RESEARCH.md
```

Interpretation:

- `01` defines current product truth.
- `03` defines architectural contracts and ownership.
- `MVP_UI_SCOPE_REPORT` defines the active version/surface boundary.
- `07` defines observable product behavior.
- `06` defines presentation behavior.
- `08` defines validation order, metrics, and scope-expansion evidence.
- `05` defines execution order and gates.
- `TRIP_RUNTIME_SEMANTIC_INTERPRETER` defines interpreter execution rules subordinate to the product and pipeline contracts.
- `02` and `04` are evidence, not requirements.

`AGENTS.md` is an execution guardrail. It must reflect the current contracts above and must not invent new product decisions.

Domain terms are defined once in [`CONTEXT.md`](../CONTEXT.md). The glossary controls naming, not behavior; if a definition and a contract diverge, update the glossary to match the authoritative contract.

## 4. Current files

Contracts, decisions, and execution rules live in `spec/`. Research evidence lives in `temp/`.

Active implementation and acceptance are tracked by
[`complete-faithful-markdown-journey/tasks.md`](../openspec/changes/complete-faithful-markdown-journey/tasks.md).
Its [handoff](../openspec/changes/complete-faithful-markdown-journey/handoff.md)
links the full review, preserved evidence and predecessor open-task mappings.
Archived change completion is not product acceptance; current contracts,
implemented behavior and verified outcomes must be described separately.

### `../CONTEXT.md`
Agent-facing ubiquitous language.

Owns:
- canonical domain terms
- concise definitions
- discouraged aliases

Does not define scope, behavior, schemas, or implementation.

### `01_CANONICAL_CONTEXT.md`
Product-level Source of Truth.

Owns:
- product thesis
- boundaries
- invariants
- scope/version definitions
- roadmap
- validated/unvalidated assumptions
- kill questions

### `../temp/02_INPUT_RESEARCH.md`
Real-world itinerary source evidence.

Owns:
- sample inventory
- source archetypes
- observed semantics
- Core / Preserve / Defer evidence
- extraction implications

Does not define the final schema.

### `03_PIPELINE_SPEC.md`
Source-to-canonical processing contract.

Owns:
- stage responsibilities
- source adapter boundary
- semantic interpreter boundary
- validation
- review
- provenance
- resolution/enrichment
- failure behavior
- hosted-delivery boundary

### `../temp/04_RESPONSE_PAGE_RESEARCH.md`
Source-to-result representation evidence.

Owns:
- response reference pairs
- useful UI patterns
- semantic loss
- static webification vs runtime value

Does not define final components.

### `05_V0_IMPLEMENTATION_PLAN.md`
Execution plan.

Owns:
- implementation sequence
- P0/P1 scope
- acceptance gates
- test fixtures
- change boundaries

### `06_RESULT_UI_SPEC.md`
Result UI contract.

Owns:
- semantic presentation grammar
- Overview / Day / future Today boundaries
- hierarchy and state treatment
- presentation fallbacks
- working visual-system rules and revalidation criteria

### `07_FUNCTIONAL_SPEC.md`
Product behavior contract.

Owns:
- user actions
- system reactions
- state transitions
- validation behavior
- failure and recovery
- persistence behavior
- acceptance criteria

### `08_PRODUCT_VALIDATION_PLAN.md`
Product validation contract.

Owns:
- hypotheses
- experiments
- metrics
- pass/fail thresholds
- evidence required for scope expansion

### `MVP_UI_SCOPE_REPORT.md`
Scope boundary decision.

Owns the distinction between:
- Generalized Product V0
- Golden Viewer
- V0.1 Hosted Delivery
- later runtime capabilities

### `TRIP_RUNTIME_SEMANTIC_INTERPRETER.md`

Executable instruction source for Semantic Interpreter implementations.
`src/app/interpretTrip.ts` imports this file as build-time text and appends the
validated source JSON. Editing it changes the Gemini request after rebuild;
parser verification is required. Do not maintain a second handwritten prompt.

Subordinate to `01_CANONICAL_CONTEXT.md` and `03_PIPELINE_SPEC.md`.

### `AGENTS.md`
Repository execution rules for coding agents.

## 5. General documentation terminology

Trip Runtime domain terminology is defined in [`CONTEXT.md`](../CONTEXT.md). The following terms describe documentation governance.

### Source of Truth (SoT)
The authoritative representation for a domain.

Current trip truth:
`Confirmed CanonicalTrip`.

### Contract
A boundary whose inputs, outputs, ownership, and failure behavior must remain stable unless explicitly changed.

### Invariant
A rule that must always hold.

Example:
Renderer must not parse raw Markdown.

### Capability
A user-visible or system-visible ability.

Example:
Hosted Delivery, Place Resolution, Today Runtime.

### Surface
A user-facing UI area.

Example:
Upload, Review, Overview, Day.

### State
A defined condition in a workflow or entity lifecycle.

Example:
`parsing`, `needs_review`, `confirmed`, `unresolved`.

### Gate
A pass/fail checkpoint that blocks downstream scope.

Example:
External Markdown Benchmark #001 blocks Hosted Delivery implementation.

### Acceptance Criteria
Observable conditions required for a feature or change to be considered complete.

### Evidence
Research or test data that supports a decision. Evidence does not become a requirement automatically.

## 6. Documentation rules

- Update current files in place.
- Use Git history for version history.
- Do not create rolling `v0.6`, `v0.7` document copies.
- Do not duplicate the same rule across multiple files unless required for execution safety.
- If a rule changes, update the authoritative owner first, then downstream references.
- Research findings must be labeled as evidence, not product truth.
- Unvalidated assumptions must never be written as guaranteed behavior.

## 7. Current product gate

```text
25-sample evidence
↓
Minimal incomplete-capable Canonical Model
↓
Markdown Source Adapter
↓
Semantic Interpreter
↓
Deterministic Draft Validation
↓
Evidence-backed Review
↓
Authoritative Candidate Validation
↓
User Confirmation
↓
External Markdown Benchmark #001
↓
Hosted Delivery Lite
↓
Narrow Spreadsheet Travel Table
```

## 8. Highest-level success criterion

> During travel, the user should no longer need to reopen the original itinerary document.
