import { defineConfig, devices } from "@playwright/test";

import {
  BROWSER_TEST_GEMINI_MODEL,
  CONFIGURED_PARSER_BASE_URL,
  CONFIGURED_PARSER_PORT,
  UNCONFIGURED_PARSER_BASE_URL,
  UNCONFIGURED_PARSER_PORT,
} from "./tests/browser/appServers";

const specsMatching = (names: string[]) =>
  new RegExp(`(${names.join("|")})\\.spec\\.ts`);

// Specs that need a real browser engine for storage, credential, and platform
// behavior. The chromium viewport projects skip these entirely.
const platformOnlySpecNames = [
  "credential-key-compatibility",
  "credential-security-policy",
  "confirmed-trip-repository",
  "gemini-credential-repository",
  "persistence-storage-inspection",
  "repository-failure-cases",
];

// The platform projects additionally re-run the credential layout spec. It is
// a layout guarantee, so it also runs on the two chromium viewports rather
// than being platform-only.
const platformOnlySpecs = specsMatching(platformOnlySpecNames);
const platformSpecs = specsMatching([
  ...platformOnlySpecNames,
  "credential-ui-layout",
]);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: CONFIGURED_PARSER_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: platformOnlySpecs,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testIgnore: platformOnlySpecs,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "platform-chrome",
      testMatch: platformSpecs,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "platform-webkit",
      testMatch: platformSpecs,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: [
    {
      command: `VITE_GEMINI_MODEL=${BROWSER_TEST_GEMINI_MODEL} npm run dev -- --host 127.0.0.1 --port ${CONFIGURED_PARSER_PORT}`,
      url: CONFIGURED_PARSER_BASE_URL,
      reuseExistingServer: !process.env.CI,
    },
    // An explicitly empty model reproduces the production default, where no
    // accepted model is pinned and Gemini intake stays unavailable. The empty
    // process value also overrides any local `.env.development.local`.
    {
      command: `VITE_GEMINI_MODEL= npm run dev -- --host 127.0.0.1 --port ${UNCONFIGURED_PARSER_PORT}`,
      url: UNCONFIGURED_PARSER_BASE_URL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
