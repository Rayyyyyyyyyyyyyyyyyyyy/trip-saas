# Root reviewer probes — 2026-09-07

Read-only review of the current working tree. No product changes, network calls,
credentials, browser data writes, or test expectation changes. The probes bundled
existing TypeScript with esbuild in memory and executed the exported functions.
The first probe wrapper failed due to an undefined Node module filename; the
corrected wrapper produced the observations below. This harness error is not a
product failure.

## Missing source dates cannot complete confirmation

Clone `validParsedTripDraft` from `tests/fixtures/contracts/validContracts.ts` and
set `trip.start_date` and `trip.end_date` to null.

Observed:

- `validateParsedTripDraft(draft).valid` is true.
- `buildCanonicalTrip(draft)` throws
  `CanonicalTrip requires confirmed start and end dates.`
- `buildCanonicalTrip.ts:31` is the rejecting condition;
  `confirmReviewedTrip.ts:33` converts it to the generic candidate failure.
- Review only disables confirmation on blocking findings, whereas null trip
  dates are accepted by draft validation. The user's latest instruction permits
  absent source information without compulsory completion. The current prompt
  implements that instruction, but confirmation does not.

This is a known remaining mismatch now independently reproduced, not a claim
that the latest prompt integration introduced the old date requirement.

## Unassigned entities disappear from presentation

Build the valid fixture canonical trip. Append a cloned activity with a distinct
ID, `day_id=null`, title `Undated medical visit`, and address
`SOURCE_ADDRESS_MARKER`.

Observed:

- `validateCanonicalTripAuthoritatively(trip).valid` is true.
- The JSON of `createTripPresentation(trip)` contains neither that title nor the
  address. No browser inspection is needed to establish loss before rendering.
- Adding another such entity with `semantic_type=flight` preserves its compact
  title/time reference in Overview, but still omits its address and other full
  entity information from the projection.
- `createTripPresentation.ts:261` groups null Day IDs, but the projection only
  consumes named Days at line 269. The overview's line 305 flight branch uses
  `compactEntityReference` (line 201), which has only ID, Day ID, title and time.

The remedy must provide a source-agnostic place to show unassigned entities;
assigning a guessed Day to make the entity visible violates source fidelity.

## Canonical JSON bypasses date/time semantic validation

Build the valid fixture canonical trip, then set:

```json
{
  "start_date": "2026-02-31",
  "end_date": "2026-02-01"
}
```

Set its existing untimed entity's `time.kind` to `exact`, leaving `start=null`.

Observed:

- `validateCanonicalTripAuthoritatively(trip).valid` is true.
- `importCanonicalTripFile` with an in-memory JSON File reaches
  `repository.replaceActive`. The test repository also reruns the real
  authoritative validator before marking the call as accepted.
- Direct `confirmReviewedTrip` also accepts an exact-without-clock draft. This
  is a service boundary finding: normal Review UI has separate draft validation
  and can block that time shape. Do not claim an ordinary Review click bypasses it.
- `canonicalTripImport.ts:69` and the real repository's read/write paths depend
  on the same incomplete authoritative validator.

`buildCanonicalTrip.ts:116` checks schema, IDs, Day references and relationships,
but does not apply the calendar, trip-range, time-shape or rollover checks present
in `validateParsedTripDraft.ts`. Schema date patterns alone accept nonexistent
dates. Relevant contract: `spec/03_PIPELINE_SPEC.md` Deterministic Validator and
authoritative confirmation sections.

This probe proves invalid data passes the import boundary; it does not perform
an actual browser IndexedDB commit or assert any particular runtime crash.
