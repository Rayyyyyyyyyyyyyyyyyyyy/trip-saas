// The app decides whether Gemini intake exists from the build-time model
// configuration, so the two states need two servers. Playwright's default
// `baseURL` points at the configured build; the unconfigured build is reached
// by absolute URL from the one flow that must observe a missing parser.
function configuredPort(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return value;
}

export const CONFIGURED_PARSER_PORT = configuredPort(
  "TRIP_RUNTIME_CONFIGURED_TEST_PORT",
  4173,
);
export const UNCONFIGURED_PARSER_PORT = configuredPort(
  "TRIP_RUNTIME_UNCONFIGURED_TEST_PORT",
  4174,
);

export const CONFIGURED_PARSER_BASE_URL = `http://127.0.0.1:${CONFIGURED_PARSER_PORT}`;
export const UNCONFIGURED_PARSER_BASE_URL = `http://127.0.0.1:${UNCONFIGURED_PARSER_PORT}`;

export const BROWSER_TEST_GEMINI_MODEL = "gemini-test-model";
export const BROWSER_TEST_GEMINI_FALLBACK_MODEL =
  "gemini-fallback-test-model";
