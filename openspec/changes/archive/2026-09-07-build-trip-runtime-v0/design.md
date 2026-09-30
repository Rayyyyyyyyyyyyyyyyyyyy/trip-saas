## Context

The checked-in React/Vite application is a reliable, hand-authored Osaka viewer. Its UI, runtime helpers, checklist persistence, fixture data, and navigation initially lived mostly in `src/main.tsx` and `src/tripData.ts`. Generalized Product V0 adds a second concern: accepting untrusted Markdown, interpreting it through Gemini, validating and reviewing a candidate, persisting a confirmed CanonicalTrip, and rendering that trip without allowing source or provider details to leak into Result UI.

This is a cross-cutting change with new data contracts, an external provider boundary, security-sensitive browser persistence, asynchronous workflow state, and several responsive surfaces. The implementation must preserve the Osaka viewer as a real-use fallback while replacing its implicit-fixture entry behavior with a Home-first product flow.

The design follows the repository's React 19, Vite 7, TypeScript, Material UI, and Tailwind CSS conventions. Active application, test, fixture-harness, and tool-configuration code uses `.ts`/`.tsx` with strict no-emit checking before production builds; research/reference code under `temp/` remains source evidence rather than an application migration target. It applies a `Reuse → Compose → Extract → Abstract` preference: reuse framework/design-system primitives, compose semantic UI parts, extract independently testable domain rules and repeated stateful behavior, and introduce adapters only at real external boundaries.

## Goals / Non-Goals

**Goals:**

- Establish one source-to-canonical pipeline with explicit contracts and no silent source loss.
- Keep untrusted source/provider shapes behind adapters and expose validated application models to the rest of the app.
- Give workflow and active-trip state one owner, with derived UI states instead of synchronized copies.
- Keep meaningful validation, reconciliation, confirmation, projection, and replacement rules independent of React rendering.
- Implement mobile-first Home, Review, Overview, and Day surfaces with desktop composition parity and accessible MUI behavior.
- Preserve the current Osaka data/checklist behavior and provide an explicit Golden sample/fallback path.
- Make the pipeline testable against schema fixtures, state-transition fixtures, semantic stress fixtures, and External Markdown Benchmark #001.

**Non-Goals:**

- A generic plugin/provider registry, server proxy, account system, hosted publication, or cross-device synchronization.
- Spreadsheet or PDF intake, PDF export, generalized Today/runtime data, place resolution, or live APIs.
- Rebuilding Material UI controls, creating a parallel CSS component system, or reorganizing unrelated repository code.
- Persisting raw uploads, UnifiedSourceDocument, full provider responses, source excerpts, or production ReviewSession data.
- Selecting a production Gemini model before the required acceptance fixtures pass.

## Decisions

### 1. Use feature ownership around a small domain core

The application will move out of the single-file UI incrementally into explicit ownership boundaries:

```text
src/
  app/                    application shell and workflow coordination
  domain/trip/            schemas, canonical types, validation, confirmation
  features/import/        Home, Markdown intake, progress, recovery
  features/review/        evidence-backed correction and confirmation UI
  features/result/        Presentation Projection, Overview, Day
  integrations/gemini/    Gemini request/response adapter
  persistence/            trip, credential, and legacy checklist storage
  fixtures/golden/        Osaka Canonical fixture and compatibility data
```

Names may be adjusted to existing conventions during implementation, but ownership must remain semantic. No generic `utils`, `helpers`, `common`, or catch-all shared component folder will be created. Feature-specific code stays with its feature until an actual shared contract exists.

Alternatives considered:

- **Keep extending `main.tsx`:** lowest initial movement, but it would mix untrusted I/O, business rules, persistence, workflow state, and rendering in one test-resistant boundary.
- **Introduce a fully layered framework or global service container:** more structure than the current focused V0 needs and would turn implementation into an architecture project.

### 2. Define executable contracts before provider and UI work

Versioned JSON Schema files are the runtime authority for `TextSourceInput`, `SemanticInterpretationResult`, `ParsedTripDraft`, and `CanonicalTrip`. The full product schemas require explicit members/nullability, reject unknown members, encode the `draft | insufficient` discriminator, and validate stable references and supported enums.

Ajv will perform local deterministic schema validation. Domain validation functions then check rules that JSON Schema cannot fully express, including source-ID agreement, coverage totals, uniqueness, cross-references, trip-range consistency, duplicate candidates, relationship validity, and minimum Reviewable/Renderable gates.

Gemini receives a provider-compatible structured-output projection derived from the same contract. Provider limitations may remove unsupported validation keywords, but may not change field names, required fields, types, enums, or result semantics. The complete local schema remains authoritative after every provider response.

Alternatives considered:

- **Trust Gemini structured output alone:** syntax conformance does not prove source coverage, relationship validity, or conservative semantics.
- **Use separate Markdown/provider schemas:** would leak input/provider differences downstream and make future adapters create parallel product models.
- **Use TypeScript types only:** compile-time types cannot validate untrusted source, provider, import, or persisted data. TypeScript defines internal compile-time contracts while the versioned JSON Schemas and deterministic validators remain runtime authority.

### 3. Keep each external representation behind a narrow adapter

The Markdown Source Adapter accepts only validated `TextSourceInput` and emits `UnifiedSourceDocument`. It uses a Markdown parser that preserves ordered blocks, hierarchy, links, GFM table structure where present, raw text, and deterministic source locators. A missing relative image becomes evidence/finding data and does not fail the document. Markdown AST node types remain extraction evidence, not semantic truth.

The Gemini adapter implements one provider-neutral function:

```text
parseTrip({ document, schemaVersion, signal })
  → SemanticInterpretationResult
```

It owns Gemini authentication, request construction, token preflight, structured-output projection, response extraction, provider error translation, bounded `429` retry/backoff, and cancellation. It sends the key through `x-goog-api-key`, never a URL, and does not expose raw Gemini response types outside the integration module. There is no provider fallback.

Alternatives considered:

- **Flatten Markdown to plain text:** loses hierarchy, links, and locator evidence needed for interpretation and Review.
- **Let React components call Gemini directly:** spreads vendor types, credentials, retries, and failure handling across UI code.
- **Add a provider registry now:** V0 has one real adapter; a registry would be speculative abstraction.

### 4. Model workflow as one reducer with explicit transactions

An application-level reducer owns the import/review lifecycle:

```text
idle → validating_source → extracting → parsing
→ validating_draft → review_required → confirming
→ confirmed | failed | cancelled
```

The reducer holds the current candidate session, findings, Review edits, request identity, and failure/recovery state. Components dispatch events and render derived selectors; they do not keep synchronized copies of candidate or active-trip state. Local component state remains local for transient presentation concerns such as an expanded excerpt or an unsaved input control.

Every asynchronous run receives a monotonically unique request/session ID plus an `AbortController`. Reducer transitions ignore responses that do not match the current session. Closing a surface does not imply cancellation unless the action explicitly dispatches cancel.

The active confirmed trip is loaded through one repository API and is never overwritten during intake, parsing, Review, or failed confirmation. Confirmation performs:

```text
build candidate CanonicalTrip
→ authoritative validation
→ persist in one IndexedDB transaction
→ update active pointer
→ clear candidate session
```

Only the completed transaction produces the confirmed success state.

Alternatives considered:

- **Independent `useState` values in each screen:** risks impossible combinations, stale async advancement, and divergent active-trip identities.
- **Add a global state library:** React reducer/context is sufficient for one coordinated V0 workflow; a new store dependency is not justified yet.
- **Persist ReviewSession/candidate state:** conflicts with the session-scoped privacy boundary and creates migration/security work not required for V0.

### 5. Separate storage by responsibility and state security limits honestly

Persistence APIs are separate and explicitly named:

- `confirmedTripRepository`: versioned CanonicalTrip records and active-trip identity in IndexedDB.
- `geminiCredentialRepository`: Gemini credential ciphertext and key material in browser-local storage, isolated from trip records.
- `checklistRepository`: trip-scoped checklist state plus migration/synchronization of the legacy `osaka-trip-todos` key.

The Gemini credential will not be plaintext in `localStorage`. Before the persistent credential repository is implemented, a blocking compatibility/security spike must verify persistent non-exportable Web Crypto key behavior on the supported Chrome and Safari targets, define the compliant unsupported-browser behavior, and record the resulting storage contract. The selected implementation will use Web Crypto and IndexedDB where supported, store only ciphertext as credential data, and provide an explicit clear operation. It must never downgrade to plaintext persistence. This protects against casual storage inspection and some backup leakage; it does not protect against same-origin script compromise. UI privacy/security wording must state that the key is browser/device scoped and used for direct Gemini requests without claiming hardware-grade secret storage.

The same gate must define and test a deployment Content Security Policy compatible with the direct Gemini endpoint, verify that request/error instrumentation redacts credentials and source content, and confirm that no analytics or logging path receives the key. Dependent credential and provider tasks cannot begin until this decision is recorded in the design or an implementation decision note.

Trip clearing, credential clearing, and clearing all local data remain distinct operations. Invalid or unsupported persisted CanonicalTrip records do not enter Viewer state and surface a recovery path. Canonical JSON import parses and validates an allowlisted CanonicalTrip shape before the same transactional activation path; unrelated imported fields are discarded/rejected according to the schema and never persisted.

Alternatives considered:

- **Plain localStorage for every record:** cannot provide atomic replacement and violates the approved credential boundary.
- **One shared persisted app-state blob:** couples unrelated lifecycles and makes partial clearing, migration, and failure recovery unsafe.
- **Server-side credential storage:** outside V0 and contradicts direct browser-to-Gemini ownership.

### 6. Keep canonical, presentation, and rendering models distinct

Pure domain functions convert validated Review state into candidate CanonicalTrip and validated CanonicalTrip into a Presentation Projection. Result components consume only projection records plus separately supplied runtime data where a supported Golden-only surface needs it.

```text
Review state + user overrides
→ candidate builder
→ authoritative validator
→ CanonicalTrip
→ Presentation Projection
→ semantic Result templates
```

No Result component may read raw Markdown, source blocks, Review excerpts, Gemini metadata, or ParsedTripDraft. Projection is source-agnostic and maps semantic meaning to presentation roles such as fixed anchor, transit connector, optional disclosure, flexible space, readiness, relationship group, supporting reference, and unresolved state. It never mutates or writes UI fields back to CanonicalTrip.

The Osaka Golden data will be represented as a checked-in valid CanonicalTrip fixture for shared Overview/Day projection. Golden-only Today/checklist/reservation behavior remains explicitly isolated and does not become generalized V0 navigation. A temporary legacy fixture adapter is permitted only as a migration seam and must not become a second renderer contract.

Alternatives considered:

- **Render ParsedTripDraft directly:** bypasses the Review trust boundary.
- **Put component variants/colors into CanonicalTrip:** couples durable meaning to one UI implementation.
- **Maintain format-specific Result components:** violates source-agnostic rendering and duplicates semantics.

### 7. Compose UI from existing primitives and semantic templates

Material UI owns accessible interactive behavior: buttons, file/input controls, tabs, dialogs/drawers, disclosure, feedback, focus handling, and form controls. Tailwind is the primary styling surface for static layout, spacing, responsive composition, component visuals, and approved project tokens. MUI `sx` is secondary and is reserved for MUI internal selectors, theme-aware component states, or genuinely dynamic values that Tailwind cannot express cleanly. A component must not declare the same CSS property in both `className` and `sx`, because injection order is not an architectural ownership boundary. MUI theme values and Tailwind tokens will be sourced from the same frozen semantic palette/typography definitions so components do not drift into parallel visual systems. Handwritten CSS remains limited to base/global behavior or cases neither tool expresses cleanly.

UI extraction follows semantic reuse:

- Home and Review reuse MUI controls, but do not share a generic card merely because surfaces look alike.
- Result templates such as time treatment, transit connector, optional group, relationship group, readiness metadata, and external action are reusable because they express stable domain semantics.
- Mobile and desktop use the same data and actions. Responsive composition moves semantic regions; it does not fork capabilities or state.
- Review uses one centered reading flow at both widths, with a read-only source excerpt before each material correction/finding surface.
- Overview/Day use the approved mobile/desktop compositions, 44px mobile targets, keyboard-operable date navigation, safe external links, and explicit loading/empty/error states.

Generalized V0 navigation will use application screen state rather than adding a router dependency. Navigation actions are centralized in the app shell, and Day selection has one active-day source of truth. Hosted URL/history design remains a separate V0.1 architecture decision.

Alternatives considered:

- **Build custom interactive controls:** duplicates Material UI accessibility behavior.
- **Use MUI `sx`, Tailwind, and bespoke CSS interchangeably without ownership:** produces conflicting tokens, injection-order-dependent behavior, and hard-to-maintain overrides.
- **Add routing now:** Generalized V0 has no deep-link/share requirement; local screen state is the smallest cohesive choice.

### 8. Add tests at domain, adapter, workflow, and browser boundaries

Vitest will cover pure schemas, validators, adapters, projection, storage migrations, and reducer transitions. React Testing Library will cover user-visible component behavior and accessibility without asserting implementation details. Playwright will verify the complete file/paste → Review → confirm → Overview/Day flow, replacement failure/cancel/stale-response paths, mobile and desktop layouts, keyboard navigation, overflow, safe links, and console errors.

Gemini tests use captured/sanitized fixtures or a narrow mock boundary; automated tests must not require a personal key or retain production ReviewSession/provider payloads. Before provider implementation, External Markdown Benchmark #001 receives a checked-in sanitized source fixture, explicit critical-event/ambiguity annotations, expected coverage references, and a repeatable scoring/reporting harness. Model acceptance is a separately controlled parser-quality run against that frozen benchmark contract. The exact stable model ID is pinned only after it passes; the completed application reruns the same benchmark during final acceptance.

Alternatives considered:

- **Browser tests only:** slow and poor at isolating schema, validation, and transaction failures.
- **Unit tests only:** cannot validate responsive composition, focus, upload controls, or the full replacement workflow.

### 9. Require planning traceability before implementation

OpenSpec structural validity is necessary but does not prove that requirements, unresolved architecture decisions, task dependencies, and release gates are logically complete. Before apply work begins, every delta requirement must map to at least one implementation task and one verification task; every design open question that blocks safe implementation must become an earlier decision task; and Golden Viewer regression checks must appear before and between risky migration milestones rather than only at final acceptance.

The traceability audit also checks that benchmark preparation precedes model pinning, security feasibility precedes credential implementation, and negative scope statements are expressed as measurable diff-based audits rather than unfinishable checklist reminders.

## Risks / Trade-offs

- **[Large vertical scope could destabilize the real Osaka viewer]** → Implement behind the new Home/workflow boundary in vertical slices, preserve the Golden fixture and checklist migration tests, and keep the deployed static itinerary usable until the generalized path passes browser checks.
- **[Gemini structured-output support is narrower than the product schema]** → Maintain one authoritative local schema plus a contract-preserving provider projection; reject locally before Review when the full contract fails.
- **[Direct browser credentials remain exposed to same-origin compromise]** → Use no plaintext localStorage, Web Crypto/IndexedDB isolation, no logging/analytics transfer, explicit clear controls, accurate limitations, dependency review, and a restrictive deployment policy where practical.
- **[Rate limits, cost, latency, or model behavior can block parsing]** → Preflight size/token limits, show truthful progress, use cancellation and bounded retry for retryable failures, preserve the active trip, and provide no silent provider fallback.
- **[Complete source accounting increases response size and Review burden]** → Keep locators compact, preserve supporting content without promoting it, group non-material evidence, and require explicit `insufficient` rather than fabricated completeness.
- **[IndexedDB availability or migration can fail]** → Version repositories, validate every read, preserve the active record until the replacement transaction commits, surface recovery, and retain the Golden fallback.
- **[MUI and Tailwind styling can diverge]** → Centralize semantic tokens, assign accessible behavior to MUI, make Tailwind the primary static styling surface, reserve `sx` for MUI-specific or dynamic exceptions, and verify light/dark contrast and responsive states in browser tests.
- **[Local screen navigation does not produce shareable deep links]** → Accept for local V0; hosted routing/share URLs belong to the gated Hosted Delivery design.

## Migration Plan

1. Add characterization tests for all current Golden Viewer phases and critical behavior, and freeze the sanitized annotated External Markdown Benchmark #001 fixture plus scorer.
2. Add versioned schemas and minimum validators, then convert Osaka into a schema-valid Golden CanonicalTrip fixture and introduce the minimum shared Presentation Projection without changing fallback behavior.
3. Complete validators, domain builders, semantic projection fixtures, and a Golden smoke/build checkpoint before connecting untrusted input.
4. Resolve the credential compatibility, CSP, and logging-redaction gate; then add IndexedDB repositories, credential isolation, legacy checklist migration, and session-only source-data tests.
5. Add the Home-first app shell, reserved optional-field area, Markdown intake, and UnifiedSourceDocument construction.
6. Add the Gemini adapter and deterministic response gates, run the parser-quality benchmark/model comparison, and pin the exact model only if it passes.
7. Add the reducer-owned Review/correction/confirmation workflow and transactional activation, with a build and replacement-flow checkpoint.
8. Connect generalized Overview/Day to the same active-trip repository and projection; remove legacy data reads from generalized Result components.
9. Run final unit/component/E2E checks, semantic stress fixtures, mobile/desktop verification, and the integrated External Markdown Benchmark #001 rerun. Only after the gate passes may Hosted Delivery work begin.

Rollback uses the previous known-good deployment/commit. Local schema upgrades must be additive or explicitly migrated; a failed migration leaves the old record untouched. The Golden fixture remains an explicit local fallback, so parser/provider failure cannot remove access to a usable itinerary.

## Open Questions

- The later `harden-source-to-render-boundaries` decision resolves the default candidate to exact `gemini-3.5-flash`; production remains unpinned until its model-specific fixtures and live benchmark pass. Thinking-level acceptance remains evidence-gated.
- What Markdown byte/block/token limits provide safe latency and cost while still covering the collected evidence? Limits must be fixed from benchmark measurements before release.
- Which Content Security Policy is compatible with the final static deployment and required direct Gemini endpoint while minimizing same-origin credential risk? This is resolved by the blocking credential-security task before provider implementation.
- Does the supported browser matrix permit persistent non-exportable Web Crypto keys reliably? The blocking compatibility task must define compliant unsupported-browser behavior; no fallback may persist plaintext credentials.
