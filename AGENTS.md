# AGENTS.md

## Project purpose

This repository contains the personal live trip viewer for User #0001's real trip to Osaka, Uji, and Toei Kyoto Studio Park (太秦) from 2026-09-10 through 2026-09-15. That viewer is also the Golden Result used to validate the Markdown-to-runtime V0 pipeline.

The user will rely on this site while traveling. Treat correctness and graceful fallback as more important than demo impact. This is not an AI trip planner, a generic SaaS, or a fictional prototype. Pipeline work must preserve the Osaka viewer as a reliable fallback.

The product promise for this repository is:

> Show the traveler what they actually need to know now, without forcing them to reopen the source Markdown.

## Current scope

Build and maintain the personal viewer and the explicitly approved Markdown V0 pipeline:

- Pre-trip overview and countdown
- Today view based on real Japan time
- Daily itinerary timeline
- Flights, hotel, reservations, and tickets
- Interactive pre-trip checklist
- Google Maps and Tabelog links
- Mobile-first travel-day usability
- One Markdown source upload at a time
- Structure-preserving Markdown extraction
- Conservative AI parsing, deterministic validation, and focused review
- Browser-local confirmed trip persistence and canonical JSON import
- A Home-first setup flow for Gemini key setup, Markdown upload, canonical JSON import, format guidance, privacy notices, and a reserved optional-form area
- One persistent browser-local personal Gemini API key control for direct parsing requests

Hosted delivery is the gated V0.1 Netlify capability defined in `spec/01_CANONICAL_CONTEXT.md` and `spec/05_V0_IMPLEMENTATION_PLAN.md`. It MUST NOT be implemented until External Markdown Benchmark #001 passes its acceptance gate. The approved implementation order now prepares the narrow V0.2 Spreadsheet Travel Table slice before Hosted Delivery; support declaration still requires its three-layout live acceptance gate. V0.2 is limited to that slice; advanced spreadsheets, DOCX, screenshots, and mind maps remain later evidence-driven work. PDF input is not planned; later Result-to-PDF export is a separate archival feature. Do not add accounts, email recovery, cross-device ownership/editing, permanent hosted retention, recommendations, expenses, packing, social features, booking, or automatic replanning unless the user explicitly asks.

## Roadmap and change gates

The decided roadmap is:

```text
V0    Understand + Trust
      Source -> UnifiedSourceDocument -> SemanticInterpretationResult
      -> ParsedTripDraft
      -> deterministic validation -> evidence-backed Review
      -> Confirmed CanonicalTrip -> External Markdown Benchmark #001 gate

V0.2  Spreadsheet Travel Table (implemented before Hosted Delivery)
      narrow XLSX/CSV extraction, up to 19 visible sheets
      -> the same Draft / Review / Canonical pipeline
      -> three-layout live acceptance gate; XLS remains unaccepted

V0.1  Deliver (still gated by External Markdown Benchmark #001)
      CanonicalTrip -> PublishedTripSnapshot
      -> TripPublication -> read-only unlisted Viewer

Later Advanced spreadsheets and structured/visual sources

Only with evidence
      Account / cross-device ownership / multi-trip / billing
```

Current research state:

```text
Formal input samples                  26
External Markdown benchmarks           1
Response reference pairs               1
Cross-format semantic saturation       approaching, not declared
Markdown V0 evidence boundary          sufficient to implement
```

## Source-to-UI architecture invariants

Treat the current product architecture as:

```text
Source
→ source-specific extraction / reconstruction
→ UnifiedSourceDocument
→ executable source-document validation
→ Semantic Interpreter
→ SemanticInterpretationResult
→ ParsedTripDraft
→ Review
→ Confirmed CanonicalTrip
→ Presentation Projection
→ source-agnostic Result UI
```

Rules:

- A new input format should normally add or extend a Source Adapter, not create a new Renderer path.
- Do not flatten every source to plain text before interpretation. Preserve structural signals that carry intent, such as spreadsheet row/column/merge relationships, Markdown structure, and mind-map hierarchy.
- Every Source Adapter output must pass the versioned `UnifiedSourceDocument` JSON Schema plus deterministic identity, ordering, locator, reference, hierarchy, and size checks before any provider call. An unvalidated source document is not a valid interpretation input.
- Source content is tracked through stable source-neutral evidence-unit identities. Review consumes a bounded `ReviewEvidenceItem` projection rather than Markdown AST nodes, workbook objects, adapter-private types, or provider envelopes.
- Source-specific logic belongs in extraction / reconstruction. Do not leak source-type branching through CanonicalTrip into Result components.
- Renderer and Presentation Projection MUST NOT read raw Markdown, workbook objects, PDF page objects, extracted blocks, or UnifiedSourceDocument.
- Result UI templates are selected by travel semantics and runtime state, not by file format.
- CanonicalTrip describes what the trip means. Presentation Projection describes how confirmed semantics are presented. UI-only fields MUST NOT be written back into CanonicalTrip.
- Presentation Projection owns one ordered, non-overlapping Day display tree. Every canonical entity has exactly one primary placement per Day; summaries may reference it compactly, but Result must not render the same full entity both independently and inside a relationship group.

Implementation status matters: the rules above are approved architecture
contracts, not a claim that every boundary is already enforced in the current
code. The verified baseline already has Gemini per-attempt timeout and
cancellation, bounded `429` retry, safe provider/output failure handling, local
response/coverage/Reviewable Draft gates, modal release for the tested timeout
and malformed-output paths, selected-source retry, and active-trip protection.
A successful Gemini result enters Review; it does not render or replace the
active trip until confirmation, authoritative validation, and persistence
commit succeed.

The archived `harden-source-to-render-boundaries` implementation has locally verified
source-document input gates, a provider-neutral interpretation module, sole
application workflow ownership, stage/overall watchdogs, visible
`停止這次判讀`, inactive-late-result rejection, unique Result primary placement,
and explicit Golden sample routing. Local test evidence is recorded in
`openspec/changes/archive/2026-09-07-harden-source-to-render-boundaries/validation.md`; this is not
a deployment claim. Exact `gemini-3.5-flash` remains historical failed benchmark
evidence. On 2026-10-07 the user explicitly chose to retain exact
`gemini-3.5-flash` after reporting `gemini-3.8-flash` rate limiting/instability.
The generated-schema, deterministic-fixture and key-backed live External
Markdown Benchmark #001 gates must be rerun for the current response-v2 pipeline.
Production has no accepted no-override default, and Hosted Delivery remains gated.

The active implementation/acceptance owner is `complete-faithful-markdown-journey`.
Read its `handoff.md` for the eight review categories and eight transferred open
tasks. Archive means scope transferred, not passed. The successor must reconcile
unknown-value confirmation, undated entity placement, Canonical semantic checks,
minimal provenance compatibility, actual-entry CSP, fidelity assessment and
Review/Result usefulness. These are planned corrections, not shipped behavior.
Its 2026-09-09 follow-up section additionally owns the single-model path,
prepared-source retry identity and candidate-aware Review gates through tasks
4.9–4.13. These corrections are locally implemented as of 2026-10-12, including
source-linked partial-date/raw-clock checks, session-only user correction and
deletion records, and bounded `12點`/clock-format context handling. This is not
a deployment or live acceptance claim; fresh browser verification is not run
under the user's no-browser rule. See its `validation.md` for current evidence.
Source-absent facts require no invention or compulsory completion; supported
unknowns and ambiguous expressions must remain readable through confirmation
and reload. Structural invalidity and genuine conflicts still require validation.

The local spreadsheet implementation owner is `add-spreadsheet-intake-and-result-clarity`; read its `handoff.md` and `validation.md`. SheetJS CE 0.20.3 is pinned to the official tarball and stays inside the adapter, dynamically loaded for spreadsheet work. The shared prepared-source retry prerequisite belongs to `complete-faithful-markdown-journey` task 4.10. Source/schema/unit/UI checks and local workbook extraction are not live semantic acceptance; supported-format guidance remains gated. New interpretation requests use `semantic-interpretation-result.v2` with locally expanded range coverage; historical v1 evidence remains historical. Canonical writes use v3 with supporting groups and explicit v1/v2 decoding.

Sample #23 is `External Markdown Benchmark #001` and is the current Markdown acceptance fixture.

Sample #24 is `Busan.xlsx`. It is also paired with an independently created mobile Web result:

```text
Busan.xlsx
→ https://bbmddt.github.io/busan-travel/
```

That pair is tracked separately as `Response Reference Pair #001`. Input semantics belong in Input Research; source-to-result rendering evidence belongs in Response Page Research. Do not count the Result Web as another input sample.

Generalized Product V0 MUST end at a locally confirmed and renderable CanonicalTrip. Do not add `PublishedTripSnapshot`, `TripPublication`, hosted URL, recovery, expiry, account, or server implementation tasks to that scope.

Before any Hosted Delivery implementation begins, External Markdown Benchmark #001 (Sample #23, the first unfamiliar user-authored Markdown fixture) MUST demonstrate:

- Zero missing critical events in the original pre-Review draft.
- Zero invented critical events in the original pre-Review draft.
- Zero unsupported exact critical dates, times, or places.
- Every fixture-annotated ambiguity is surfaced for Review.
- The corrected CanonicalTrip passes runtime validation and renders through the existing viewer.

Sanitized benchmark fixtures may retain separate ParsedTripDraft, findings, corrections, and Confirmed CanonicalTrip artifacts so Parser Quality can be distinguished from Review Recovery Quality. Real production ReviewSession data remains memory-only and MUST NOT be retained as benchmark material.

## Hosted Delivery invariants

For V0.1 Hosted Delivery Lite:

- `CanonicalTrip` is the confirmed editable truth in the owner's browser.
- `PublishedTripSnapshot` is an immutable, schema-versioned, viewer-safe payload.
- `TripPublication` controls only where, whether, and until when a trip is published. It MUST NOT contain title, dates, places, events, reservations, readiness, or viewer settings.
- Recovery verification belongs in a separate security record and only a one-way verifier is stored server-side.
- Publish projection MUST be a positive allowlist. Never serialize CanonicalTrip and remove private fields with a blacklist, and never assume browser-local trip data is safe to publish.
- Republish creates and validates a new snapshot, atomically swaps `currentSnapshotId`, and only then deletes the superseded snapshot. Lite retains no rollback history.
- The URL is unlisted, not authenticated or private. Anyone with the link can read it; there is no public listing or indexing.
- The hosted viewer is read-only. Published readiness is snapshot state for reservation, ticket, document, payment, or another trip dependency; it is not event completion and cannot be mutated through the viewer URL.
- Management uses a one-time copy/download recovery secret for republish, revoke, delete, and bounded expiry extension. Lite has no email recovery.
- Every publication has bounded expiry. Delete, revoke cleanup, or expiry cascades to its snapshot and credential data; Lite does not promise permanent retention.
- Hosted storage MUST NOT receive raw uploads, UnifiedSourceDocument/evidence units, source excerpts, ReviewSession evidence, parser responses, Gemini keys, or production parser benchmark artifacts.
- Hosted Delivery Lite runs as one Netlify application for many independent publications. Travelers/viewers are not Netlify team members; isolation is by unique slug, immutable snapshot, and separate one-way recovery verifier.
- Publish/manage Functions use schema validation, allowlist projection, conditional writes, payload limits, and rate limits. All hosted usage consumes the product owner's Netlify quota.

## Technology

- React 19
- Vite 7
- Material UI for interactive components and accessibility behavior
- Tailwind CSS 4 as the primary styling surface for layout, spacing, responsive composition, static component visuals, and project design tokens
- Browser `localStorage` for personal checklist persistence
- Browser `localStorage` plus IndexedDB for explicitly approved local trip and personal API-key storage
- Netlify static hosting through `netlify.toml` and `public/_headers` for the current Golden Viewer
- Netlify Functions and Blob storage remain gated Hosted Delivery Lite capabilities; the static Golden deployment does not enable them

Prefer library and framework components over hand-built equivalents. Do not reintroduce a parallel handcrafted CSS component system.

Tailwind classes own static layout and visual styling. Use MUI `sx` only as a
secondary mechanism for MUI internal selectors, theme-aware component states,
or genuinely dynamic values that Tailwind cannot express cleanly. Never define
the same CSS property in both `className` and `sx` on one element.

## Entry flow and Gemini behavior

- When no persisted confirmed CanonicalTrip exists, the application opens a mobile-first Home page rather than treating the bundled Osaka fixture as the active trip.
- Home contains personal Gemini API-key controls, one Markdown upload target, canonical JSON import, upload-format/privacy guidance, and space for future optional form fields. Do not invent required traveler fields before their purpose is approved.
- When a persisted confirmed CanonicalTrip exists, reload opens the existing itinerary Viewer directly. The Gemini API key is a parsing setting, not a prerequisite for reading a confirmed trip.
- Starting a replacement import keeps the current confirmed trip intact. Cancellation, validation failure, extraction failure, or provider failure returns to that trip; only successful Review confirmation atomically replaces it.
- The bundled Osaka trip remains an explicit safe sample/fallback path, but its presence MUST NOT cause the application to bypass Home.
- V0 uses one Gemini adapter behind the provider-neutral `parseTrip(request)` contract and the same ParsedTripDraft schema, deterministic validation, Review, and CanonicalTrip confirmation path. Other providers/models are later optimization scope. Do not add a plugin system or speculative provider registry.
- The Gemini credential persists browser-locally, survives reload on the same browser/device, and has an explicit clear action. Do not store it as plaintext in `localStorage`, sync it, or send it to hosted storage.
- Gemini requests use the `x-goog-api-key` header; API keys MUST NOT appear in URLs. Provider/model selection and response metadata MUST NOT enter CanonicalTrip or persisted trip data.
- Exact `gemini-3.5-flash` is the user-selected V0 default candidate (2026-10-07). Production remains without an accepted default until that exact model passes the generated-schema checks, deterministic parser fixtures, and live External Markdown Benchmark #001. After acceptance, use the exact selected ID rather than a moving alias. Changing the model requires rerunning the same gates; do not silently fall back to another model.
- The application workflow, not the modal component or Gemini adapter, owns candidate progress and terminal state. Reading, extraction, source validation, provider work, and local response validation must have configured application-level stage/overall deadlines in addition to the provider attempt deadline.
- While processing, accidental Escape/backdrop dismissal may remain disabled, but the blocking modal must expose an explicit `停止這次判讀` action. Success, insufficient, failure, timeout, and stop must all clear timers, close the modal, preserve the selected source where technically possible, and leave the current confirmed trip readable. Late results from inactive session/request identities are ignored.
- V0 may import a valid Canonical JSON file, but it does not provide Canonical JSON export. Browser-local API keys do not sync; each browser/device requires its own explicitly supplied key.
- Clearing trip data returns to Home without silently clearing the Gemini key. Clearing the key or all local data requires a separate explicit action whose scope is stated before confirmation.

## Documentation maintenance

The project documentation has been consolidated into fixed current filenames.

Do not create rolling files such as:

```text
02_INPUT_RESEARCH_v0.6.md
02_INPUT_RESEARCH_v0.7.md
```

Update the current document in place and use Git history for version history.

Current documentation roles:

```text
CONTEXT.md                                   agent-facing ubiquitous language
spec/00_README.md                            documentation map / maintenance rules
spec/01_CANONICAL_CONTEXT.md                 product-level current truth
temp/02_INPUT_RESEARCH.md                    real-world source evidence
spec/03_PIPELINE_SPEC.md                     source-to-canonical pipeline
temp/04_RESPONSE_PAGE_RESEARCH.md            source-to-result / Result UI evidence
spec/05_V0_IMPLEMENTATION_PLAN.md            implementation order and acceptance gates
spec/06_RESULT_UI_SPEC.md                    Result UI contract
spec/07_FUNCTIONAL_SPEC.md                   observable product behavior
spec/08_PRODUCT_VALIDATION_PLAN.md           validation order, metrics, and gates
spec/MVP_UI_SCOPE_REPORT.md                  active version and surface boundaries
spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md    interpreter execution rules
```

Keep Input Research and Response Page Research separate. A source document can be an input sample while its existing rendered Web can form a response-reference pair.

## Source-of-truth files

Use these files as product and itinerary references:

- `CONTEXT.md`: canonical Trip Runtime domain terms and discouraged aliases; it defines naming, not product behavior
- `spec/00_README.md`: current documentation map, authority order, and maintenance rules
- `spec/01_CANONICAL_CONTEXT.md`: current product decisions, scope, roadmap, and validated / unvalidated assumptions
- `temp/02_INPUT_RESEARCH.md`: current real-world input evidence from 26 formal samples; the sample number is not a participant count, and the corresponding source files are under `temp/Odata/`
- `spec/03_PIPELINE_SPEC.md`: source-to-canonical pipeline contract
- `temp/04_RESPONSE_PAGE_RESEARCH.md`: current Source → Result / Response Page evidence; currently contains Response Reference Pair #001 (`Busan.xlsx` → Busan mobile Web)
- `spec/05_V0_IMPLEMENTATION_PLAN.md`: current implementation order, parser/review work, and acceptance gates
- `spec/06_RESULT_UI_SPEC.md`: current source-agnostic Result UI contract
- `spec/07_FUNCTIONAL_SPEC.md`: user actions, system reactions, state transitions, failure behavior, and acceptance criteria
- `spec/08_PRODUCT_VALIDATION_PLAN.md`: hypotheses, experiments, metrics, and scope-expansion evidence
- `spec/MVP_UI_SCOPE_REPORT.md`: current Generalized V0, Golden Viewer, Hosted Delivery, and later-runtime scope boundary
- `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md`: Semantic Interpreter execution rules subordinate to Canonical Context and Pipeline Spec
- `temp/Odata/00 我/我的最初行程表.md`: canonical human-readable itinerary for Golden Input #001
- `temp/trip_places_google_maps.md`: authoritative Google Maps URLs
- `src/tripData.ts`: structured runtime data consumed by the Osaka viewer

When a map URL exists in `temp/trip_places_google_maps.md` or the canonical itinerary, store and use that exact URL. Do not reconstruct, normalize, or guess a different query in the UI.

## Current parser evidence

Markdown V0 must account for evidence from Sample #23:

- Markdown AST is structural evidence, not semantic truth.
- `A > B > C` may encode itinerary sequence rather than blockquote semantics.
- One source can mix `11:55`, `5.30`, `12點`, and `七點`.
- A partially structured entity such as a flight may be identifiable even when airline, flight number, airport pair, or row-level date is absent.
- Address-first places are valid unresolved places.
- Missing relative Markdown image assets must not fail the whole parse.
- One paragraph or line may contain multiple semantic units.
- Free Time and intentionally vague meals are first-class itinerary intent, not missing data.

Spreadsheet V0.2 / later evidence from Sample #24 adds:

- Open-ended time such as `18:30~` is valid and must normalize to a known start with unknown end.
- A parent activity can contain an internal timetable; venue programs must not automatically become top-level day events.
- Booking release rules such as “four weeks before, Tuesday 06:00” are not event times.
- Pass / ticket / reservation metadata may be structured alongside an event and must not collapse into one boolean.

Keep these distinctions in parser / validator behavior even if the first implementation stores some of them only as Preserve semantics.

## Runtime integrity

- All live date and time decisions must use `Asia/Tokyo`.
- Before the trip, Today shows countdown and the next confirmed event. It must not display a fake `NOW`.
- During 2026-09-10 through 2026-09-15, Today automatically selects the actual Japan date.
- After the trip, show a completed state while keeping the itinerary accessible.
- Refresh runtime state at least once per minute so an open page can cross time or date boundaries.
- Only label an event `NOW` when the source data supports that conclusion.
- If an event time is missing or described as flexible, say so. Never invent precision.
- Runtime/API failure must not make the static itinerary unusable.

## Checklist and reservation behavior

- Checklist state persists under the active trip-scoped browser key; the legacy `osaka-trip-todos` key is migrated and kept synchronized so existing Osaka state is not lost.
- Checklist items and reservation rows are linked by stable `todoId` values.
- Changing a checkbox must immediately update the corresponding reservation status.
- A checked item shows its confirmed/reserved/ready status.
- An unchecked item shows `Action needed` or its explicit pending status.
- USJ tickets default to unconfirmed until the user checks them.

## UI principles

- `06_RESULT_UI_SPEC.md` is the current visual contract. Its exact primary color and font-family tokens are frozen from the September 2026 newspaper-style mobile/desktop prototype under `temp/Mobile app and web design/`; component metrics and interaction mechanics still require implementation validation.
- Do not let an agent replace the frozen prototype token system without an explicit accessibility-driven or user-approved revision.
- A source format MUST NOT determine Result UI appearance. Presentation is driven by Canonical semantics and runtime priority.
- Mobile first; assume the user is walking, standing on a train platform, or checking the phone one-handed.
- Prioritize Today, Now, Next, leave-by, directions, and reservations.
- Preserve flexible and optional travel. Do not turn leisure into task completion.
- Optional places belong under `IF YOU STILL HAVE ENERGY`, outside the main timeline.
- Transit is connective tissue between events, not a large event card.
- Use a Chinese-newspaper editorial, white-paper/black-ink, utility-focused visual style. Use type, whitespace, and hairlines instead of cards, rounded containers, shadows, or large semantic color fills.
- Avoid dashboard density, travel SaaS gradients, excessive photography, and card-everything layouts.
- External map and restaurant links open in a new tab with safe `rel` attributes.
- Response Reference Pair #001 is an evidence-backed baseline for mobile webification: sticky day navigation, day themes, secondary notes, reservation / Pass labels, and supporting-image appendices are useful patterns. Exact time placement and surface treatment are governed by the current `06_RESULT_UI_SPEC.md`, not copied from the reference page.
- Do not merely reproduce that static baseline. Trip Runtime must preserve Alternative / Conditional / Flexible semantics rather than flattening them into display strings.
- Hard runtime constraints such as “arrive by 16:00 for a 16:30 booking” should be eligible for NEXT / Leave-by treatment instead of remaining buried in notes.
- Supporting images, timetables, venue maps, and instructions may belong on a secondary surface rather than inside every event card.

## Development workflow

Install and run locally:

```sh
npm install
npm run dev
```

Before handing off any code change:

```sh
npm run build
git diff --check
```

Before handing off specification changes, verify that references point to current files under `spec/` and that research evidence remains under `temp/`.

For UI or interaction changes, verify the relevant flow in a browser at both a mobile breakpoint and a normal desktop viewport. Check the browser console for errors.

## Git and repository hygiene

- Do not commit `node_modules/` or `dist/`.
- Preserve user-authored changes and unrelated untracked directories.
- `.claude/`, `.codex/`, and `.idea/` are not part of the Trip Viewer unless the user explicitly places them in scope. `spec/` contains current product contracts and execution plans; `temp/` contains research evidence, fixtures, schemas, and historical references.
- Do not commit or push unless the user asks.
- The Netlify deployment configuration must build with `npm ci` and `npm run build`, then publish `dist/`.

## Definition of done

A change is complete when:

- It reflects the real itinerary rather than demo assumptions.
- The traveler can understand the key information quickly on mobile.
- Interactive state is consistent across related UI surfaces and survives reload when expected.
- Exact source-provided links and statuses are preserved.
- The production build passes.
- The changed interaction has been verified in the browser.
- Parser changes that can affect Markdown interpretation have been checked against External Markdown Benchmark #001 and its annotated ambiguities.
- Result rendering changes must not regress the semantic distinctions identified in Input Research merely to match a prettier static response-page baseline.
- Source-adapter changes prove invalid/unvalidated `UnifiedSourceDocument` values cannot invoke Gemini.
- Processing-workflow changes prove pending stages terminate through configured deadlines or `停止這次判讀`, clear timers, ignore inactive late results, and preserve the confirmed trip.
- Model-default changes pass the exact-model schema/parser/live benchmark gates and do not introduce a moving alias or silent fallback.
- Result placement changes prove one primary placement per entity and complete relationship-member semantics without duplicate full rendering.
