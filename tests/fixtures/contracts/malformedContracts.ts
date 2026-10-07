// Sanitized reproduction of the External Markdown Benchmark #001 contract failure.
// Only the malformed interpretation shape is kept: no credentials, thought
// signatures, provider response metadata, or raw source content.

export const summaryShapedInterpretationResult = {
  schema_version: "semantic-interpretation-result.v2",
  source_schema_version: "unified-source-document.v1",
  source_id: "source:fixture-001",
  status: "draft",
  draft: {
    title: "Kansai itinerary",
    date_range: "2026-09-10 — 2026-09-12",
    flights: "Outbound and return flights summarised as prose.",
    days: "Day-by-day plan summarised as prose.",
  },
  findings: [],
  coverage: {
    total_blocks: 1,
    block_dispositions: [
      { source_ref: "source-block:001", disposition: "interpreted" },
    ],
    unparsed_items: [],
  },
};
