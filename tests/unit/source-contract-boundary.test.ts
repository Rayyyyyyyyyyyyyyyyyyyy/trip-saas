import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "@babel/parser";

import { createReviewEvidenceProjection } from "../../src/domain/source/reviewEvidence";
import { validateUnifiedSourceDocumentSchema } from "../../src/domain/source/schemaValidators";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import {
  validMarkdownSourceDocument,
  validTabularSourceDocument,
} from "../fixtures/contracts/sourceDocuments";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

const srcRoot = resolve(process.cwd(), "src");

// Everything outside the Markdown feature must reach the source contract
// through its source-domain owner. A new source format then changes one
// adapter instead of App, provider, Review, and Result code.
const consumerDirectories = [
  "app",
  "features/review",
  "features/result",
  "integrations",
];

function sourceFilesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [entryPath] : [];
  });
}

describe("Source contract architecture boundary", () => {
  it("keeps the source-neutral contract out of the Markdown feature", () => {
    const adapter = readFileSync(
      resolve(srcRoot, "features/import/markdownSourceAdapter.ts"),
      "utf8",
    );
    const reExported = [
      "export type UnifiedSourceDocument",
      "export type UnifiedSourceBlock",
      "export type SourceEvidenceUnit",
      "export type SourceLink",
      "export type SourceAssetFinding",
      "export type SourceExtractionFinding",
    ].filter((declaration) => adapter.includes(declaration));

    expect(reExported).toEqual([]);
  });

  it("routes every consumer at the source domain, not the Markdown adapter", () => {
    const violations = consumerDirectories
      .flatMap((directory) => sourceFilesUnder(resolve(srcRoot, directory)))
      .filter((file) => {
        const ast = parse(readFileSync(file, "utf8"), {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });
        return ast.program.body.some((statement) => {
          if (
            statement.type !== "ImportDeclaration" ||
            !statement.source.value.includes("markdownSourceAdapter")
          )
            return false;
          // The app owns extraction orchestration. Only its runtime extraction
          // function crosses this seam; all shared types come from domain/source.
          return (
            !relative(srcRoot, file).startsWith("app/") ||
            statement.importKind === "type" ||
            statement.specifiers.some(
              (item) =>
                item.type !== "ImportSpecifier" ||
                item.importKind === "type" ||
                item.imported.type !== "Identifier" ||
                item.imported.name !== "extractMarkdownSource",
            )
          );
        });
      })
      .map(
        (file) => `${relative(srcRoot, file)} imports markdownSourceAdapter`,
      );

    expect(violations).toEqual([]);
  });

  it("keeps Markdown AST dependencies inside the Markdown adapter", () => {
    const violations = sourceFilesUnder(srcRoot)
      .filter(
        (file) =>
          !file.endsWith("features/import/markdownSourceAdapter.ts") &&
          /from "(mdast|remark-[a-z]+|unified)"/.test(
            readFileSync(file, "utf8"),
          ),
      )
      .map((file) => `${relative(srcRoot, file)} imports a Markdown parser`);

    expect(violations).toEqual([]);
  });

  it("keeps tabular extraction inside its adapter and source domain", () => {
    expect(
      validateUnifiedSourceDocumentSchema(validTabularSourceDocument),
    ).toEqual({ valid: true, errors: [] });

    // The source domain declares/validates it. The one trip-domain derivation
    // may read it after response gates; adapters, features, providers, and
    // Result remain forbidden until their later task groups.
    const leaked = sourceFilesUnder(srcRoot)
      .filter((file) => readFileSync(file, "utf8").includes('"tabular_region"'))
      .map((file) => relative(srcRoot, file))
      .filter(
        (file) =>
          !file.startsWith("domain/source/") &&
          file !== "domain/trip/deriveSupportingGroups.ts" &&
          file !== "features/import/spreadsheetSourceAdapter.ts",
      );

    expect(leaked).toEqual([]);
  });

  it("keeps SheetJS library imports inside the spreadsheet adapter", () => {
    const leaked = sourceFilesUnder(srcRoot)
      .filter((file) =>
        /from ["']xlsx(?:\/[^"']*)?["']/u.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(srcRoot, file));
    expect(leaked).toEqual(["features/import/spreadsheetSourceAdapter.ts"]);
  });

  it("keeps Result free of the source domain", () => {
    const violations = sourceFilesUnder(resolve(srcRoot, "features/result"))
      .filter((file) => readFileSync(file, "utf8").includes("/domain/source"))
      .map((file) => `${relative(srcRoot, file)} imports the source domain`);

    expect(violations).toEqual([]);
  });

  it("retains only opaque source trace while excluding content-bearing evidence", () => {
    const gate = validateUnifiedSourceDocument(validMarkdownSourceDocument, {
      source_id: validMarkdownSourceDocument.source_id,
    });
    if (!gate.valid) throw new Error("fixture must satisfy the source gate");
    const evidence = createReviewEvidenceProjection(gate.document);

    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].source_refs = [gate.document.evidence_units[0].id];
    const canonical = buildCanonicalTrip(draft, {
      sourceId: gate.document.source_id,
    });
    const serialized = JSON.stringify(canonical);
    const forbidden = [
      ...gate.document.evidence_units.flatMap((unit) => [
        unit.locator,
        unit.raw_value,
      ]),
      ...evidence
        .itemsFor(gate.document.evidence_units.map((unit) => unit.id))
        .map((item) => JSON.stringify(item)),
      "evidence_units",
      "extraction_findings",
      "source_refs",
      "unified-source-document",
    ];

    expect(forbidden.filter((value) => serialized.includes(value))).toEqual([]);
    expect(canonical.entities[0].provenance).toEqual({
      origin: "source",
      overridden_fields: [],
      source_id: gate.document.source_id,
      locator_refs: [gate.document.evidence_units[0].id],
    });
  });
});
