# Implementation notes

> Historical implementation evidence from the archived predecessor. Statements
> below describe the checkout and decisions recorded at that time; they are not
> current completeness, deployment, visual-system or model-acceptance claims.
> See the [archive closure](./closure.md) and the
> [successor tasks](../../complete-faithful-markdown-journey/tasks.md) for current
> status and remaining gates.

## Production dependency audit

Recorded before installing any production dependency for task 1.1.

### Existing capabilities to reuse

| Capability                           | Owner                                   | V0 responsibility                                                                            |
| ------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Rendering and local workflow state   | React 19                                | Components, reducer/context, derived selectors, and one active UI state owner.               |
| Accessible interaction behavior      | Material UI                             | Inputs, buttons, tabs, dialogs, focus behavior, feedback, and other interactive primitives.  |
| Layout and project design tokens     | Tailwind CSS 4                          | Mobile-first spacing, responsive composition, and the approved semantic token layer.         |
| HTTP and cancellation                | Browser `fetch`, `AbortController`      | Direct Gemini request transport, cancellation, and stale-request containment.                |
| Identity and credential cryptography | Browser `crypto.randomUUID`, Web Crypto | Session/source IDs plus the credential-security implementation after its compatibility gate. |
| Transactional local persistence      | Browser IndexedDB                       | Confirmed-trip, active-pointer, encrypted credential material, and migration transactions.   |
| Time-zone formatting                 | Browser `Intl.DateTimeFormat`           | Golden runtime decisions in `Asia/Tokyo`.                                                    |

### Required production dependencies

| Dependency     | One concrete responsibility                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `ajv`          | Compile and execute the authoritative versioned JSON Schemas against untrusted inputs and persisted records. |
| `unified`      | Run the Markdown syntax pipeline that produces an ordered syntax tree without assigning trip semantics.      |
| `remark-parse` | Parse Markdown into mdast nodes with source positions used to build stable evidence locators.                |
| `remark-gfm`   | Preserve GitHub-Flavored Markdown table and related GFM structure found in itinerary sources.                |

No other production dependency is approved by this audit. In particular, V0 will not add a router, global state package, provider registry/SDK, generic utility library, IndexedDB wrapper, date library, or schema-to-type framework. A new production dependency requires adding its single responsibility here before installation.

### Test-only dependencies

The baseline test harness may add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `@playwright/test`. TypeScript plus the React, React DOM, and Node declaration packages provide strict compile-time checking for active application, test, and tool-configuration code. `@babel/parser` has one additional test-only responsibility: parse TSX source for the styling-ownership guard that rejects a JSX element declaring both `className` and `sx`. These are development dependencies and do not enter the production bundle.

`tests/unit/styling-ownership.test.ts` applies that guard to every `src/**/*.tsx` file. This makes the Tailwind-first ownership rule executable: a JSX element may use `className` or `sx`, but never both on the same element.

## Gemini schema projection evidence

The projection keyword allowlist was checked against the official Gemini structured-output and Generate Content API documentation on 2026-09-02:

- <https://ai.google.dev/gemini-api/docs/structured-output>
- <https://ai.google.dev/api/generate-content>

The provider projection bundles the product response and draft schemas, converts `const` to an equivalent one-value `enum`, and omits unsupported validation-only keywords such as `pattern`, length constraints, and `uniqueItems`. It preserves every required field, type, enum, and discriminator branch. The complete local Ajv schemas remain authoritative after every provider response.

## Credential security decision gate

### Persistent non-exportable key compatibility

The compatibility spike uses a 256-bit AES-GCM `CryptoKey` generated with
`extractable = false` and `encrypt` / `decrypt` usages. It stores the key,
random 96-bit IV, and ciphertext in IndexedDB, reloads the page, retrieves the
record, decrypts a sentinel, and verifies that `exportKey("raw", key)` fails
with `InvalidAccessError`. It also verifies that the sentinel is absent from
`localStorage`.

Reproduce the automated targets with:

```sh
npm run test:credential-compat
```

Results recorded on 2026-09-02:

| Target                  | Environment                                                                    | Result |
| ----------------------- | ------------------------------------------------------------------------------ | ------ |
| Chrome                  | Google Chrome 152.0.7977.75 on macOS 26.5.2, Playwright `channel: chrome`      | Pass   |
| Safari                  | Safari 26.5.2 (21624.2.5.11.8) on macOS 26.5.2, manual run of the same fixture | Pass   |
| WebKit regression proxy | Playwright WebKit 26.5                                                         | Pass   |

The reproducible fixture is
`tests/browser/fixtures/credential-key-roundtrip.html`. The Playwright check is
`tests/browser/credential-key-compatibility.spec.ts`. The manual Safari check
serves the repository over loopback and opens the fixture in Safari; `PASS`
must be visible together with `AES-GCM`, `extractable: false`, successful
decryption, blocked export, and no plaintext in `localStorage`.

This design follows the Web Crypto Level 2 key-storage model, which explicitly
defines `CryptoKey` serialization and identifies IndexedDB as the expected
persistent store:
<https://www.w3.org/TR/WebCryptoAPI/#concepts-key-storage>. Compatibility remains
capability-tested because browser implementations can have algorithm-specific
storage regressions; for example, WebKit bug 312279 affects non-extractable
X25519 keys while reporting AES-GCM as working:
<https://bugs.webkit.org/show_bug.cgi?id=312279>.

### Approved credential storage contract

- `geminiCredentialRepository` owns one versioned IndexedDB database isolated
  from confirmed-trip and checklist records.
- The repository generates one 256-bit AES-GCM key with `extractable = false`
  and `encrypt` / `decrypt` usages and stores the `CryptoKey` itself in
  IndexedDB. It never exports or serializes raw key material in application
  code.
- A Gemini API key is UTF-8 encoded and encrypted with a fresh random 96-bit IV
  for every write. Durable credential data contains only the versioned
  ciphertext, IV, and non-secret lifecycle metadata.
- A read verifies the persisted key algorithm, extractability, and usages before
  decrypting. Missing, malformed, undecryptable, or incompatible records are
  reported as unavailable; they are not silently replaced or downgraded.
- Saving performs a runtime capability probe equivalent to the compatibility
  spike. Supported browsers must persist, reload, decrypt with, and reject
  export of the non-extractable key before persistent saving is offered.
- If the capability probe fails, persistent saving is unavailable. The user may
  still supply a key for the current in-memory parsing session, but no fallback
  writes plaintext, reversible encoding, raw key material, or the API key to
  `localStorage`, session storage, cookies, URLs, logs, analytics, CanonicalTrip,
  or hosted storage.
- Browser storage is device/profile/origin scoped and may be cleared or evicted.
  Non-extractable storage protects against casual storage inspection and some
  backup leakage; it does not protect plaintext after decryption from malicious
  same-origin script or a compromised browser profile.
- Clearing the credential deletes only credential key/ciphertext records. It
  does not clear an active confirmed trip. Corrupt-record recovery requires an
  explicit credential reset rather than an automatic destructive migration.

The supported-browser boundary is capability-based for current evergreen Chrome
and Safari rather than a user-agent version allowlist. Private/ephemeral browser
contexts may pass within a session but cannot promise durable survival; product
copy must describe storage as browser-local rather than permanent.

### Netlify deployment Content Security Policy

The current deployment target is Netlify. The production CSP is therefore an
HTTP response header declared in `public/_headers`, which Vite copies unchanged
to `dist/_headers`. This replaces the earlier static-host assumption that would
have required a CSP meta element; the header form also makes
`frame-ancestors 'none'` enforceable.

The policy uses `default-src 'self'` and permits browser connections only to the
same origin and `https://generativelanguage.googleapis.com`. It does not allow
wildcard or insecure HTTP connections. Scripts are same-origin only, object and
frame sources are disabled, and base/form destinations are same-origin. Inline
styles remain allowed because Material UI/Emotion creates runtime style
elements; this exception does not extend to scripts or connections.

Verification consists of:

- `tests/unit/content-security-policy.test.ts`, which parses the Netlify header
  and asserts the exact `connect-src` allowlist plus executable/embedding
  restrictions;
- `tests/browser/credential-security-policy.spec.ts`, which proves in Chrome and
  WebKit that a Gemini-origin request reaches the intercepted network boundary
  while an unapproved external request does not; and
- `npm run build`, followed by inspection of `dist/_headers`, proving that the
  deploy artifact contains the policy.

The loopback browser fixture omits only `upgrade-insecure-requests` because
WebKit correctly upgrades its HTTP-served local script to unavailable HTTPS.
The Netlify production header retains the directive because the deployed site
is HTTPS.

### Diagnostic and instrumentation containment

Gemini failure diagnostics use a positive allowlist defined by
`createSafeGeminiDiagnostic`. The versioned event contains only phase, bounded
HTTP status, bounded retry attempt, and a normalized failure category. It never
copies provider error messages, request URLs, headers, request bodies, API keys,
or source content. The companion `recordSafeGeminiDiagnostic` passes only this
safe event to an injected sink and performs no logging, analytics, beacon, or
network operation itself.

`tests/unit/gemini-diagnostic-containment.test.ts` contaminates an error with a
synthetic API key, raw itinerary text, request body, and credential-bearing URL.
It proves none reach the serialized diagnostic and that recording the event
does not invoke `console.error`, `fetch`, or `navigator.sendBeacon`. The later
Gemini adapter must use this boundary rather than forwarding raw provider
errors to any diagnostic sink.

### Gate outcome

The Chrome/Safari compatibility spike passed for the planned non-exportable
AES-GCM/IndexedDB mechanism, so task 5.5 requires no alternate storage mechanism
or narrower user-agent boundary. Support remains capability-tested as recorded
above. The deployment correction to Netlify changed only CSP delivery from a
meta element assumption to a response header; it did not change the credential
storage mechanism.

## Home, source adapter, and Gemini boundary

Home now opens first on an empty browser, exposes distinct file and pasted
Markdown modes, keeps the Osaka fixture opt-in, and keeps active confirmed data
readable through replacement-source failures. Both inputs normalize into the
same strict `TextSourceInput`. The Markdown adapter preserves ordered blocks,
heading/list hierarchy, GFM table evidence, raw text, links, deterministic
file/paste line locators, and non-fatal missing-relative-asset findings without
assigning itinerary meaning.

The Gemini adapter implements the provider-neutral `parseTrip` contract with an
explicit model parameter. Production remains unset. The later
`harden-source-to-render-boundaries` decision selects exact
`gemini-3.5-flash` as the replacement benchmark/default candidate, while the
current legacy live runner remains configured for `gemini-3.7-flash` until that
change migrates its fixtures and runner. Neither model is an accepted production
default until the required model-specific External Markdown Benchmark #001
passes. The REST request uses the official `generateContent` endpoint,
places the credential only in `x-goog-api-key`, requests JSON structured output
with the provider schema projection, and uses thinking level `medium` unless a
comparison run explicitly selects another level. Google currently documents
Gemini 3.7 Flash as GA with low/medium/high thinking levels and a 1M-token
context window:
<https://ai.google.dev/gemini-api/docs/generate-content/latest-model>.
Structured-output and supported JSON Schema details are taken from the current
official API documentation:
<https://ai.google.dev/api/generate-content>.

Before any result leaves the integration boundary, the adapter reruns the full
local response schema, source identity, exact block coverage, structured
unparsed-item accounting, draft validation, relationship validation, and
minimum Reviewable Draft gate. Requests have byte/token preflight limits,
abort propagation, bounded `429` retry, no provider fallback, safe translated
errors, and allowlisted diagnostics only.

Home's free/paid data-use disclosure is based on the current Gemini API terms:
unpaid-service content may be used to improve Google products, while paid
service prompts and responses are not used for that purpose. The UI links to
the authoritative current terms rather than reproducing them as a permanent
policy promise: <https://ai.google.dev/gemini-api/terms>.

### Parser-quality gate status

External Markdown Benchmark #001 has not yet been transmitted to a live Gemini
model because no user-authorized personal credential is available to this run.
This is a pending execution gate, not a parser-quality pass or failure. The
production model remains deliberately unpinned. Exact `gemini-3.5-flash` is
now the selected candidate, but it has not yet replaced the legacy runner or
passed the low/medium/high comparison and human annotation report with zero
critical missing, invented, or unsupported-exact facts and full
ambiguity/coverage acceptance.

The bounded live-comparison prerequisite is available through:

```sh
npm run benchmark:external-markdown-001
```

The command requires `GEMINI_API_KEY` to be injected through the current
process environment. It fails with a nonzero exit when the variable is absent;
the credential is never written to the artifact, printed, added to a URL, or
copied into diagnostics. `EXTERNAL_MARKDOWN_BENCHMARK_OUTPUT` may optionally
name an absolute artifact path; otherwise the completed artifact is written to
the operating system temporary directory. The current command writes only after
all three legacy fixed `gemini-3.7-flash` runs (`low`, `medium`, `high`)
succeed. Those runs cannot activate the new default decision;
`harden-source-to-render-boundaries` must first migrate the runner and execute
the same gate against exact `gemini-3.5-flash`.

Before transmission, the runner reconstructs the frozen source through the
production Markdown adapter and validates a complete one-to-one mapping from
runtime source block IDs/kinds to the frozen benchmark annotations. Its bounded
artifact contains an allowlisted provider-neutral interpretation summary,
automatic schema/coverage evidence, and explicit `pending` human-review fields.
It contains neither the raw provider envelope nor a synthetic pass result. A
live run does not complete task 9.7 until a human records critical
missing/invented/unsupported-exact counts and ambiguity recall for every
thinking level and the existing scorer confirms the acceptance gate.

## Post-commit review corrections

The review of commit `08e7697` found six gaps in already-completed tasks. The
Markdown adapter now uses the approved `unified` + `remark-parse` + `remark-gfm`
mdast pipeline and source positions instead of a line-regex scanner. Nested and
multiline list items retain explicit parent references, non-overlapping own
content, raw text, and deterministic line locators.

Home progress now distinguishes reading, source construction, semantic
interpretation, and validation/Review preparation. Extraction without a wired
interpreter stops truthfully at “awaiting interpretation”; only a successful
downstream callback can show Review-preparation success, and downstream failure
cannot leave a simultaneous success alert.

While interpretation is the current pending step, its timeline icon remains a
loading indicator. The adjacent status and privacy copy still state explicitly
that no Gemini request has started until the interpreter is wired.

Startup state now tracks the persisted active trip separately from a Golden
sample preview, so Viewer → Home → sample → Home keeps the real trip reachable.
Home also exposes confirmed-trip/checklist clearing and all-local-data clearing
as separately described, explicitly confirmed actions. The existing storage
schemas are unchanged: trip-only clearing preserves the credential, while
all-local-data clearing includes it and refreshes Home after success.

Finally, safe Gemini diagnostics recognize the adapter's allowlisted
`GeminiParseError` cancellation shape as `aborted` rather than `unexpected`.
Focused adapter, diagnostic, Home, and startup regression tests cover each
review correction.

## Prototype UI alignment correction

Home now follows the checked-in mobile and desktop prototypes rather than the
previous neutral card layout: the frozen light palette, Figtree/Caprasimo type
roles, single-column reading measure, pill mode switcher, rounded dashed upload
surface, visible browser-local Gemini key control, and vertical processing
steps are applied through the existing MUI/Tailwind boundary. The Golden viewer
uses the same frozen light token roles, while its real-use behavior remains
unchanged.

The Golden trip identity is consistently presented as `關西`; individual day
labels still retain their source-specific places. The generalized Result
templates now consume Presentation Projection only, and the shared frozen
semantic token source supplies both MUI and Tailwind light/dark roles.

## Styling ownership and documentation drift audit

Tailwind is now the primary authoring surface for static layout, spacing,
responsive composition, component visuals, and project tokens. MUI continues
to own accessible primitives and interaction behavior; `sx` is limited to MUI
internal selectors, theme-aware component states, or genuinely dynamic values
that Tailwind cannot express cleanly. Existing Golden/Home elements that
declared the same positioning, spacing, border, background, or blur properties
in both `className` and `sx` were reduced to one Tailwind-owned declaration so
rendering no longer depends on CSS injection order.

The documentation audit also corrected the root project overview and stale
`src/tripData.js` references after the strict TypeScript migration. Target
contracts for the live parser benchmark and production model pin remain
intentionally future-facing and are still represented by unchecked OpenSpec
tasks rather than being described as completed behavior.

## Review, activation, and generalized Result implementation

The integrated startup workflow now keeps one active trip and one session-only
candidate under the reducer. A configured provider-neutral parser may advance a
coverage-complete draft into the evidence-first Review surface; insufficient
results receive replace/cancel recovery and cannot enter normal Review.
Corrections, additions, deletions, and reverts retain user provenance and rerun
the deterministic draft/relationship checks. Confirmation rebuilds and
authoritatively validates CanonicalTrip, awaits the repository transaction, and
only then emits the reducer event that changes the active trip.

Generalized `ResultViewer` exposes Overview and Day only and accepts the pure
Presentation Projection. Its templates preserve time precision, flexible and
optional intent, relationships, transit, dependencies, unresolved states,
supporting references, and exact external URLs. Golden Overview/Day now use the
same projection templates; Golden Today, checklist, and reservations remain
isolated capabilities. Mobile/desktop Playwright coverage verifies Date Rail
operation, 44px controls, overflow, focus reorientation, safe links, runtime
degradation, and computed dark-mode contrast.

Production Gemini parsing remains gated. `VITE_GEMINI_MODEL` is deliberately
unset until the live External Markdown Benchmark #001 comparison passes and an
exact model/thinking-level decision is recorded. The development-only query
configuration exists solely for mocked end-to-end Review coverage and is
ignored by production builds.

## Final automated acceptance and scope audit

The completed non-live implementation passed 35 unit files / 169 tests, 6
component files / 28 tests, and the complete Playwright matrix with 41 passes
and one intentional desktop skip. The browser matrix covers mobile and desktop
Golden behavior, generalized Result, Review correction and activation,
credential handling, persistence rollback, reload, cancellation, clearing,
and durable-storage inspection. The production TypeScript/Vite build and
`git diff --check` also pass; Vite reports only its existing advisory for the
single bundle exceeding 500 kB.

The Golden regression pass includes pre-trip, during-trip, post-trip,
supported and unsupported NOW/NEXT states, runtime degradation, exact source
URLs, checklist/reservation synchronization, the pending USJ default, keyboard
date navigation, overflow, and 44 px targets. Shared Result date navigation
retains Golden's established tab names and keyboard behavior while generalized
Result keeps button-based Overview/Day navigation.

The final diff-based audit found no Hosted Delivery data model or Functions,
spreadsheet/PDF intake or export, accounts, multi-trip state, provider registry,
recommendations, or replanning implementation. No dependency manifest,
deployment configuration, or CI workflow file changed. Architecture guards continue to reject Result imports
from source/Review/provider/domain layers and JSX elements that assign the same
styling surface through both `className` and `sx`.

Tasks 9.7, 9.8, 14.2, 14.3, and 14.4 remain intentionally open because they
require a user-authorized live Gemini comparison plus human benchmark Review
and usability observations. Automated mocked coverage is not recorded as a
substitute for those acceptance gates.

`openspec validate build-trip-runtime-v0 --strict` passes after the Result UI
and functional contracts were synchronized with the implemented Review,
activation, navigation, styling-ownership, and production-model gate behavior.

## Post-implementation code-review corrections

The two-axis post-commit review found and corrected Review, confirmation, and
Result gaps without changing the approved architecture. Deterministic parser
finding snapshots are now replaced by current validator output. A
parser-specific blocker that cannot be mechanically revalidated requires an
explicit evidence-backed resolution and produces an exact-finding-ID,
session-only `USER_RESOLVED_FINDING` audit record; resolving one finding cannot
silently resolve another otherwise-identical finding. Trip-level correction
also presents its source evidence before editable fields.

Confirmation now remains in busy Review until the replacement transaction
commits, then presents a success surface whose Viewer and Home actions both use
the reducer-owned newly active trip. Result mobile reading order places
readiness and critical anchors before the Day index, and Date Rail keeps the
active date visible after initial or programmatic changes.

Review and Result static layout/visual styling now use Tailwind classes rather
than MUI system props. The styling architecture test scans those feature trees
for prohibited static MUI layout props in addition to rejecting mixed
`className`/`sx` ownership. Focused re-review confirmed all original Standards
findings and all five Spec findings resolved.
