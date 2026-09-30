import { validateTextSourceInputSchema } from "../../domain/trip/schemaValidators";
import type { TextSourceInput } from "../../domain/trip/types";

export const MAX_MARKDOWN_BYTES = 1_000_000;
const markdownExtensions = [".md", ".markdown"];

export type SourceInputFailureCode =
  | "empty"
  | "too_large"
  | "unreadable"
  | "unsupported_type"
  | "invalid_contract";

export class SourceInputError extends Error {
  constructor(
    readonly code: SourceInputFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SourceInputError";
  }
}

export type SourceIdFactory = () => string;

const defaultSourceIdFactory: SourceIdFactory = () => {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return `source:${suffix}`;
};

function utf8Size(content: string) {
  return new TextEncoder().encode(content).byteLength;
}

function assertSupportedContent(content: string) {
  if (!content.trim()) {
    throw new SourceInputError(
      "empty",
      "還沒有行程內容。請貼上文字，或選擇一份有內容的檔案。",
    );
  }
  const size = utf8Size(content);
  if (size > MAX_MARKDOWN_BYTES) {
    throw new SourceInputError(
      "too_large",
      `這份 Markdown 超過 ${MAX_MARKDOWN_BYTES.toLocaleString()} bytes 的處理上限。`,
    );
  }
}

function assertContract(input: TextSourceInput) {
  const result = validateTextSourceInputSchema(input);
  if (!result.valid) {
    throw new SourceInputError(
      "invalid_contract",
      "這份 Markdown 的內容格式目前無法處理。",
    );
  }
  return input;
}

export function normalizePastedMarkdown(
  content: string,
  options: {
    createSourceId?: SourceIdFactory;
    displayName?: string;
  } = {},
): TextSourceInput {
  assertSupportedContent(content);
  return assertContract({
    schema_version: "text-source-input.v1",
    source_id: (options.createSourceId ?? defaultSourceIdFactory)(),
    input_mode: "pasted_markdown",
    media_type: "text/markdown",
    content,
    display_name: options.displayName?.trim() || "Pasted Markdown itinerary",
  });
}

function hasMarkdownExtension(name: string) {
  const lower = name.toLowerCase();
  return markdownExtensions.some((extension) => lower.endsWith(extension));
}

export async function normalizeMarkdownFile(
  file: Pick<File, "name" | "size" | "type" | "text">,
  options: { createSourceId?: SourceIdFactory } = {},
): Promise<TextSourceInput> {
  if (!hasMarkdownExtension(file.name)) {
    throw new SourceInputError(
      "unsupported_type",
      "目前只支援 .md 或 .markdown。Excel／CSV 尚未開放，PDF 不支援匯入。",
    );
  }
  if (
    file.type &&
    !["text/markdown", "text/plain", "application/octet-stream"].includes(
      file.type,
    )
  ) {
    throw new SourceInputError(
      "unsupported_type",
      "這個檔案不是可讀取的 Markdown。請改選 .md 或 .markdown 文字檔。",
    );
  }
  if (file.size > MAX_MARKDOWN_BYTES) {
    throw new SourceInputError(
      "too_large",
      `這份 Markdown 超過 ${MAX_MARKDOWN_BYTES.toLocaleString()} bytes 的處理上限。`,
    );
  }

  let content: string;
  try {
    content = await file.text();
  } catch (error) {
    throw new SourceInputError(
      "unreadable",
      "無法讀取這份 Markdown。檔案可能已損壞，或瀏覽器沒有讀取權限。",
      { cause: error },
    );
  }
  assertSupportedContent(content);
  return assertContract({
    schema_version: "text-source-input.v1",
    source_id: (options.createSourceId ?? defaultSourceIdFactory)(),
    input_mode: "markdown_file",
    media_type: "text/markdown",
    content,
    display_name: file.name,
  });
}
