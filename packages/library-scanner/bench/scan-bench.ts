#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../src/scanner.js";
import { scanParallel } from "../src/parallel-scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

interface BenchResult {
  label: string;
  files: number;
  durationMs: number;
  filesPerSec: number;
  memoryMb: number;
}

function parseArgs(): { count: number } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  let count = 100;
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

function report(results: BenchResult[]): void {
  console.log("\n=== Scan Benchmark Results ===\n");
  for (const r of results) {
    console.log(`${r.label}`);
    console.log(`  files:      ${r.files}`);
    console.log(`  duration:   ${r.durationMs.toFixed(0)}ms`);
    console.log(`  files/sec:  ${r.filesPerSec.toFixed(0)}`);
    console.log(`  memory:     ${r.memoryMb.toFixed(1)}MB`);
    console.log();
  }
}

async function benchWalkOnly(dir: string, label: string): Promise<BenchResult> {
  const start = performance.now();
  let count = 0;
  for await (const _entry of scan({ dir })) {
    count++;
  }
  const elapsed = performance.now() - start;
  const mem = process.memoryUsage();
  return {
    label,
    files: count,
    durationMs: elapsed,
    filesPerSec: count / (elapsed / 1000),
    memoryMb: mem.heapUsed / 1024 / 1024,
  };
}

async function benchParallel(
  dir: string,
  workers: number,
  label: string,
): Promise<BenchResult> {
  const start = performance.now();
  let count = 0;
  for await (const _entry of scanParallel({
    dir,
    concurrency: workers,
    extractMetadata: true,
    extractThumbnail: false,
  })) {
    count++;
  }
  const elapsed = performance.now() - start;
  const mem = process.memoryUsage();
  return {
    label,
    files: count,
    durationMs: elapsed,
    filesPerSec: count / (elapsed / 1000),
    memoryMb: mem.heapUsed / 1024 / 1024,
  };
}

async function main(): Promise<void> {
  const { count } = parseArgs();

  const tmpDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "indexkit-bench-"),
  );

  try {
    // cbz-fixture's own progress (Generating N CBZ file(s)... [x/N] filename)
    // is printed to stdout; inherit it directly.
    execSync(
      `pnpm --filter @indexkit/cbz-fixture generate -- --count ${count} --seed 42 -o ${tmpDir}`,
      { cwd: ROOT, stdio: "inherit" },
    );

    const files = await fs.promises.readdir(tmpDir);
    console.log(`\nFound ${files.length} files in ${tmpDir}`);

    const results: BenchResult[] = [];

    // 1. Walk only
    results.push(await benchWalkOnly(tmpDir, "1. Walk only (no file I/O)"));

    // 2. Walk + metadata, 4 workers
    const w4 = Math.min(4, os.cpus().length);
    results.push(
      await benchParallel(
        tmpDir,
        w4,
        `2. Walk + metadata parallel (${w4} workers)`,
      ),
    );

    // 3. Walk + metadata, 8 workers (if CPU count allows)
    const w8 = Math.min(8, os.cpus().length);
    if (w8 > w4) {
      results.push(
        await benchParallel(
          tmpDir,
          w8,
          `3. Walk + metadata parallel (${w8} workers)`,
        ),
      );
    }

    report(results);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
