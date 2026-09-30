import { readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { expect, test } from "vitest";

import { createGeminiTripParser } from "../../src/integrations/gemini/geminiTripParser";
import {
  EXTERNAL_MARKDOWN_001_CREDENTIAL_ENV,
  EXTERNAL_MARKDOWN_001_OUTPUT_ENV,
  assertLiveBenchmarkExecution,
  runExternalMarkdownBenchmark001LiveComparison,
  type LiveBenchmarkDefinition,
} from "../fixtures/benchmarks/external-markdown-001/liveComparisonRunner";

const fixtureDirectory = new URL(
  "../fixtures/benchmarks/external-markdown-001/",
  import.meta.url,
);

test("collects each candidate thinking level without claiming semantic acceptance", async () => {
  // Missing credentials are recorded by the runner as a setup failure artifact.
  const credential = process.env[EXTERNAL_MARKDOWN_001_CREDENTIAL_ENV] ?? "";
  const benchmark = JSON.parse(
    await readFile(new URL("benchmark.json", fixtureDirectory), "utf8"),
  ) as LiveBenchmarkDefinition;
  const sourceContent = await readFile(
    new URL("source.md", fixtureDirectory),
    "utf8",
  );
  const requestedOutput = process.env[EXTERNAL_MARKDOWN_001_OUTPUT_ENV];
  const outputPath = requestedOutput?.trim()
    ? requestedOutput.trim()
    : join(tmpdir(), "external-markdown-001-live-comparison.json");
  if (!isAbsolute(outputPath)) {
    throw new Error(`${EXTERNAL_MARKDOWN_001_OUTPUT_ENV} must be absolute.`);
  }

  const controller = new AbortController();
  const stop = () => controller.abort();
  // Three levels can each consume three bounded 120 s provider attempts.
  // Leave time to save outcomes before Vitest's outer timeout.
  const timeout = setTimeout(stop, 1_120_000);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const artifact = await runExternalMarkdownBenchmark001LiveComparison({
      benchmark,
      credential,
      sourceContent,
      signal: controller.signal,
      createParser: ({ diagnosticSink, model, thinkingLevel }) =>
        createGeminiTripParser({ diagnosticSink, model, thinkingLevel }),
      onArtifact: async (checkpoint) => {
        const temporaryPath = `${outputPath}.pending`;
        await writeFile(
          temporaryPath,
          `${JSON.stringify(checkpoint, null, 2)}\n`,
          { encoding: "utf8", mode: 0o600 },
        );
        await rename(temporaryPath, outputPath);
      },
    });
    // Report the durable artifact before failing the execution assertion.
    console.info(
      `Live comparison outcomes saved: ${outputPath}. Human semantic acceptance remains pending.`,
    );
    expect(artifact.runs.map((run) => run.thinking_level)).toEqual([
      "low",
      "medium",
      "high",
    ]);
    assertLiveBenchmarkExecution(artifact);
  } finally {
    clearTimeout(timeout);
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}, 1_140_000);
