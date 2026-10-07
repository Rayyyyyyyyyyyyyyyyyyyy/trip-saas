# Review feature ownership

Own evidence-backed candidate correction, derived findings, bounded insufficient recovery, and confirmation actions.

## Current implementation

- `ReviewScreen` is the shared centered mobile/desktop exception-led checkpoint. Its default surface shows the trip summary, conservative-adjustment summary and unresolved blockers; complete source-backed editors and informational findings are behind `查看完整校對內容`.
- `reviewAdjustment` owns the closed pre-Review conservative-handling stage. It downgrades a locally proven unsupported exact/approximate/daypart clock to `kind=none`, retaining `raw_text` and source refs. It also consumes bounded, locally computed tabular date decisions: unsupported full dates become null, and source-backed partial dates remain Day labels or supporting notes. Both paths return a typed session-only candidate/adjustment result without mutating the recorded interpretation; absent facts never require compulsory completion.
- `reviewCandidate` owns correction, add/delete/revert, user provenance, and deterministic finding derivation. UI components do not keep a second validation state.
- Validator-owned findings are replaced by current deterministic validation. Mechanically detectable unsupported precision cannot be acknowledged while it remains in the candidate. A genuine external-knowledge blocker requires an explicit evidence-backed user resolution; the candidate keeps an exact-ID `USER_RESOLVED_FINDING` audit record, which remains visible in the full Review and is not copied into CanonicalTrip.
- `InsufficientRecovery` exposes bounded replace/cancel recovery without constructing guessed itinerary structure.
- `confirmReviewedTrip` builds and authoritatively validates CanonicalTrip before awaiting the repository replacement transaction. Only the reducer's later `confirmation_committed` event may make it active.
- Supporting groups arrive on the cloned Review candidate from deterministic trip-domain derivation. Review displays the source-backed group label read-only and does not offer group editing or persist disclosure state.

Raw source documents, excerpts, interpretation results, Review adjustments, and Review state remain in the candidate session and are never passed to the confirmed-trip repository.

Review consumes a `ReviewEvidenceProjection` (`src/domain/source/reviewEvidence.ts`),
never the source document. `ReviewScreen`, `ReviewFindingList`,
`InsufficientRecovery`, and `SourceExcerpt` receive only the fixed evidence
grammar — `text_excerpt`, `tabular_excerpt`, `asset_reference`,
`missing_reference`, `user_authored` — so no Markdown node, workbook object, or
provider envelope reaches a Review component.

- `missing_reference` and `user_authored` are separate variants on purpose: "the
  reference broke" and "you wrote this" are different statements to a reviewer.
- Each excerpt is bounded by `REVIEW_EXCERPT_MAX_CHARS`; long evidence continues
  in subsequent excerpts so all source text remains readable. The projection
  includes the directly referenced parent/header as context and deduplicates
  repeated evidence within one selection.
- The tabular variant is dormant. Its presence in the grammar is the seam
  Spreadsheet V0.2 consumes and is not workbook intake support.
