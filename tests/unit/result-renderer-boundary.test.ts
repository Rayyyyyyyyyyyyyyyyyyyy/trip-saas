import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const rendererDirectory = resolve(process.cwd(), "src/features/result");
const forbiddenImports = [
  "/domain/source",
  "/domain/trip",
  "/features/import",
  "/features/review",
  "/integrations/gemini",
];

describe("Result renderer architecture boundary", () => {
  it("keeps Result components dependent on Presentation Projection only", () => {
    const violations = readdirSync(rendererDirectory)
      .filter(
        (file) =>
          file.startsWith("Result") &&
          file.endsWith(".tsx") &&
          file !== "createTripPresentation.ts",
      )
      .flatMap((file) => {
        const source = readFileSync(resolve(rendererDirectory, file), "utf8");
        return forbiddenImports
          .filter((forbidden) => source.includes(forbidden))
          .map((forbidden) => `${basename(file)} imports ${forbidden}`);
      });

    expect(violations).toEqual([]);
  });
});
