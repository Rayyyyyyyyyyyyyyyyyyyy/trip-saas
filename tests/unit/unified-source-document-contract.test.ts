import { describe, expect, it } from "vitest";

import { validateUnifiedSourceDocumentSchema } from "../../src/domain/source/schemaValidators";
import {
  evidenceUnitIds,
  sourceExpectationFor,
} from "../../src/domain/source/sourceCoverage";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import {
  validMarkdownSourceDocument,
  validTabularSourceDocument,
} from "../fixtures/contracts/sourceDocuments";

const clone = <T>(value: T): T => structuredClone(value);

const failureCodes = (value: unknown, expectedSourceId: string) => {
  const result = validateUnifiedSourceDocument(value, {
    source_id: expectedSourceId,
  });
  return result.valid ? [] : result.failures.map((failure) => failure.code);
};

describe("UnifiedSourceDocument schema", () => {
  it("accepts a complete Markdown extraction", () => {
    expect(
      validateUnifiedSourceDocumentSchema(validMarkdownSourceDocument),
    ).toEqual({ valid: true, errors: [] });
  });

  it("accepts the dormant tabular evidence variant", () => {
    expect(
      validateUnifiedSourceDocumentSchema(validTabularSourceDocument),
    ).toEqual({ valid: true, errors: [] });
  });

  it("rejects undeclared top-level and evidence-unit members", () => {
    const providerLeak = {
      ...clone(validMarkdownSourceDocument),
      model: "gemini-3.5-flash",
    };
    const uiLeak = clone(validMarkdownSourceDocument) as any;
    uiLeak.evidence_units[0].selected = true;
    const structuralLeak = clone(validMarkdownSourceDocument) as any;
    structuralLeak.evidence_units[0].structural_evidence[0].raw_node = {};

    expect(validateUnifiedSourceDocumentSchema(providerLeak).valid).toBe(false);
    expect(validateUnifiedSourceDocumentSchema(uiLeak).valid).toBe(false);
    expect(validateUnifiedSourceDocumentSchema(structuralLeak).valid).toBe(
      false,
    );
  });

  it("requires a stable locator on every evidence unit", () => {
    const absent = clone(validMarkdownSourceDocument) as any;
    delete absent.evidence_units[1].locator;
    const blank = clone(validMarkdownSourceDocument);
    blank.evidence_units[1].locator = "";

    expect(validateUnifiedSourceDocumentSchema(absent).valid).toBe(false);
    expect(validateUnifiedSourceDocumentSchema(blank).valid).toBe(false);
  });

  it("keeps the structural-evidence variants discriminated", () => {
    const mixed = clone(validMarkdownSourceDocument) as any;
    mixed.evidence_units[0].structural_evidence[0].sheet_id = "sheet:Day1";

    expect(validateUnifiedSourceDocumentSchema(mixed).valid).toBe(false);
  });
});

describe("UnifiedSourceDocument integrity gate", () => {
  it("brands a schema-valid, internally consistent document", () => {
    const result = validateUnifiedSourceDocument(validMarkdownSourceDocument, {
      source_id: "source:fixture-001",
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.document.evidence_units).toHaveLength(3);
    }
  });

  it("rejects duplicate evidence-unit identifiers", () => {
    const duplicate = clone(validMarkdownSourceDocument);
    duplicate.evidence_units[1].id = duplicate.evidence_units[0].id;

    expect(failureCodes(duplicate, "source:fixture-001")).toContain(
      "duplicate_evidence_id",
    );
  });

  it("rejects a broken source order", () => {
    const reordered = clone(validMarkdownSourceDocument);
    reordered.evidence_units[2].source_order = 5;

    expect(failureCodes(reordered, "source:fixture-001")).toContain(
      "invalid_source_order",
    );
  });

  it("rejects an unresolvable parent reference", () => {
    const orphan = clone(validMarkdownSourceDocument);
    orphan.evidence_units[1].parent_ref = "source:fixture-001:unit:9999";

    expect(failureCodes(orphan, "source:fixture-001")).toContain(
      "invalid_reference",
    );
  });

  it("rejects an unresolvable tabular header reference", () => {
    const orphanHeader = clone(validTabularSourceDocument) as any;
    orphanHeader.evidence_units[1].structural_evidence[0].header_ref =
      "source:fixture-002:unit:9999";

    expect(failureCodes(orphanHeader, "source:fixture-002")).toContain(
      "invalid_reference",
    );
  });

  it("rejects a hierarchy cycle", () => {
    const cycle = clone(validMarkdownSourceDocument);
    cycle.evidence_units[0].parent_ref = cycle.evidence_units[1].id;

    expect(failureCodes(cycle, "source:fixture-001")).toContain(
      "hierarchy_cycle",
    );
  });

  it("rejects a document whose source identity disagrees with its input", () => {
    expect(
      failureCodes(validMarkdownSourceDocument, "source:fixture-999"),
    ).toContain("source_id_mismatch");
  });

  it("rejects an extraction finding that misreports its locator", () => {
    const driftedFinding = clone(validMarkdownSourceDocument);
    driftedFinding.extraction_findings[0].locator = "paste:lines:99-99";

    expect(failureCodes(driftedFinding, "source:fixture-001")).toContain(
      "invalid_reference",
    );
  });

  it("reports a schema failure without running integrity checks", () => {
    const malformed = clone(validMarkdownSourceDocument) as any;
    delete malformed.evidence_units[0].locator;
    malformed.evidence_units[1].id = malformed.evidence_units[0].id;

    expect(failureCodes(malformed, "source:fixture-001")).toEqual([
      "schema_invalid",
    ]);
  });
});

describe("Source coverage expectation", () => {
  const validated = (document: unknown, sourceId: string) => {
    const result = validateUnifiedSourceDocument(document, {
      source_id: sourceId,
    });
    if (!result.valid) throw new Error("fixture must validate");
    return result.document;
  };

  it("derives the expectation from evidence-unit identity in source order", () => {
    const document = validated(
      validMarkdownSourceDocument,
      "source:fixture-001",
    );

    expect(evidenceUnitIds(document)).toEqual([
      "source:fixture-001:unit:0001",
      "source:fixture-001:unit:0002",
      "source:fixture-001:unit:0003",
    ]);
  });

  it("maps evidence-unit identity onto the frozen coverage field name", () => {
    const document = validated(
      validTabularSourceDocument,
      "source:fixture-002",
    );

    expect(sourceExpectationFor(document)).toEqual({
      source_id: "source:fixture-002",
      schema_version: "unified-source-document.v1",
      block_ids: [
        "source:fixture-002:unit:0001",
        "source:fixture-002:unit:0002",
      ],
    });
  });
});
