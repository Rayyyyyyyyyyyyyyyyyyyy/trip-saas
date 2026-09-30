# Requirement-to-task traceability audit

Audited before contract implementation for task 1.8. Task numbers refer to `tasks.md`. “Implementation” owns the product behavior; “verification” supplies an automated check, benchmark gate, or explicit diff audit.

## Evidence-backed trip review

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Review requires a reviewable draft | 4.4, 10.8 | 9.6, 10.10 |
| Single-column evidence-first composition | 10.1 | 10.10, 10.11 |
| Material findings remain visible | 10.2 | 10.10 |
| Complete correction actions | 10.3–10.6 | 10.10, 10.11 |
| Independent state flags | 10.4 | 4.10, 10.10 |
| User override precedence | 4.5, 10.3, 10.7 | 10.10, 11.6 |
| Review findings update deterministically | 10.7 | 10.10 |
| Authoritative confirmation gate | 10.9, 11.1 | 11.6 |
| Review cancellation and failure are non-destructive | 7.4, 10.9, 11.1 | 7.7, 10.11, 11.6 |
| Responsive and accessible action parity | 10.1, 10.3–10.6 | 10.11 |

## Local canonical trip

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Confirmed CanonicalTrip is local product truth | 2.4, 4.5, 11.1 | 2.5, 11.6 |
| One active trip and one candidate session | 7.4 | 7.7, 11.6 |
| Atomic active-trip replacement | 6.1, 11.1 | 6.6, 11.6 |
| Validated startup loading | 6.1, 7.5 | 6.6, 7.7 |
| Canonical JSON import without parsing | 11.3, 11.4 | 11.6 |
| No Canonical JSON export in V0 | 11.3 (import-only surface) | 11.5, 14.6 |
| Separate clearing scopes | 6.3 | 6.6, 14.5 |
| Trip-scoped checklist compatibility | 6.4 | 6.6, 13.3 |
| Session-only sensitive source state | 6.1 (allowlisted trip records), 7.4 (in-memory candidate) | 6.5, 11.6, 14.5 |

## Markdown source intake

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Home-first Markdown entry | 7.5, 8.1, 8.8, 13.1 | 8.11, 13.1 |
| One normalized Markdown input contract | 2.1, 8.4 | 2.5, 8.10 |
| Operable pasted-text input | 8.3 | 8.11 |
| Early source validation | 8.4 | 8.10, 8.11 |
| Structure-preserving Markdown extraction | 8.5, 8.6 | 8.9, 8.10 |
| Stable source evidence | 8.5, 8.6 | 8.9, 8.10 |
| Truthful progress and privacy guidance | 8.7 | 8.11 |
| Intake failure preserves confirmed data | 7.4, 8.4 | 7.7, 8.11 |
| Accurate format scope | 8.7, 8.8 | 8.11, 14.6 |

## Trip Result UI

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Canonical-only presentation boundary | 3.3, 12.1 | 12.12, 13.2 |
| Home and Viewer entry behavior | 7.4, 7.5 | 7.7, 11.6 |
| Overview trip compression | 12.2 | 12.12, 13.2 |
| Day semantic reading order | 12.3 | 12.12, 13.2 |
| Visual precision does not exceed source precision | 4.6, 12.7 | 4.9, 12.12 |
| Flexible and optional intent remains non-task-like | 4.7, 12.4 | 4.10, 12.12 |
| Relationships remain structured | 4.7, 12.5 | 4.10, 12.12 |
| Transit is connective tissue | 4.8, 12.6 | 4.10, 12.12 |
| Readiness is distinct from completion | 4.8, 12.6 | 4.10, 12.12 |
| Exact source actions are preserved safely | 4.8, 12.10 | 3.2, 12.12, 13.3 |
| Responsive composition preserves capability parity | 12.8 | 12.13 |
| Approved semantic visual system | 12.9 | 12.13 |
| Runtime and navigation scope degrades safely | 3.4, 12.11 | 1.3, 1.4, 12.13, 13.3 |
| Golden Viewer remains an explicit fallback | 3.1, 13.1, 13.2 | 1.3, 1.4, 13.2, 13.3 |
| Result UI accessibility and integrity | 12.8, 12.9 | 12.13, 13.4 |

## Trip semantic interpretation

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Provider-neutral interpretation boundary | 9.1, 9.2 | 9.6 |
| One Gemini adapter in V0 | 9.1, 9.2, 9.8 | 9.6, 14.6 |
| Executable versioned response schemas | 2.2, 2.3 | 2.5, 2.6 |
| Discriminated interpretation outcomes | 2.3, 9.4 | 2.5, 9.6 |
| Complete evidence-unit accounting (v1 serialized fields remain block-named) | 4.1, 9.5 | 9.6, 14.2 |
| Conservative semantic preservation | 2.2, 4.2, 4.3 | 4.9, 4.10, 9.7, 14.2 |
| Deterministic response and draft gates | 4.1–4.4, 9.4 | 2.5, 9.6, 14.2 |
| Browser-local Gemini credential boundary | 5.1, 5.2, 6.2 | 5.4, 6.6, 14.5 |
| Credential transmission containment | 5.3, 5.4, 9.2 | 5.4, 9.6, 14.5 |
| Safe Gemini request behavior | 9.2, 9.3 | 9.6 |

## Blocking decision gates

| Design question | Decision gate | Dependent work blocked until |
| --- | --- | --- |
| Stable Gemini model and thinking level | 9.7 comparison, then 9.8 explicit pass/fail pin decision | Production model pinning and final parser acceptance |
| Markdown byte/block/token limits | 1.6 frozen benchmark inputs; 8.4 source-limit implementation; 9.3 measured token/size preflight | Release acceptance in 14.1–14.2; limits must be recorded before those tasks pass |
| Deployment CSP for direct Gemini | 5.3 | Credential/provider connection work in 6.2 and 9.2 |
| Persistent non-exportable Web Crypto support | 5.1 compatibility spike and 5.2 recorded contract | Credential repository work in 6.2 |

## Negative-scope and checkpoint audit

- Golden regression gates occur at 1.3–1.5, 3.5, 6.7, 9.9, 11.7, 13.3–13.4, and 14.1.
- Benchmark preparation (1.6) precedes model comparison/pinning (9.7–9.8).
- Credential feasibility/CSP/redaction (5.1–5.4) precede credential and live provider implementation (6.2, 9.2).
- Final scope verification is measurable and diff-based in 14.6; it checks Hosted Delivery, spreadsheet/PDF, account, multi-trip, provider-registry, recommendation, and replanning exclusions.
- No traceability exception remains open at this audit. Any later normative task change must update this matrix before dependent implementation continues.
