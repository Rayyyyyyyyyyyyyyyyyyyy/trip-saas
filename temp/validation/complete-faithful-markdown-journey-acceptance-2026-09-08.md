# Complete faithful Markdown journey — bounded acceptance report

Date: 2026-09-08. Change: `complete-faithful-markdown-journey`.

This report separates executable local evidence from parser quality, Review
recovery, hosted delivery and real travel use. It is not a deployment or product
completion claim.

## Integrated local verification

| Evidence | Current integrated result |
| --- | --- |
| Vitest unit + component | 54 files, 383 tests passed |
| Playwright development build | 93 passed, 1 expected desktop-only skip across desktop/mobile Chromium plus Chrome/WebKit platform storage/security projects |
| Production typecheck/build | passed; strict precompiled validators generated and Vite production bundle built |
| Production browser | CSP passed in Chrome, WebKit and Pixel 7; Pixel 7 performance check passed; 2 non-mobile performance cases intentionally skipped |
| Diff whitespace check | `git diff --check` passed |
| Strict OpenSpec validation | change valid |

The first integrated Vitest run exposed a real policy regression: a provider
could mark missing-year or ambiguous-clock findings as blocking even when the
unknown value was faithfully represented. Review now treats the known
missing-year, ambiguous-clock and missing-asset codes as non-blocking while
leaving deterministic invalidity and material booking/place conflicts blocking.
The complete local suites passed after that correction.

Production mobile measurements from the integrated rerun were 180 ms to visible
Home, 95/96 ms DOMContentLoaded/load and 497 ms to reopen a confirmed trip with a
controlled 200 ms per-request delay. The early resource observation transferred
1,613,523 bytes and included one font request. These figures are one controlled
run, not a service-level objective. The large font payload and single large JS
chunk remain known optimization opportunities.

## Original parser quality

The frozen benchmark uses `faithful-markdown-rubric.v2`. The offline source
comparison in `external-markdown-001-rubric-v2-replay.md` preserves both original
artifact hashes and scores all 15 annotations separately from required Review
findings. Every reviewable historical output fails original quality:

| Historical output | Representation pass | Missing required finding | Overall |
| --- | ---: | --- | --- |
| integrated medium | 14/15 | 011 | fail |
| integrated high | 10/15 | none | fail |
| post-guidance medium | 12/15 | none | fail |
| post-guidance high | 12/15 | 011 | fail |

Historical low failed `draft_not_reviewable`. Schema/coverage success for the
other outputs does not erase proper-name substitutions, unsupported Day/daypart
inference or flattened alternatives.

A new exact `gemini-3.5-flash` live run was executed after the user explicitly
approved sending the sanitized fixture's dates, restaurant names and medical
address to Gemini. The v3 bounded artifact explicitly records rubric v2 and
separates representation from finding requirements:

- artifact: `external-markdown-001-live-rubric-v2-2026-09-08.json`;
- SHA-256: `669a4e22dfb832af941af9ff21ef15b5d97c8b239f88a7c94ea1d29bf4cc197e`;
- mode/size: `0600`, 10,744 bytes;
- source identity: frozen SHA-256
  `e8d973f936b606b6749e0348684f4f5aed9bd52a62c7ec90036cd8dc8051dfcf`;
- all 35 frozen blocks mapped before provider execution;
- the bounded artifact contains neither source text nor an API-key-shaped value.

| Level | Execution | Safe outcome | Critical / invention / unsupported / fidelity / coverage assessment |
| --- | --- | --- | --- |
| low | failed | `draft_not_reviewable` at `review_gate` | not assessable; no accepted original interpretation or automatic coverage metrics |
| medium | failed | `provider_timeout` at request, attempt 1 | not assessable; no original interpretation or automatic coverage metrics |
| high | failed | HTTP 503 `provider_unavailable` at request, attempt 1 | not assessable; no original interpretation or automatic coverage metrics |

After this failed run, first-party model research selected exact stable
`gemini-3.8-flash` as the next acceptance candidate. That selection does not
reuse or relabel the 3.5 evidence above. The new candidate's schema,
deterministic, live and integrated gates are separately open under task 6.3a;
Netlify production remains model-unset.

The aggregate execution failed and `acceptance_status` remains `pending`. This
run therefore supplies complete per-level execution evidence but no qualifying
original output. Task 6.3 is complete as an executed comparison; tasks 6.4 and
6.6 remain open. No production default was activated.

## Review recovery burden

The retained integrated-medium output was corrected through the real Review,
authoritative confirmation, IndexedDB replacement, reload and Result flow. The
controlled Playwright tester made four field edits and two explicit finding
resolutions. It reached the reloaded Result in 12,225 ms on desktop Chromium and
12,112 ms on Pixel 7. These are automation timings, not human-effort or usability
claims. The corrected result cannot retroactively improve the original parser
score.

## Result source-comparison lookup tasks

The controlled automated tester reopened no source document after reaching Result. Each
lookup asserted source-equivalent content rather than mere text presence.

| Lookup | Desktop | Pixel 7 | Evidence checked |
| --- | ---: | ---: | --- |
| undated information | 10 ms | 15 ms | trip dates remain unknown; outbound and return flights are in the undated region |
| exact action | 59 ms | 60 ms | airport-rail timetable retains the exact source URL |
| raw time | 932 ms | 415 ms | `12點` remains readable and fabricated `12:00` is absent |
| optional surface | 906 ms | 389 ms | optional disclosure is reachable |
| alternative | 8 ms | 5 ms | Itaewon and room remain separate choices after disclosure |
| address / related raw time | 910 ms | 36 ms | exact supplied address and `七點` remain readable |
| reservation | 3 ms | 1 ms | confirmed status, reference and detail render together |

Navigation and assertion waits are included, so these values are useful only as
regression observations. They do not prove that a traveler under stress can find
the same information, nor do zero controlled source reopens establish real-world
source replacement. Task 6.5 therefore remains open for human source-comparison
and Review-burden observations.

## Deployment and travel boundary

The current deployment decision is Netlify static hosting. `netlify.toml`
defines `npm ci && npm run build` and publishes `dist`; `public/_headers`
declares the complete CSP, including `frame-ancestors`, and `index.html` retains
the portable meta subset. The production-built HTML locally blocks an
unapproved connection, but no current Netlify response, deployed commit or
effective response-header policy has been verified. Actual deployment remains a
named release-verification gap.

True offline reload, real weak-network travel use, human Review burden and
travel-day replacement of the source are untested. Static fallback and controlled
delayed-resource behavior passed locally.

## Scope audit

No Hosted Delivery service, Netlify Function/Blob publication path,
Spreadsheet/PDF intake, generalized runtime, account, export, recommendation or
provider fallback was added. Hosted Delivery remains blocked by External Markdown
Benchmark #001; Spreadsheet Travel Table remains V0.2. The only new delivery work
is portable static-entry CSP verification and build-time schema-validator
generation.

## Gate decision

Local correctness, persistence, complete presentation, Golden regression and
controlled recovery/usability evidence pass their stated checks. Exact-model live
quality, qualifying-original end-to-end acceptance, production-default activation
and actual hosted enforcement do not pass. The change must remain active.
