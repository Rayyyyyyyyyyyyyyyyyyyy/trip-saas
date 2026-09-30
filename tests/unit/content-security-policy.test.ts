import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const GEMINI_API_ORIGIN = "https://generativelanguage.googleapis.com";
const netlifyHeaders = readFileSync(
  new URL("../../public/_headers", import.meta.url),
  "utf8",
);
const applicationEntry = readFileSync(
  new URL("../../index.html", import.meta.url),
  "utf8",
);
const netlifyConfig = readFileSync(
  new URL("../../netlify.toml", import.meta.url),
  "utf8",
);
const policyMatch = netlifyHeaders.match(/Content-Security-Policy:\s*(.+)/);
const productionContentSecurityPolicy = policyMatch?.[1]?.trim() ?? "";
const metaPolicyMatch = applicationEntry.match(
  /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
);
const applicationEntryPolicy = metaPolicyMatch?.[1]?.trim() ?? "";

function parseDirectives(policy: string) {
  return new Map(
    policy.split(";").map((rawDirective) => {
      const [name, ...values] = rawDirective.trim().split(/\s+/);
      return [name, values] as const;
    }),
  );
}

describe("production Content Security Policy", () => {
  it("allows credential-bearing connections only to self and Gemini", () => {
    const directives = parseDirectives(productionContentSecurityPolicy);

    expect(directives.get("connect-src")).toEqual([
      "'self'",
      GEMINI_API_ORIGIN,
    ]);
    expect(productionContentSecurityPolicy).not.toContain("connect-src *");
    expect(productionContentSecurityPolicy).not.toContain("http:");
  });

  it("uses a Netlify response header and blocks executable and embedding sources", () => {
    const directives = parseDirectives(productionContentSecurityPolicy);

    expect(netlifyHeaders).toMatch(/^\/\*\n\s+Content-Security-Policy:/);
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("script-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("frame-src")).toEqual(["'none'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
  });

  it("configures the actual Netlify static build and publish directory", () => {
    expect(netlifyConfig).toContain('command = "npm ci && npm run build"');
    expect(netlifyConfig).toContain('publish = "dist"');
    expect(netlifyConfig).not.toContain("functions");
  });

  it("keeps a portable defense-in-depth subset in the HTML entry", () => {
    const directives = parseDirectives(applicationEntryPolicy);

    expect(
      applicationEntry.indexOf('http-equiv="Content-Security-Policy"'),
    ).toBeLessThan(applicationEntry.indexOf("<style>"));
    expect(directives.get("connect-src")).toEqual([
      "'self'",
      GEMINI_API_ORIGIN,
    ]);
    expect(directives.get("script-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("frame-src")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    // Browsers ignore frame-ancestors in a meta policy. Netlify delivers it
    // through the response-header artifact instead.
    expect(directives.has("frame-ancestors")).toBe(false);
  });
});
