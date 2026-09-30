# Deployed Static Security Specification

## Purpose

Define CSP delivery and verification for the actual static entry without enabling Hosted Delivery.

## Requirements

### Requirement: CSP delivery matches the real static entry
The current static deployment SHALL deliver the intended CSP through a mechanism supported by its actual host. Acceptance MUST inspect the production-built entry and its effective policy rather than only a policy string or dedicated fixture. Header-only directive limitations MUST be recorded explicitly; a Netlify configuration file alone MUST NOT count as proof for the Pages entry. This work MUST NOT enable Hosted Delivery.

#### Scenario: Production uses the checked-in Pages workflow
- **WHEN** the application is built for that static workflow
- **THEN** the delivered entry has an effective supported policy restricting executable/connection destinations and any unavailable header-only protections are stated without claiming them enforced

#### Scenario: Browser security checks pass on a special fixture
- **WHEN** an isolated fixture blocks an unapproved destination
- **THEN** that result is recorded as fixture evidence and deployment acceptance still requires checking the actual built entry and applicable live deployment boundary

### Requirement: Security changes preserve legitimate browser behavior
CSP changes SHALL preserve approved same-origin assets, direct Gemini requests, MUI/Emotion styling and browser-local confirmed-trip reading. They MUST NOT broaden script or connection destinations arbitrarily or expose credentials in URLs/logs. Release evidence SHALL distinguish local built-entry checks from live response-header observations.

#### Scenario: Existing trip opens without provider access
- **WHEN** the browser has a confirmed trip and Gemini is unavailable or its credential is absent
- **THEN** the confirmed trip remains readable while unauthorized connections remain blocked by the delivered policy
