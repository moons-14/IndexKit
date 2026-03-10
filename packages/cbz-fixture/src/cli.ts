#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { generateLibrary } from "./generator.js";

function parsePositiveInt(value: string, name: string): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) throw new InvalidArgumentError(`${name} must be a positive integer.`);
  return n;
}

function parseQuality(value: string): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1 || n > 100)
    throw new InvalidArgumentError("Quality must be between 1 and 100.");
  return n;
}

const program = new Command();

program
  .name("cbz-fixture")
  .description("Generate test CBZ files with randomized images and ComicInfo.xml metadata")
  .version("0.0.1");

// Generation
program
  .option("-o, --output <dir>", "output directory", "./fixtures")
  .option("-n, --count <number>", "number of CBZ files to generate", (v) => parsePositiveInt(v, "--count"), 10)
  .option("--seed <number>", "random seed for reproducibility", (v) => {
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) throw new InvalidArgumentError("Seed must be an integer.");
    return n;
  });

// Pages
program
  .option("--min-pages <number>", "minimum pages per file", (v) => parsePositiveInt(v, "--min-pages"), 8)
  .option("--max-pages <number>", "maximum pages per file", (v) => parsePositiveInt(v, "--max-pages"), 48);

// Images
program
  .option("--format <jpeg|png>", "image format", (v) => {
    if (v !== "jpeg" && v !== "png") throw new InvalidArgumentError("Format must be 'jpeg' or 'png'.");
    return v as "jpeg" | "png";
  }, "jpeg")
  .option("--quality <number>", "JPEG quality 1–100 (ignored for PNG)", parseQuality, 80)
  .option("--min-width <number>", "minimum image width in pixels", (v) => parsePositiveInt(v, "--min-width"), 720)
  .option("--max-width <number>", "maximum image width in pixels", (v) => parsePositiveInt(v, "--max-width"), 1200)
  .option("--min-height <number>", "minimum image height in pixels", (v) => parsePositiveInt(v, "--min-height"), 1024)
  .option("--max-height <number>", "maximum image height in pixels", (v) => parsePositiveInt(v, "--max-height"), 1800)
  .option("--page-numbers", "draw page number and title on each image", false);

// Metadata
program
  .option("--author-pool <number>", "number of unique authors to draw from", (v) => parsePositiveInt(v, "--author-pool"), 5)
  .option("--lang <code>", "language ISO code written into ComicInfo.xml", "en")
  .option("--genre <genre>", "fix genre for all files (random if omitted)")
  .option("--age-rating <rating>", "fix age rating for all files: Everyone, Teen, Mature (random if omitted)")
  .option("--no-metadata", "skip ComicInfo.xml generation");

// Series
program
  .option("--series", "group files into named series", false)
  .option("--series-count <number>", "number of series to generate (used with --series)", (v) => parsePositiveInt(v, "--series-count"), 3)
  .option("--max-issues <number>", "maximum issues per series (used with --series)", (v) => parsePositiveInt(v, "--max-issues"), 6);

// Output
program
  .option("--prefix <string>", "filename prefix for all generated files")
  .option("--verbose", "print per-file details", false)
  .option("--dry-run", "preview without writing any files", false);

program.action(async () => {
  const opts = program.opts<{
    output: string;
    count: number;
    seed?: number;
    minPages: number;
    maxPages: number;
    format: "jpeg" | "png";
    quality: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    pageNumbers: boolean;
    authorPool: number;
    lang: string;
    genre?: string;
    ageRating?: string;
    metadata: boolean;
    series: boolean;
    seriesCount: number;
    maxIssues: number;
    prefix?: string;
    verbose: boolean;
    dryRun: boolean;
  }>();

  if (opts.minPages > opts.maxPages) {
    console.error("Error: --min-pages must be ≤ --max-pages");
    process.exit(1);
  }
  if (opts.minWidth > opts.maxWidth) {
    console.error("Error: --min-width must be ≤ --max-width");
    process.exit(1);
  }
  if (opts.minHeight > opts.maxHeight) {
    console.error("Error: --min-height must be ≤ --max-height");
    process.exit(1);
  }

  if (!opts.dryRun && !opts.verbose) {
    process.stdout.write(`Generating ${opts.count} CBZ file(s)...`);
  }

  let lastLen = 0;

  const actualCount = await generateLibrary({
    count: opts.count,
    output: opts.output,
    seed: opts.seed,
    minPages: opts.minPages,
    maxPages: opts.maxPages,
    format: opts.format,
    quality: opts.quality,
    minWidth: opts.minWidth,
    maxWidth: opts.maxWidth,
    minHeight: opts.minHeight,
    maxHeight: opts.maxHeight,
    showPageNumbers: opts.pageNumbers,
    authorPool: opts.authorPool,
    lang: opts.lang,
    genre: opts.genre,
    ageRating: opts.ageRating,
    noMetadata: !opts.metadata,
    series: opts.series,
    seriesCount: opts.seriesCount,
    maxIssues: opts.maxIssues,
    prefix: opts.prefix,
    verbose: opts.verbose,
    dryRun: opts.dryRun,
    onProgress: (current, total, filename) => {
      if (!opts.verbose && !opts.dryRun) {
        const msg = ` [${current}/${total}] ${filename}`;
        process.stdout.write(`\r${" ".repeat(lastLen)}\r`);
        process.stdout.write(`Generating ${total} CBZ file(s)...${msg}`);
        lastLen = `Generating ${total} CBZ file(s)...${msg}`.length;
      }
    },
  });

  if (!opts.dryRun && !opts.verbose) {
    process.stdout.write(`\r${" ".repeat(lastLen)}\r`);
    console.log(`Done. ${actualCount} file(s) written to ${opts.output}`);
  } else if (!opts.dryRun) {
    console.log(`\nDone. ${actualCount} file(s) written to ${opts.output}`);
  }
});

// pnpm passes a literal "--" separator before script args; strip it so Commander parses correctly
const argv =
  process.argv[2] === "--"
    ? [...process.argv.slice(0, 2), ...process.argv.slice(3)]
    : process.argv;

program.parseAsync(argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
