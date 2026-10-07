# Trip domain ownership

Own versioned trip schemas, deterministic validation, review-to-canonical conversion, and CanonicalTrip invariants without React or provider dependencies.

`canonical-trip.v3` is the current write contract. It adds one required nullable
`SupportingItem.group` with opaque id, source-visible label, and source order.
Strict v1 and v2 remain read contracts; decoding v1 retains its provenance
migration and decoding v2 adds only `group: null` before v3 validation.

`deriveSupportingGroups` is the pure post-response-gate boundary. It clones a
draft and derives groups only from a validated source document: nearest ancestor
heading for Markdown, or one sheet identity for tabular evidence. Mixed groups
remain null, and provider output never supplies group labels or ids.

`createDayPlacement` owns deterministic primary relationship nesting and stable sequence ordering. Authoritative relationship validation consumes the same policy as Presentation Projection, so incompatible primary memberships or impossible ordering produce blocking findings before confirmation.

## Interpretation schema constraint guidance

The v1 draft and v2 result schemas are the authoritative accepted-value contracts.
The historical v1 result schema remains unchanged, but new provider requests and
local response gates require v2. Optional range coverage expands locally before
the existing draft gate; `unparsed` always remains per-unit.
Descriptions are generation guidance, not validation. Gemini projection retains
those descriptions; the application interpreter owns travel-semantic instructions.
No provider response is coerced or automatically repaired.

The omitted-constraint inventory for these two schemas is:

| Omitted constraint | Nodes | Decision |
| --- | --- | --- |
| `pattern`, `minLength=1`, `maxLength=128` | Both `stableId` definitions | Describe ASCII initial letter/digit, permitted punctuation, and length bounds; preserve supplied evidence IDs exactly. |
| Date `pattern` | Draft `nullableDate` string branch | Describe source-supported `YYYY-MM-DD`; unknown year keeps full date null and partial evidence for Review. |
| Time `pattern` | Draft `nullableTime` string branch | Describe 24-hour `HH:mm` without seconds; ambiguous meridiem keeps exact clocks null and raw text for Review. |
| URL `pattern` | Draft action URL and place/supporting-item URL string branches | Describe exact source-supported HTTPS; nullable fields use null when unavailable; omit actions without a valid required URL. |
| Code `pattern`, `minLength=1` | Draft finding code; result unparsed reason code | Describe uppercase versus lowercase ASCII letters, digits, underscores and nonempty values. |
| `minLength=1` | Draft geography item, action label, provenance override item, entity title/notes/unresolved-field items, finding message; result unparsed locator/message | Each node describes its minimum nonempty length. Nullable text remains nullable without adding a nonempty constraint. |
| `uniqueItems` | Draft sourceRefs, geography, provenance overrides, entity unresolved fields, relationship member/child IDs, finding entity/source refs | Each node explicitly requests no duplicate items; strict local validation still enforces uniqueness. |
| `$schema` | Both schema roots | Local-only dialect metadata; it does not describe a generated value. |
| `const` | Schema versions and status discriminator branches | Converted to equivalent singleton `enum`, not discarded. |

`tests/unit/interpretation-guidance.test.ts` walks the complete bundled schemas,
requires guidance for every omitted validation constraint, checks supported
patterns explicitly, and fails on any new unaccounted keyword or pattern. It
also checks the real generated request and replays invalid times/relative URLs
through the strict parser. New guidance does not establish live parser quality.
