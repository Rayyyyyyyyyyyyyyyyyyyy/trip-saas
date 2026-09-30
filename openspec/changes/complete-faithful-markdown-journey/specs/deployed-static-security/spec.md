## ADDED Requirements

### Requirement: CSP delivery matches the real static entry
The current Netlify static deployment SHALL deliver the intended CSP through `public/_headers`, with the HTML meta policy retained only as a portable defense-in-depth subset. Acceptance MUST inspect the production-built entry and distinguish checked-in configuration from the effective live response; configuration alone MUST NOT count as deployed proof. This work MUST NOT enable Hosted Delivery Functions, Blob storage, publication or recovery behavior.

#### Scenario: Production uses the checked-in Netlify static configuration
- **WHEN** Netlify runs the locked build command and publishes `dist`
- **THEN** the artifact contains the intended response-header policy and HTML fallback, while live header enforcement is claimed only after inspecting the deployed response

#### Scenario: Browser security checks pass on a special fixture
- **WHEN** an isolated fixture blocks an unapproved destination
- **THEN** that result is recorded as fixture evidence and deployment acceptance still requires checking the actual built entry and the applicable live deployment boundary

### Requirement: Security changes preserve legitimate browser behavior
CSP changes SHALL preserve approved same-origin assets, direct Gemini requests, MUI/Emotion styling and browser-local confirmed-trip reading. They MUST NOT broaden script or connection destinations arbitrarily or expose credentials in URLs/logs. Release evidence SHALL distinguish local built-entry checks from live response-header observations.

#### Scenario: Existing trip opens without provider access
- **WHEN** the browser has a confirmed trip and Gemini is unavailable or its credential is absent
- **THEN** the confirmed trip remains readable while unauthorized connections remain blocked by the delivered policy
