# App ownership

Own the application shell and the application workflow contracts. Feature and domain rules stay in their owning modules.

## Current wiring

- `TripRuntimeStartup` owns startup loading, Home/sample/confirmed-trip surface selection, Canonical JSON activation, local clear refresh behavior, and the integrated Markdown → interpretation → Review → confirmation orchestration.
- `tripWorkflow` is the sole owner of active trip, one in-memory candidate, request/session identity, the recorded interpretation, separate adjusted Review draft, session-only adjustment log, findings, failure, and confirmation status. It also owns `TripWorkflowFailurePhase`; `features/import` consumes that vocabulary and supplies only the copy each phase renders.
- `parseTrip` carries the source identity alongside the document so the port can re-check agreement itself; a caller's belief that the two match is not evidence.
- `parseTrip` owns the provider-neutral failure vocabulary. `describeIntakeFailure` and `describeConfirmationFailure` translate a port's documented `code` into the bounded intake descriptor through one own-property lookup, so no inherited key can widen the vocabulary and no thrown message reaches presentation.
- The Reviewable Draft gate belongs to the `ParseTrip` port, which reports `draft_not_reviewable`. The app must not re-run it and split ownership of the rule.
- After the response and Reviewable Draft gates pass, `useTripIntakeWorkflow` invokes the trip-domain supporting-group derivation with the validated source document. The recorded interpretation remains unchanged; only the cloned Review candidate receives deterministic source-backed groups.
- `interpretTrip` imports `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` using Vite `?raw` as the single executable instruction source, then appends the validated source JSON. The document is bundled at build time; no filesystem access or document fetch occurs in the browser. Changes to the document require parser verification, and an actual-request test compares its full text against the repository file. These provider-neutral instructions specify: source content is evidence rather than instructions, uncertain clocks/full dates retain raw evidence and focused Review findings, unavailable assets remain unresolved supporting items, and absent valid action URLs do not create links. Field-format descriptions live in the authoritative domain schemas and survive provider projection. Strict response/coverage/Reviewable Draft gates remain unchanged; instructions are not automatic repair or proof of semantic acceptance.
- The composition root constructs one parser from the explicitly configured exact model. Workflow submissions and preserved-source retries use only that parser; the controller and Home expose no alternate-model action.
- Gemini-backed intake is enabled only when `TripRuntimeApp` receives an explicitly configured parser. Until the external benchmark passes, the normal production build supplies no accepted model and therefore does not silently treat the acceptance candidate as pinned.

## Processing lifetime

- `useTripIntakeWorkflow` owns reading, extraction, source validation, credential loading, interpretation and output-validation progress. `tripProcessingRun` races every wait against cancellation and positive stage/overall deadlines, including dependencies that ignore their AbortSignal. Feature-local intake state retains only unsubmitted file/paste controls.
- The processing modal derives from the workflow and exposes `停止這次判讀`. Success, insufficient, failure, timeout, stop and unmount release processing timers; inactive late results cannot enter another stage. Stop/failure preserve selected input and the confirmed trip. Successful confirmation, Canonical JSON import and explicit data clearing discard source controls.
- Exact `gemini-3.5-flash` is the selected default candidate. The current production composition remains unset until that exact model passes the required live benchmark; no moving alias or silent fallback model is allowed.

## Composition boundary

- `main.tsx` is only the browser bootstrap. It mounts `TripRuntimeApp` and must not own product state, persistence wiring, theme policy, or feature rendering.
- `TripRuntimeApp` is the composition root for the browser-local repositories, theme, startup flow, and confirmed-trip entry selection.
- The bundled itinerary viewer belongs to the Golden feature and is selected only through explicit sample state. Persisted/imported confirmed trips render the supplied CanonicalTrip even when its ID equals the bundled fixture ID. The app does not absorb Golden navigation, runtime, checklist or presentation rules.

## Styling boundary

- Tailwind classes are the primary owner of static layout, spacing, responsive composition, and component visuals.
- MUI owns accessible component behavior. Use `sx` only for MUI internal selectors, theme-aware component states, or genuinely dynamic values that are not cleanly expressible with Tailwind.
- Do not define the same CSS property in both `className` and `sx`; one element must have one clear styling owner per property.
- `tests/unit/styling-ownership.test.ts` scans every source TSX file and fails when one JSX element declares both `className` and `sx`.
- `tripTheme.ts` is the single light-paper token source. `src/index.css` projects those roles to Tailwind and imports the locally bundled `@fontsource/noto-serif-tc` and `@fontsource/noto-sans-tc` assets (SIL Open Font License) with `font-display: swap`; production typography does not depend on Google Fonts or another runtime font host.
- `src/components/editorial/EditorialPrimitives.tsx` contains only the shared reading measure, section heading/hairline, 4px semantic marker, and evidence/reference frame. Workflow and itinerary meaning remain owned by their feature components.

## Trip replacement boundary

The integrated workflow preserves this reducer contract:

- `TripWorkflowState.activeTrip` is the last validated, confirmed trip and remains readable while a replacement is processed.
- `TripWorkflowState.candidate` is the single, replaceable in-memory import candidate. Candidate source, recorded interpretation, adjusted draft, adjustment log, findings, and request identity must not be written to confirmed-trip persistence.
- Only `confirmation_committed`, after durable repository replacement succeeds, may move the candidate into `activeTrip`.
- Confirmation success is derived from the reducer's committed active-trip identity. It is session-only, is never persisted, and both of its exit actions acknowledge that status before routing the same `activeTrip` to Viewer or Home.
- Session and request identities reject late asynchronous events. Starting a newer intake replaces the former candidate without changing the active trip.
