# External Markdown #001 — faithful rubric v2 offline replay

Date: 2026-09-07. This is a deterministic replay of retained sanitized
artifacts; it made no provider call and did not rewrite either original JSON.

## Artifact identity

| Artifact | SHA-256 | Original execution |
| --- | --- | --- |
| `external-markdown-001-post-guidance.json` | `96b5583af7dfbd79cb36e52e56046c13a6eb217dc1a64d7667e6841c80882445` | low failed `draft_not_reviewable`; medium/high succeeded locally |
| `external-markdown-001-integrated-prompt.json` | `3fb3789bf28ce91a28b27a3595262f01ee38e77e718a6a4a47263fc5a56c1ea4` | low failed `draft_not_reviewable`; medium/high succeeded locally |

Model recorded by both artifacts: exact `gemini-3.5-flash`. Their pending
human-review fields remain untouched. `faithful-markdown-rubric.v2` is defined
in the benchmark fixture and does not reinterpret historical 9/15 scores as a
pass.

## Rubric v2 scoring semantics

Rubric v2 scores the expected semantic representation of all 15 annotations.
It separately requires a visible finding for
`required_for_ambiguous_clock_only` or `required` annotations. A `conditional`
annotation passes without a redundant finding when its representation already
makes the unresolved state explicit. Therefore a faithfully retained null value
is not failed merely because the model did not emit an extra warning. The
executable scorer and its example evaluation now enforce this split.

The following source comparison applies to the original retained outputs.
`I-M` and `I-H` are integrated-prompt medium/high; `P-M` and `P-H` are
post-guidance medium/high. A dash means that low produced no reviewable draft.

| Annotation | Required representation / finding | I-M | I-H | P-M | P-H |
| --- | --- | --- | --- | --- | --- |
| 001 | null full dates; partial dates readable / no | pass | pass | pass | pass |
| 002 | flights identifiable; identity, airports and unsupported Day bindings absent / no | pass | **fail:** flights bound to Day 1/5 | **fail:** flights bound to Day 1/5 | **fail:** flights bound to Day 1/5 |
| 003 | return `23:00–00:35`, cross-midnight true / no | pass | pass | pass | pass |
| 004 | retain `明洞 (424)` without asserting station-code meaning / no | pass | pass | pass | pass |
| 005 | two unavailable images stay unresolved and parsing continues / conditional | pass + finding | pass + finding | pass + finding | pass + finding |
| 006 | unnamed check-in; raw `6:30` without exact start/daypart / ambiguous-clock finding | pass + finding | **fail:** dinner gets `evening`; finding exists | pass + finding | pass + finding |
| 007 | raw `5.30` and `8點`, no exact start/daypart/chronology / finding | pass + finding | **fail:** afternoon/evening inferred; finding exists | pass + finding | pass + finding |
| 008 | chicken and pizza remain separate members of one alternative / no | pass | pass | **fail:** choices collapsed into one entity | pass |
| 009 | vague dinner remains without invented venue / no | pass | pass | pass | pass |
| 010 | Itaewon and room remain separate tentative alternatives / no | pass | pass | **fail:** choices collapsed into one entity | **fail:** choices collapsed into one entity |
| 011 | raw `11.30`, no exact start/daypart / finding | **fail:** exact `11:30` + morning; finding missing | **fail:** exact `11:30` + morning; finding exists | pass + finding | **fail:** exact `11:30`; finding missing |
| 012 | unspecified lunch intent, no venue/menu / no | pass | pass | pass | pass |
| 013 | exact supplied address and appointment intent; no clinic/time / no | pass | pass | pass | pass |
| 014 | station/exit guidance remains related supporting instruction / no | pass | pass | pass | pass |
| 015 | raw `七點`, no exact start/daypart or unsupported Day inference / finding | pass + finding | **fail:** evening inferred; finding exists | pass + finding | pass + finding |

All four reviewable original outputs retain all seven annotated critical events,
have complete block disposition/coverage, and do not add a critical event. The
six narrow unsupported-exact constraints record no exact-year, flight identity,
accommodation identity/time, concert identity/20:00, clinic identity/time, or
19:00 violation. Rubric v2 still fails each original on the representation rows
above. Low failed `draft_not_reviewable`, so it has no parser-quality score.

| Original output | Representation pass | Missing required finding | Overall |
| --- | ---: | --- | --- |
| integrated medium | 14/15 | 011 | fail |
| integrated high | 10/15 | none | fail |
| post-guidance medium | 12/15 | none | fail |
| post-guidance high | 12/15 | 011 | fail |

Additional source-fidelity failures remain separate from those 15 annotations:
proper-name characters were substituted in every reviewable captured output;
the integrated medium also promoted raw `12點` and `11點` to exact clocks, and
the integrated high inferred several unsupported dayparts. Name substitution,
Day binding, relationship flattening and time precision are separate defects
because correcting one does not prove the others. These checks are necessary
evidence, not a complete semantic proof.

## Captured-medium Review recovery

The retained integrated-prompt medium output was exercised without a provider
call through the real Review editor, authoritative confirmation, IndexedDB
replacement, reload and Result projection in desktop Chromium and Pixel 7
viewports. The correction record is separate from original parser quality:

- critical corrections: `ent-d2-lunch.title`, plus `time.kind` for
  `ent-d2-lunch`, `ent-d3-lunch` and `ent-d4-lunch`;
- explicit source-supported fidelity resolutions after correction: 2;
- retained unsupported/unknown facts: `MISSING_YEAR`,
  `AMBIGUOUS_CLOCK_FORMAT` and both missing relative assets;
- source lookup checks after reload: undated outbound/return flights, exact
  `혼고집 명동직영점`, raw `12點`, `11點` and `七點`, alternatives, the
  source address and the exact airport-rail timetable URL.

This records four edited fields and two explicit finding resolutions. Proper-name
substitution remains a manual benchmark assessment instead of a production
blocker inferred from arbitrary Hangul text. It is
recovery evidence, not an improved score for the original output and not a
claim that every unannotated semantic fact was manually verified.

## Outcome boundary

The replay proves the known fidelity losses remain in the original outputs and
that rubric/manual source comparison can surface them; deterministic local
checks remain limited to facts with executable source support. The
captured-medium exercise proves the recorded corrections can recover to a valid,
persisted and renderable
CanonicalTrip. It does not make either original qualify and does not activate
the production model default or Hosted Delivery.
