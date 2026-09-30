## Why

The current repository proves the value of a hand-authored Osaka trip viewer, but it cannot yet turn an unfamiliar itinerary into trustworthy runtime data. Markdown V0 is ready to implement because the source, interpretation, Review, CanonicalTrip, Result UI, and benchmark contracts have now been documented and External Markdown Benchmark #001 provides a concrete acceptance gate.

## What Changes

- Add a Home-first intake flow for either one Markdown file or pasted Markdown text, normalized through the same versioned input contract while preserving structure, order, stable locators, links, and source coverage. Home reserves a non-blocking area for later optional fields without inventing required traveler inputs.
- Add one provider-neutral semantic interpretation boundary with a Gemini adapter for V0, versioned executable `SemanticInterpretationResult` and `ParsedTripDraft` schemas, deterministic validation, explicit `insufficient` outcomes, and no silent source omission.
- Add browser-local Gemini credential controls and accurate privacy disclosure. The key is device/browser scoped, explicitly clearable, excluded from trip data and publication data, and is not stored as plaintext in `localStorage`.
- Add an evidence-backed, centered single-column Review flow on mobile and desktop. Users can inspect source excerpts, warnings, ambiguities, unparsed content, and automatically interpreted items; correct supported fields and flags; add missed entities; delete false entities; and confirm only after authoritative validation.
- Add transactional local CanonicalTrip persistence and Canonical JSON import. A replacement candidate remains separate from the active confirmed trip until successful validation, confirmation, and persistence atomically replace it.
- Add deterministic Presentation Projection plus source-agnostic Overview and Day rendering that preserves time precision, flexible/optional/tentative content, alternatives and conditions, reservations/readiness, unresolved states, notes, transit relationships, and exact source-provided actions.
- Preserve the checked-in Osaka viewer and data as Golden Result #001 and an explicit sample/fallback path while building the generalized pipeline as a clean implementation.
- **BREAKING**: When no confirmed CanonicalTrip is persisted, the application opens Home instead of automatically treating the bundled Osaka fixture as the active trip.
- Gate completion on parser quality, Review recovery, Result usability, build/browser verification, and External Markdown Benchmark #001. Hosted Delivery remains blocked until the benchmark passes.
- Exclude spreadsheet intake, PDF intake/export, hosted publication, accounts, multi-trip storage, provider selection, generalized Today/runtime data, recommendations, planning, and replanning from this change.

## Capabilities

### New Capabilities

- `markdown-source-intake`: File and pasted-Markdown intake, normalization, extraction, structural preservation, source accounting, progress, failure recovery, and privacy guidance.
- `trip-semantic-interpretation`: Provider-neutral interpretation contracts, the V0 Gemini adapter and credential boundary, schema-valid draft/insufficient outcomes, deterministic validation, and conservative semantic preservation.
- `evidence-backed-trip-review`: Review evidence and findings, correction parity across mobile and desktop, user overrides, authoritative validation, confirmation, and candidate cancellation/recovery behavior.
- `local-canonical-trip`: Browser-local active-trip persistence, safe Canonical JSON import, one-active-plus-one-candidate state, and atomic replacement semantics.
- `trip-result-ui`: CanonicalTrip-only Presentation Projection and source-agnostic local Overview/Day behavior, including semantic fallbacks and Golden Viewer compatibility.

### Modified Capabilities

None. `openspec/specs/` contains no existing capability specifications; this change establishes the initial V0 contracts.

## Impact

- Reworks the React application entry flow and state model across Home, import progress, Review, confirmation success, Overview, and Day surfaces.
- Introduces versioned JSON Schema artifacts and domain modules for source documents, interpretation results, drafts, findings, CanonicalTrip validation, presentation projection, and persistence.
- Adds direct browser-to-Gemini parsing requests and a browser-local credential store; Gemini/model metadata and credentials remain outside CanonicalTrip and Canonical JSON.
- Adds local persistence through the approved browser storage boundary and must preserve existing Osaka checklist state and the static viewer as a reliable runtime fallback.
- Requires an annotated, sanitized External Markdown Benchmark #001 fixture and scoring harness before model pinning, automated fixtures for schema/validator/state behavior, plus mobile and desktop browser verification with no console errors.
- Does not add server storage, hosted URLs, publication APIs, or source-format-specific Result renderers.
