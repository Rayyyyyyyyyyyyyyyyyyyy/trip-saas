# Gemini model selection research for Markdown interpretation

Date: 2026-09-08
Scope: choose one Google Gemini model candidate for this repository's
`UnifiedSourceDocument -> SemanticInterpretationResult -> ParsedTripDraft`
pipeline. This note does not activate a model, change production code, or claim
parser acceptance.

Only first-party Google Gemini API documentation, API reference, pricing,
release, and deprecation pages are used for provider facts.

## Recommendation

Evaluate exact stable model ID **`gemini-3.8-flash`**, starting with
**`thinkingLevel: "medium"`**, as the replacement acceptance candidate.

Do not activate it as the production default merely because it is GA. First run
the existing generated-schema checks, deterministic parser fixtures, and the
live External Markdown Benchmark #001 against this exact ID. Keep the current
no-silent-fallback rule.

Why this is the best candidate:

1. Google currently lists `gemini-3.8-flash` as a stable model and describes it
   as its most intelligent Flash model. The model page confirms structured
   outputs, a 1,048,576-token input limit, a 65,536-token output limit, and
   `low`, `medium`, and `high` thinking levels. It was updated in September
   2026. [Google model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
2. It is generally available, not preview or experimental, and Google's
   deprecation table currently shows no announced shutdown date.
   [Google deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations)
3. Through 2026-12-31 its standard paid price is the same as 3.7 Flash and 3.6
   Flash: USD $0.75 per million input tokens and $3.75 per million output tokens,
   with thinking tokens included in output billing. On 2027-01-01 the listed
   standard paid rates become $1.50 input and $7.50 output.
   [Google pricing](https://ai.google.dev/gemini-api/docs/pricing)
4. The repository's retained evidence shows that `gemini-3.5-flash` has not
   produced a qualifying original benchmark output. Moving to a newer, stronger
   stable Flash model is therefore a justified new candidate, while remaining a
   hypothesis until the same product-specific gate passes.

## Candidate comparison

Provider status and prices below are current as of 2026-09-08.

| Candidate | Provider status | Structured JSON | Thinking control | Context / max output | Standard paid text price per 1M tokens | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-3.8-flash` | Stable, GA; released 2026-09-02; no shutdown announced | Supported | `low`, `medium`, `high`; default is `medium`; `minimal` errors | 1,048,576 / 65,536 | $0.75 / $3.75 through 2026-12-31; $1.50 / $7.50 from 2027-01-01 | **Recommend for benchmark** |
| `gemini-3.7-flash` | Stable, GA; released 2026-08-13; no shutdown announced | Supported | `low`, `medium`, `high`; `minimal` errors | 1,048,576 / 65,536 | Same as 3.8 | Valid fallback candidate only after a separately authorized benchmark; Google now labels it previous-generation |
| `gemini-3.6-flash` | Stable, GA; released 2026-07-21; no shutdown announced | Supported | Supported | 1,048,576 / 65,536 | Same as 3.8 | Lower-priority comparison candidate; no price advantage over 3.8 during the introductory period |
| `gemini-3.5-flash` | Stable, GA; released 2026-05-19; no shutdown announced | Supported | Supported | 1,048,576 / 65,536 | $1.50 / $9.00 | Reject as current default: it failed this product's benchmark and is now costlier than 3.8 |
| `gemini-3.5-flash-lite` | Stable, GA; released 2026-07-21; no shutdown announced | Supported | Supported | 1,048,576 / 65,536 | $0.30 / $2.50 | Cost candidate, not trust-first default; Google positions it for low-cost document parsing and simple extraction |

Sources for the comparison:

- Model catalog and current generation ordering:
  [Google Gemini models](https://ai.google.dev/gemini-api/docs/models)
- Exact 3.8 capabilities and limits:
  [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- Exact 3.7 capabilities and limits:
  [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash)
- Exact 3.6 capabilities and limits:
  [Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
- Exact 3.5 capabilities and limits:
  [Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash)
- Flash-Lite positioning and limits:
  [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- Release dates and announced shutdowns:
  [Google deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations)
- Current and scheduled prices:
  [Google Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- 3.8 GA status, default thinking level, pricing transition, and migration
  guidance:
  [What's new in Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model)

The comparison deliberately excludes `gemini-3.1-pro-preview`: its preview
lifecycle is inappropriate for the repository's exact-stable-production rule.
It also excludes image, audio, Live, and embedding endpoints because the V0
interpreter requires text output with structured JSON, not those modalities.

## Fit with the existing transport

The current repository transport sends:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
x-goog-api-key: <personal credential>
Content-Type: application/json
```

Its request body uses:

```json
{
  "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseJsonSchema": {},
    "thinkingConfig": { "thinkingLevel": "medium" }
  }
}
```

This is transport-compatible with `gemini-3.8-flash`:

- Google's current GenerateContent guide shows the exact
  `v1beta/models/gemini-3.8-flash:generateContent` REST path and
  `x-goog-api-key` header.
  [Google GenerateContent text guide](https://ai.google.dev/gemini-api/docs/generate-content/text-generation)
- Google's API reference defines `responseMimeType`, `responseJsonSchema`, and
  `thinkingConfig` inside `GenerationConfig`.
  [GenerateContent API reference](https://ai.google.dev/api/generate-content)
- Google's thinking guide confirms Gemini 3.8 Flash accepts `low`, `medium`, and
  `high`; `minimal` is unsupported. Starting at `medium` matches Google's
  documented default and this repo's quality-first interpretation task.
  [Gemini thinking](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
- The 3.8 model page explicitly marks structured outputs as supported.
  [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)

Therefore selecting 3.8 does not inherently require an SDK migration or a move
to the newer Interactions API. The existing single-turn REST adapter can remain
the transport boundary during the benchmark. This is a compatibility finding,
not proof that the repository's generated provider schema will be accepted or
that the returned semantics will pass local validation.

## Structured-output implications

Structured outputs are appropriate for this use case: Google explicitly lists
data extraction and structured classification as target uses. However,
structured output only constrains shape. It does not establish factual or
semantic correctness, so the repository must retain its local schema, coverage,
fidelity, Reviewable Draft, and CanonicalTrip gates.
[Google structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

The provider supports only a subset of JSON Schema and warns that very large or
deeply nested schemas may be rejected. The repository's existing strategy of
sending a Gemini-compatible projection while validating the full authoritative
schema locally should remain unchanged.
[Google structured-output limitations](https://ai.google.dev/gemini-api/docs/structured-output#limitations)

## Browser and API-key boundary

There are two separate conclusions:

1. **Protocol compatibility: yes.** The official REST examples use the same
   HTTPS endpoint and `x-goog-api-key` header as the repository transport, so a
   browser `fetch` request can use the provider contract already implemented.
   [Google GenerateContent text guide](https://ai.google.dev/gemini-api/docs/generate-content/text-generation)
2. **Google's recommended production secret posture: no direct long-lived key
   in client code.** Google explicitly says not to expose Gemini API keys in web
   or mobile clients and recommends a backend proxy for client-side apps.
   [Using Gemini API keys — security guidance](https://ai.google.dev/gemini-api/docs/api-key#security_and_secret_management)

This repository's browser-local BYOK design is narrower than hardcoding a shared
owner key in the static bundle—the traveler supplies their own key and it is not
serialized into trip data—but page JavaScript must still access the credential
to send the request. That means the direct-browser design is technically
compatible but remains outside Google's recommended production secret pattern.
Model selection does not resolve that architecture risk. Any later move to a
backend proxy is a separate product/security decision and must not silently turn
on gated Hosted Delivery or transmit stored trip/source data beyond the
explicit parse request.

The current Google key guide also says new AI Studio keys are authorization keys
and announces rejection of standard keys beginning in September 2026. Before
live testing, verify that the supplied personal key is a current authorization
key; do not infer a model failure from a key-type rejection.
[Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)

## Required acceptance before connection becomes the default

Treat `gemini-3.8-flash` as a new candidate and rerun the same gates rather than
carrying forward 3.5 evidence:

1. Confirm the exact model ID is accepted through the current GenerateContent
   endpoint with the generated provider schema.
2. Run deterministic parser fixtures without weakening the authoritative local
   schema or semantic validation.
3. Run External Markdown Benchmark #001 at `low`, `medium`, and `high`, recording
   original pre-Review output separately for every level.
4. Require zero missing or invented critical events, zero unsupported exact
   critical dates/times/places, and every annotated ambiguity surfaced for
   Review.
5. Compare parser quality first, then latency and billed token usage. Start with
   `medium`; choose another thinking level only from measured evidence.
6. Activate one exact default only after the complete gate passes. Do not use a
   moving alias and do not silently fall back to 3.7, 3.6, 3.5, or Flash-Lite.

## Decision boundary

`gemini-3.8-flash` is the strongest currently documented stable Flash candidate
and fits the existing REST/schema/thinking contract. It should replace
`gemini-3.5-flash` as the **next benchmark candidate**, not immediately as the
accepted production default. The repository's prior 3.5 failures demonstrate
why provider capability and GA status are necessary but insufficient evidence
for a trustworthy trip interpreter.
