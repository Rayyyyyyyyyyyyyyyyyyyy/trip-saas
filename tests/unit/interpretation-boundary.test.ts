import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "src");
function filesUnder(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(path, entry.name))
      : entry.name.endsWith(".ts")
        ? [join(path, entry.name)]
        : [],
  );
}

describe("interpretation policy ownership", () => {
  it("keeps response validation and Reviewable Draft policy out of all provider adapters", () => {
    const forbidden =
      /evaluateTripGates|validateInterpretationResponse|validateParsedTripDraft|validateSemanticInterpretationResultSchema/;
    expect(
      filesUnder(join(root, "integrations")).filter((file) =>
        forbidden.test(readFileSync(file, "utf8")),
      ),
    ).toEqual([]);
  });

  it("exposes only structured unknown through the transport and no provider types through application ports", () => {
    const transport = readFileSync(
      join(root, "app/interpretationTransport.ts"),
      "utf8",
    );
    expect(transport).toContain("Promise<unknown>");
    for (const file of [
      "parseTrip.ts",
      "interpretTrip.ts",
      "interpretationTransport.ts",
    ]) {
      expect(readFileSync(join(root, "app", file), "utf8")).not.toMatch(
        /from\s+["'][^"']*(?:integrations|gemini)/,
      );
    }
  });
});
