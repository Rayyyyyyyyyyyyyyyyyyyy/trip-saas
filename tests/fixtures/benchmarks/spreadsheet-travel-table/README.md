# Local spreadsheet benchmark preparation and live collection

This runner reads three git-ignored local samples by path, using the actual
Spreadsheet Source Adapter, source gate, and `createInterpretTrip` chunk/schema
pipeline. No real workbook or captured result belongs in this directory:

| Fixture | Layout         | Local path                                |
| ------- | -------------- | ----------------------------------------- |
| busan   | row-per-event  | `temp/Odata/24 ares/Busan.xlsx`           |
| penghu  | calendar-grid  | `temp/Odata/12-14 橘/2025澎湖史努比.xlsx` |
| nagoya  | column-per-day | `temp/Odata/21-22 ethan/名古屋.xlsx`      |

`npm run benchmark:spreadsheet` defaults to **prepare**. It never reads a key or
sends a provider request. A preflight probe intercepts the application's actual
prompt at the transport preparation seam and records exact envelope bytes and
token estimates. Full-document and whole-sheet budgets indicate `single-request`,
`whole-sheet`, or `region-needed`; the latter is sizing evidence, not permission
to truncate or an implemented region adapter.

Outputs are atomic mode-0600 JSON files in Node's OS temporary directory:
`spreadsheet-benchmark-{busan,penghu,nagoya}.json`. An optional
`SPREADSHEET_BENCHMARK_OUTPUT_DIR` must already exist inside an OS temporary
directory; symlink-resolved parents are checked. Tracked/workspace output paths
are rejected. Only safe status/path information is printed. The artifacts retain
source identities, locator mappings, accounting/unparsed counts, observed range
usage, and, for a successful live run, the original interpretation. They contain
no raw workbook, extracted source document, provider envelope, key or production
ReviewSession. Oversized/unsafe interpretations become bounded failure records.

Only after explicit authorization, live collection can be invoked with:

```sh
SPREADSHEET_BENCHMARK_MODE=live \
SPREADSHEET_BENCHMARK_LIVE=authorized \
SPREADSHEET_BENCHMARK_MODEL=gemini-3.5-flash \
node --env-file=.env node_modules/vitest/vitest.mjs run --config vitest.spreadsheet-benchmark.config.ts
```

The runner itself does not load `.env`. The credential is read only after live
mode, the explicit authorization flag and exact model ID pass validation. It is
never supplied in command arguments. Model aliases, other models and fallback
are rejected. Transport retry policy remains unchanged; one shared abort signal
and a bounded outer run protect serial collection. A prepared checkpoint precedes
requests; terminal outcomes are saved before execution assertions. This command
collects evidence; it does not enable supported-format guidance.

## Parser quality remains separate from Review recovery

`annotations.template.json` is deliberately `TODO`. Copy it into a local OS
temporary annotation directory, one file per fixture (`busan.json`, `penghu.json`,
`nagoya.json`), and optionally select that directory through
`SPREADSHEET_BENCHMARK_ANNOTATION_DIR`. Inventory critical events, unsupported
exact-fact constraints and ambiguities against the extracted locator mapping;
bind ready annotations to the exact source ID and source refs. Do not commit
real fixture expectations or judgments. Every annotation file, including TODO,
uses a closed-field decoder before artifact construction. Unknown fields at any
level, malformed values and oversized inputs are rejected without checkpointing
their payload. The JSON input limit is 8 MB, the combined annotation entry limit
is 10,000, IDs/source refs are bounded to 1,024 characters, each reference list
to 50,000 entries, and expectation/rule text to 4,000 characters. IDs and refs
must be unique in their respective collections. JSON errors expose a fixed
technical message rather than a source-bearing syntax diagnostic.

Missing/invented critical events, unsupported exact dates/times/places and
ambiguity judgments start as **null**, not zero. Successful schema and complete
accounting are recorded separately and do not establish faithful interpretation.
`evaluateSpreadsheetParserQuality` requires ready annotations, judgments with
actual evidence, existing entity references and the exact original-result hash.
For each required ambiguity finding, the judgment's `finding_refs` must name
actual finding IDs in the original result's root or draft whose source refs
overlap that ambiguity's annotated source refs. Boolean claims and prose alone
cannot satisfy the criterion. No associated original finding fails the rubric;
missing, unknown, duplicate or unrelated assessment references remain pending.
The human judgment still assesses whether the referenced finding communicates
the actual ambiguity; matching a source ref is not a semantic classifier.
An annotation TODO, an unassessed criterion or an unmatched result remains
pending. A missing/invented critical event, unsupported exact fact or failed
ambiguity representation fails the rubric. The collected artifact's acceptance
stays pending until separately documented semantic acceptance; automatic
collection never claims passed.

`review_recovery` starts `not_run` and reserves separate correction,
authoritative Canonical, persistence and desktop/mobile Viewer evidence. Review
fixes must never rewrite the original interpretation or convert failed parser
quality into a pass. All three layouts must pass the original faithful rubric
and the approved recovery/rendering gate before acceptance can open guidance.
