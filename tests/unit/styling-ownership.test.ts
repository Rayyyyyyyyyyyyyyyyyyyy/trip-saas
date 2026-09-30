import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";

type StylingOwnershipViolation = {
  attribute?: string;
  column: number;
  file: string;
  line: number;
  tag: string;
};

const staticMuiSystemProps = new Set([
  "alignItems",
  "disableGutters",
  "direction",
  "display",
  "elevation",
  "flexWrap",
  "fontSize",
  "fontWeight",
  "fullWidth",
  "gap",
  "height",
  "justifyContent",
  "lineHeight",
  "m",
  "margin",
  "maxHeight",
  "maxWidth",
  "mb",
  "minHeight",
  "minWidth",
  "ml",
  "mr",
  "mt",
  "mx",
  "my",
  "p",
  "padding",
  "pb",
  "pl",
  "pr",
  "pt",
  "px",
  "py",
  "spacing",
  "width",
]);

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getJsxName(node: unknown): string {
  if (!isRecord(node) || typeof node.type !== "string") return "<unknown>";
  if (node.type === "JSXIdentifier" && typeof node.name === "string") {
    return node.name;
  }
  if (node.type === "JSXMemberExpression") {
    return `${getJsxName(node.object)}.${getJsxName(node.property)}`;
  }
  if (node.type === "JSXNamespacedName") {
    return `${getJsxName(node.namespace)}:${getJsxName(node.name)}`;
  }
  return "<unknown>";
}

function getJsxAttributeName(attribute: unknown): string | undefined {
  if (!isRecord(attribute) || attribute.type !== "JSXAttribute") {
    return undefined;
  }
  const name = attribute.name;
  if (!isRecord(name) || name.type !== "JSXIdentifier") return undefined;
  return typeof name.name === "string" ? name.name : undefined;
}

function findMixedClassNameAndSx(
  file: string,
  sourceText: string,
): StylingOwnershipViolation[] {
  const sourceFile = parse(sourceText, {
    plugins: ["jsx", "typescript"],
    sourceFilename: file,
    sourceType: "module",
  });
  const violations: StylingOwnershipViolation[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;

    if (value.type === "JSXOpeningElement") {
      const attributes = Array.isArray(value.attributes)
        ? value.attributes
        : [];
      const names = new Set(attributes.map(getJsxAttributeName));

      if (names.has("className") && names.has("sx")) {
        const mixedAttribute = attributes.find(
          (attribute) => getJsxAttributeName(attribute) === "sx",
        );
        const location = isRecord(mixedAttribute)
          ? mixedAttribute.loc
          : undefined;
        const start = isRecord(location) ? location.start : undefined;
        violations.push({
          column:
            isRecord(start) && typeof start.column === "number"
              ? start.column + 1
              : 0,
          file,
          line:
            isRecord(start) && typeof start.line === "number" ? start.line : 0,
          tag: getJsxName(value.name),
        });
      }
    }

    Object.entries(value).forEach(([key, child]) => {
      if (!["loc", "start", "end", "extra"].includes(key)) visit(child);
    });
  }

  visit(sourceFile.program);
  return violations;
}

function findStaticMuiSystemProps(
  file: string,
  sourceText: string,
): StylingOwnershipViolation[] {
  const sourceFile = parse(sourceText, {
    plugins: ["jsx", "typescript"],
    sourceFilename: file,
    sourceType: "module",
  });
  const muiNames = new Set<string>();
  const violations: StylingOwnershipViolation[] = [];

  for (const statement of sourceFile.program.body) {
    if (
      statement.type !== "ImportDeclaration" ||
      statement.source.value !== "@mui/material"
    ) {
      continue;
    }
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier") {
        muiNames.add(specifier.local.name);
      }
    }
  }

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;

    if (value.type === "JSXOpeningElement") {
      const tag = getJsxName(value.name);
      if (muiNames.has(tag)) {
        const attributes = Array.isArray(value.attributes)
          ? value.attributes
          : [];
        for (const attribute of attributes) {
          const name = getJsxAttributeName(attribute);
          if (!name || !staticMuiSystemProps.has(name)) continue;
          const location = isRecord(attribute) ? attribute.loc : undefined;
          const start = isRecord(location) ? location.start : undefined;
          violations.push({
            attribute: name,
            column:
              isRecord(start) && typeof start.column === "number"
                ? start.column + 1
                : 0,
            file,
            line:
              isRecord(start) && typeof start.line === "number"
                ? start.line
                : 0,
            tag,
          });
        }
      }
    }

    Object.entries(value).forEach(([key, child]) => {
      if (!["loc", "start", "end", "extra"].includes(key)) visit(child);
    });
  }

  visit(sourceFile.program);
  return violations;
}

describe("Tailwind and MUI styling ownership", () => {
  it("detects an element that mixes className and sx", () => {
    expect(
      findMixedClassNameAndSx(
        "example.tsx",
        '<Paper className="sticky top-0" sx={{ position: "sticky" }} />',
      ),
    ).toEqual([
      {
        column: 33,
        file: "example.tsx",
        line: 1,
        tag: "Paper",
      },
    ]);
  });

  it("keeps every source JSX element under one styling owner", () => {
    const workspaceRoot = process.cwd();
    const sourceRoot = resolve(workspaceRoot, "src");
    const violations = collectTsxFiles(sourceRoot).flatMap((file) =>
      findMixedClassNameAndSx(file, readFileSync(file, "utf8")).map(
        (violation) => ({
          ...violation,
          file: relative(workspaceRoot, violation.file),
        }),
      ),
    );

    expect(
      violations,
      "Use Tailwind className for static styling and keep MUI sx on a separate element or remove the duplicate declaration.",
    ).toEqual([]);
  });

  it("detects static MUI system styling outside Tailwind ownership", () => {
    expect(
      findStaticMuiSystemProps(
        "example.tsx",
        'import { Stack } from "@mui/material"; <Stack direction="row" spacing={2} />',
      ),
    ).toEqual([
      {
        attribute: "direction",
        column: 47,
        file: "example.tsx",
        line: 1,
        tag: "Stack",
      },
      {
        attribute: "spacing",
        column: 63,
        file: "example.tsx",
        line: 1,
        tag: "Stack",
      },
    ]);
  });

  it("keeps Review and Result static styling in Tailwind classes", () => {
    const workspaceRoot = process.cwd();
    const featureRoots = [
      resolve(workspaceRoot, "src/features/review"),
      resolve(workspaceRoot, "src/features/result"),
    ];
    const violations = featureRoots.flatMap((featureRoot) =>
      collectTsxFiles(featureRoot).flatMap((file) =>
        findStaticMuiSystemProps(file, readFileSync(file, "utf8")).map(
          (violation) => ({
            ...violation,
            file: relative(workspaceRoot, violation.file),
          }),
        ),
      ),
    );

    expect(
      violations,
      "Use Tailwind className for static layout and visuals; reserve MUI props for behavior and theme-aware or dynamic values.",
    ).toEqual([]);
  });
});
