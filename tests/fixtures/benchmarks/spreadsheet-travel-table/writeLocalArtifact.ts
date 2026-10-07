import { randomUUID } from "node:crypto";
import { realpath, rename, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, sep } from "node:path";
import type { SpreadsheetBenchmarkArtifact } from "./localBenchmarkRunner";

/** Only OS temporary directories are supported; tracked output is rejected. */
export async function writeSpreadsheetBenchmarkArtifact(
  path: string,
  artifact: SpreadsheetBenchmarkArtifact,
) {
  if (!isAbsolute(path))
    throw new Error("Benchmark output path must be absolute and temporary.");
  const parent = await realpath(dirname(path));
  const roots = await Promise.all([realpath(tmpdir()), realpath("/tmp")]);
  if (
    !roots.some((root) => {
      const child = relative(root, parent);
      return (
        child === "" ||
        (!child.startsWith(`..${sep}`) && child !== ".." && !isAbsolute(child))
      );
    })
  )
    throw new Error(
      "Benchmark output must stay inside an OS temporary directory.",
    );
  const temporary = `${path}.${randomUUID()}.pending`;
  try {
    await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
