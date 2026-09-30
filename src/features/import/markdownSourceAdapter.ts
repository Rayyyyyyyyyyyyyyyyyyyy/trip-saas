import type { Nodes, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type {
  MarkdownStructuralEvidence,
  SourceEvidenceUnit,
  SourceExtractionFinding,
  SourceLink,
  UnifiedSourceDocument,
} from "../../domain/source/types";
import type { TextSourceInput } from "../../domain/trip/types";

// Markdown is one Source Adapter. The document, evidence-unit, link, and
// finding contracts belong to the source domain so a later tabular adapter can
// reuse them; nothing source-neutral is declared or re-exported here.

type MarkdownBlockType = MarkdownStructuralEvidence["block_type"];

type PositionedNode = Nodes & {
  position?: {
    start: { line: number; offset?: number };
    end: { line: number; offset?: number };
  };
};

type DefinitionTargets = Map<string, string>;

const markdownParser = unified().use(remarkParse).use(remarkGfm);

function locatorFor(input: TextSourceInput, start: number, end: number) {
  const prefix =
    input.input_mode === "pasted_markdown"
      ? "paste"
      : `file:${input.display_name}`;
  return `${prefix}:lines:${start}-${end}`;
}

function nodeChildren(node: Nodes): Nodes[] {
  return "children" in node && Array.isArray(node.children)
    ? (node.children as Nodes[])
    : [];
}

function textContent(node: Nodes): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "break") return "\n";
  if (node.type === "image") return node.alt ?? "image";
  if (node.type === "definition") return `${node.identifier}: ${node.url}`;
  return nodeChildren(node).map(textContent).join("").trim();
}

function collectDefinitions(tree: Root): DefinitionTargets {
  const definitions: DefinitionTargets = new Map();
  const visit = (node: Nodes) => {
    if (node.type === "definition") {
      definitions.set(node.identifier.toLowerCase(), node.url);
    }
    nodeChildren(node).forEach(visit);
  };
  visit(tree);
  return definitions;
}

function extractLinks(
  node: Nodes,
  definitions: DefinitionTargets,
): SourceLink[] {
  const links: SourceLink[] = [];
  const visit = (current: Nodes) => {
    if (current.type === "link") {
      links.push({
        kind: "link",
        label: textContent(current),
        target: current.url,
      });
    } else if (current.type === "image") {
      links.push({
        kind: "image",
        label: current.alt ?? "",
        target: current.url,
      });
    } else if (current.type === "linkReference") {
      const target = definitions.get(current.identifier.toLowerCase());
      if (target)
        links.push({ kind: "link", label: textContent(current), target });
    } else if (current.type === "imageReference") {
      const target = definitions.get(current.identifier.toLowerCase());
      if (target)
        links.push({ kind: "image", label: current.alt ?? "", target });
    }
    nodeChildren(current).forEach(visit);
  };
  visit(node);
  return links;
}

function isRelativeAsset(target: string) {
  return !/^(?:https?:|data:|blob:|\/\/|#)/i.test(target);
}

function sourceSlice(content: string, node: PositionedNode): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined
    ? textContent(node)
    : content.slice(start, end);
}

function blockKind(node: RootContent): MarkdownBlockType | null {
  switch (node.type) {
    case "blockquote":
      return "blockquote";
    case "code":
      return "code";
    case "heading":
      return "heading";
    case "paragraph":
      return "paragraph";
    case "table":
      return "table";
    case "thematicBreak":
      return "thematic_break";
    default:
      return null;
  }
}

export function extractMarkdownSource(
  input: TextSourceInput,
): UnifiedSourceDocument {
  const normalizedContent = input.content.replace(/\r\n?/g, "\n");
  const tree = markdownParser.parse(normalizedContent) as Root;
  const definitions = collectDefinitions(tree);
  const evidenceUnits: SourceEvidenceUnit[] = [];
  const extractionFindings: SourceExtractionFinding[] = [];
  const headingStack: Array<{ level: number; ref: string }> = [];

  const addBlock = ({
    node,
    kind,
    depth,
    parentRef,
    structuralHints,
  }: {
    node: PositionedNode;
    kind: MarkdownBlockType;
    depth: number;
    parentRef?: string | null;
    structuralHints: Omit<
      MarkdownStructuralEvidence,
      "evidence_kind" | "block_type" | "depth" | "line_start" | "line_end"
    >;
  }) => {
    const start = node.position?.start.line ?? 1;
    const end = node.position?.end.line ?? start;
    // The `:block:` segment is legacy naming kept verbatim: these IDs are
    // frozen by the External Markdown Benchmark #001 mapping and by every
    // existing coverage fixture. The ID is opaque downstream.
    const id = `${input.source_id}:block:${String(evidenceUnits.length + 1).padStart(4, "0")}`;
    const links = extractLinks(node, definitions);
    const rawText = sourceSlice(normalizedContent, node);
    const evidenceUnit: SourceEvidenceUnit = {
      id,
      source_order: evidenceUnits.length,
      parent_ref:
        parentRef === undefined
          ? (headingStack.at(-1)?.ref ?? null)
          : parentRef,
      locator: locatorFor(input, start, end),
      raw_value: rawText,
      display_value: textContent(node),
      links,
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: kind,
          depth,
          line_start: start,
          line_end: end,
          ...structuralHints,
        },
      ],
    };
    evidenceUnits.push(evidenceUnit);

    for (const link of links) {
      if (link.kind === "image" && isRelativeAsset(link.target)) {
        extractionFindings.push({
          code: "MISSING_RELATIVE_ASSET",
          message: `單一 Markdown 檔無法開啟相對圖片 ${link.target}，但圖片參照已保留。`,
          severity: "warning",
          evidence_unit_ref: id,
          locator: evidenceUnit.locator,
          target: link.target,
        });
      }
    }
    return evidenceUnit;
  };

  const addList = (
    list: Extract<RootContent, { type: "list" }>,
    parentItemRef: string | null,
    listDepth: number,
  ) => {
    list.children.forEach((item, itemIndex) => {
      const ownChildren = item.children.filter(
        (child) => child.type !== "list",
      );
      const lastOwnChild = ownChildren.at(-1);
      const itemForBlock =
        lastOwnChild?.position && item.position
          ? ({
              ...item,
              children: ownChildren,
              position: {
                start: item.position.start,
                end: lastOwnChild.position.end,
              },
            } as PositionedNode)
          : (item as PositionedNode);
      const rawText = sourceSlice(normalizedContent, itemForBlock);
      const marker =
        rawText.match(/^\s*([-+*]|\d+[.)])\s+/)?.[1] ??
        (list.ordered ? `${(list.start ?? 1) + itemIndex}.` : "-");
      const unit = addBlock({
        node: itemForBlock,
        kind: "list_item",
        depth: headingStack.length + listDepth,
        parentRef: parentItemRef ?? headingStack.at(-1)?.ref ?? null,
        structuralHints: {
          list_marker: marker,
          sequence_like: textContent(itemForBlock).includes(" > "),
        },
      });

      item.children.forEach((child) => {
        if (child.type === "list") {
          addList(child, unit.id, listDepth + 1);
        }
      });
    });
  };

  for (const node of tree.children) {
    if (node.type === "list") {
      addList(node, null, 1);
      continue;
    }

    const kind = blockKind(node);
    if (!kind) {
      addBlock({
        node: node as PositionedNode,
        kind: "paragraph",
        depth: headingStack.length,
        structuralHints: {},
      });
      continue;
    }

    if (node.type === "heading") {
      while (headingStack.at(-1) && headingStack.at(-1)!.level >= node.depth) {
        headingStack.pop();
      }
      const unit = addBlock({
        node: node as PositionedNode,
        kind,
        depth: node.depth - 1,
        parentRef: headingStack.at(-1)?.ref ?? null,
        structuralHints: { heading_level: node.depth },
      });
      headingStack.push({ level: node.depth, ref: unit.id });
      continue;
    }

    addBlock({
      node: node as PositionedNode,
      kind,
      depth: headingStack.length + (node.type === "blockquote" ? 1 : 0),
      structuralHints:
        node.type === "table"
          ? {
              table_column_count:
                node.align?.length ?? node.children[0]?.children.length ?? 0,
              table_row_count: node.children.length,
            }
          : node.type === "paragraph"
            ? { sequence_like: textContent(node).includes(" > ") }
            : {},
    });
  }

  return {
    schema_version: "unified-source-document.v1",
    source_id: input.source_id,
    display_name: input.display_name,
    input_mode: input.input_mode,
    source_format: "markdown",
    evidence_units: evidenceUnits,
    extraction_findings: extractionFindings,
  };
}
