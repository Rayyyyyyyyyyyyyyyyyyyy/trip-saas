# Deployment and travel reliability evidence — 2026-09-07

This record distinguishes controlled local policy evidence, repository release
configuration and the actual live host. No deployment was performed.

## Current deployment decision — 2026-09-08

The Golden Viewer now targets Netlify static hosting. Checked-in
`netlify.toml` runs `npm ci && npm run build` and publishes `dist`; the existing
`public/_headers` file is copied into that artifact for Netlify response-header
delivery. The HTML meta policy remains defense in depth. No Functions, Blob
storage, publication or recovery behavior is enabled, so gated Hosted Delivery
scope is unchanged.

No deployment was performed. The live Netlify URL, deployed commit and effective
response headers remain unavailable and must be verified after an explicitly
authorized release. The Pages observations below are preserved as historical
evidence and no longer describe the selected deployment target.

## Historical Pages entry and CSP assessment

The checked-in GitHub Pages workflow builds with `npm ci` and `npm run build`,
then uploads `dist`. GitHub Pages does not interpret the copied Netlify-style
`public/_headers` file. The actual `index.html` therefore carries the portable
CSP subset before any style or script:

- scripts, objects and frames: only same-origin scripts; objects and frames
  denied;
- network: same-origin plus the exact Gemini API origin;
- images/fonts/media/workers: explicit narrow sources only;
- inline styles remain permitted because the current MUI/Emotion integration
  requires them.

`frame-ancestors` is intentionally absent from the meta policy because browsers
ignore that directive in HTML meta. It remains in `_headers` for a future host
that actually supports response headers; clickjacking protection at the current
Pages host is a named response-header gap, not a claim of enforcement.

The initial strict production run found that runtime AJV compilation required
`unsafe-eval` and prevented the application from starting. Validators are now
generated at build time and bundled as ordinary ESM. The policy was not
weakened. Production-built Chrome, WebKit and Pixel 7 runs load the Home page,
MUI and local assets, allow the exact Gemini origin and block an unapproved
destination.

## Historical Pages release identity and gap

Repository HEAD during this check was
`9d1d4e5bdda623a90b8b4422c275f0875dad6f68`; the tested bundle includes local
uncommitted successor work and is not a deployed artifact.

The inferred Pages URL
`https://Rayyyyyyyyyyyyyyyyyyyy.github.io/oosaka-trip/` returned GitHub's 404 on
2026-09-07. The latest workflow run inspected was `33841266592`, commit
`c4f6ba682dc5dbcf1435ee02202a872a899a848e`, and failed in
`actions/configure-pages@v5` after checkout, install and build succeeded. Upload
and deploy were skipped. The previous recorded successful workflow was
`33236860042` for commit `60016dbf572cf7efb165f80fdadcb33428426ca7`, but the
expected URL is no longer readable. Consequently there is no current hosted
HTTP-policy evidence and no claim that the new meta policy is live.

Named release-verification gap: enable/fix the existing Pages environment, then
verify the deployed commit, HTML hash and effective policy after an explicitly
authorized deployment.

## Mobile production measurements

One local production Pixel 7 run measured:

| Check | Observed |
| --- | ---: |
| Home visible from cold navigation | 199 ms |
| DOMContentLoaded / load | 105 ms / 105 ms |
| transferred resources at measurement point | 265,498 bytes |
| confirmed-trip visible after reload with 200 ms delay per intercepted request | 479 ms |

Built uncompressed artifact costs at this run:

| Artifact group | Bytes |
| --- | ---: |
| JavaScript | 1,007,516 |
| CSS | 100,570 |
| six local Noto TC font files | 7,072,776 |
| complete `dist` | 8,182,594 |

The measured flow remained usable and the confirmed trip reopened under the
controlled delay. Fonts use `font-display: swap`; none had completed as a
resource request at the early navigation measurement point. The font payload
and single large JavaScript chunk remain optimization opportunities, but the
observed run did not justify replacing frozen typography or broad architecture
during this correction. True offline reload is not implemented or claimed;
service-worker/offline capability remains outside this change.
