#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../src/scanner.js";
import { openReader } from "../src/reader.js";
import type { FileEntry } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

function parseArgs(): { count: number } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  let count = 20;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1] !== undefined) {
      count = Number(args[i + 1]);
      i++;
    } else if (args[i]?.startsWith("--count=")) {
      count = Number(args[i]!.slice("--count=".length));
    }
  }
  if (!Number.isFinite(count) || count <= 0) {
    console.error("Error: --count must be a positive integer");
    process.exit(1);
  }
  return { count };
}

async function benchExtractSequential(
  entries: FileEntry[],
): Promise<{ durationMs: number; successCount: number; errorCount: number }> {
  const start = performance.now();
  let successCount = 0;
  let errorCount = 0;

  for (const entry of entries) {
    const reader = openReader(entry);
    try {
      await reader.getMetadata();
      successCount++;
    } catch {
      errorCount++;
    } finally {
      await reader.close();
    }
  }

  return {
    durationMs: performance.now() - start,
    successCount,
    errorCount,
  };
}

async function benchExtractWithThumbnail(
  entries: FileEntry[],
): Promise<{ durationMs: number; successCount: number; errorCount: number }> {
  const start = performance.now();
  let successCount = 0;
  let errorCount = 0;

  for (const entry of entries) {
    const reader = openReader(entry);
    try {
      await reader.getMetadata();
      await reader.getThumbnail({ width: 300, height: 450 });
      successCount++;
    } catch {
      errorCount++;
    } finally {
      await reader.close();
    }
  }

  return {
    durationMs: performance.now() - start,
    successCount,
    errorCount,
  };
}

async function main(): Promise<void> {
  const { count } = parseArgs();

  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "indexkit-extract-bench-"),
  );

  try {
    execSync(
      `pnpm --filter @indexkit/cbz-fixture generate -- --count ${count} --seed 42 -o ${tmpDir}`,
      { cwd: ROOT, stdio: "inherit" },
    );

    const entries: FileEntry[] = [];
    for await (const entry of scan({ dir: tmpDir })) {
      entries.push(entry);
    }

    console.log(`\nFound ${entries.length} files`);
    console.log("\n=== Extract Benchmark Results ===\n");

    const seqResult = await benchExtractSequential(entries);
    console.log("Metadata only (sequential):");
    console.log(`  files:      ${seqResult.successCount}`);
    console.log(`  errors:     ${seqResult.errorCount}`);
    console.log(`  duration:   ${seqResult.durationMs.toFixed(0)}ms`);
    console.log(
      `  files/sec:  ${(seqResult.successCount / (seqResult.durationMs / 1000)).toFixed(0)}`,
    );

    const thumbResult = await benchExtractWithThumbnail(entries);
    console.log("\nMetadata + thumbnail (sequential):");
    console.log(`  files:      ${thumbResult.successCount}`);
    console.log(`  errors:     ${thumbResult.errorCount}`);
    console.log(`  duration:   ${thumbResult.durationMs.toFixed(0)}ms`);
    console.log(
      `  files/sec:  ${(thumbResult.successCount / (thumbResult.durationMs / 1000)).toFixed(0)}`,
    );
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
