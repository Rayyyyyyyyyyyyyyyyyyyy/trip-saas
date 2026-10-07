import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";
import { createGeminiTransport } from "../../src/integrations/gemini/geminiTransport";
import {
  SPREADSHEET_BENCHMARK_FIXTURES,
  readSpreadsheetBenchmarkConfiguration,
  runSpreadsheetBenchmark,
  parseSpreadsheetAnnotationsJson,
  type SpreadsheetAnnotations,
} from "../fixtures/benchmarks/spreadsheet-travel-table/localBenchmarkRunner";
import { writeSpreadsheetBenchmarkArtifact } from "../fixtures/benchmarks/spreadsheet-travel-table/writeLocalArtifact";

test("collects local spreadsheet evidence without declaring semantic acceptance", async () => {
  // No dotenv loader. prepare mode does not access GEMINI_API_KEY at all.
  const config = readSpreadsheetBenchmarkConfiguration(process.env);
  const directory = process.env.SPREADSHEET_BENCHMARK_OUTPUT_DIR ?? tmpdir();
  const annotationDirectory = process.env.SPREADSHEET_BENCHMARK_ANNOTATION_DIR;
  const controller = new AbortController();
  const stop = () => controller.abort();
  const timeout = setTimeout(stop, 1_120_000);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const outcomes: string[] = [];
  try {
    for (const fixture of SPREADSHEET_BENCHMARK_FIXTURES) {
      const annotations: SpreadsheetAnnotations | undefined =
        annotationDirectory
          ? parseSpreadsheetAnnotationsJson(
              await readFile(
                join(annotationDirectory, `${fixture.id}.json`),
                "utf8",
              ),
            )
          : undefined;
      const path = join(directory, `spreadsheet-benchmark-${fixture.id}.json`);
      const artifact = await runSpreadsheetBenchmark({
        ...config,
        fixture,
        annotations,
        readBytes: async (path) =>
          new Uint8Array(await readFile(resolve(path))),
        transport: createGeminiTransport({
          model: config.model,
          thinkingLevel: "medium",
        }),
        signal: controller.signal,
        onArtifact: (artifact) =>
          writeSpreadsheetBenchmarkArtifact(path, artifact),
      });
      outcomes.push(artifact.execution_status);
      console.info(
        `${fixture.id}: ${artifact.execution_status}; acceptance ${artifact.acceptance_status}; artifact ${path}`,
      );
      if (
        artifact.failure_code === "authentication_failed" ||
        controller.signal.aborted
      )
        break;
    }
    expect(outcomes).toHaveLength(SPREADSHEET_BENCHMARK_FIXTURES.length);
    expect(
      outcomes.every(
        (status) =>
          status === (config.mode === "prepare" ? "prepared" : "succeeded"),
      ),
    ).toBe(true);
  } finally {
    clearTimeout(timeout);
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
});
