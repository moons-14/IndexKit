import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { type RNG, createRNG, randInt, pick } from "./random.js";
import { generatePage, randomDimensions } from "./image.js";
import { generateComicInfo } from "./metadata.js";
import {
  buildAuthorPool,
  pickAuthors,
  generateTitle,
  generateSubtitle,
  pickPublisher,
  generateSummary,
  GENRES,
  AGE_RATINGS,
} from "./names.js";

export interface GeneratorOptions {
  count: number;
  output: string;
  seed?: number;
  minPages: number;
  maxPages: number;
  format: "jpeg" | "png";
  quality: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  showPageNumbers: boolean;
  authorPool: number;
  lang: string;
  genre?: string;
  ageRating?: string;
  noMetadata: boolean;
  series: boolean;
  seriesCount: number;
  maxIssues: number;
  prefix?: string;
  verbose: boolean;
  dryRun: boolean;
  onProgress?: (current: number, total: number, filename: string) => void;
}

interface ComicEntry {
  title: string;
  series?: string;
  issueNumber?: number;
  volume?: number;
  authors: string[];
  genre: string;
  ageRating: string;
  publisher: string;
  year: number;
  month: number;
  pageCount: number;
  filename: string;
  bookHue: number;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim();
}

function buildEntries(rng: RNG, authorPool: string[], opts: GeneratorOptions): ComicEntry[] {
  const entries: ComicEntry[] = [];
  const prefix = opts.prefix ? `${opts.prefix} - ` : "";

  if (opts.series) {
    // Pre-generate series metadata; cycle through if we need more files than series × maxIssues
    interface SeriesMeta {
      name: string;
      authors: string[];
      publisher: string;
      genre: string;
      ageRating: string;
      baseHue: number;
      nextIssue: number;
    }
    const seriesList: SeriesMeta[] = Array.from({ length: opts.seriesCount }, () => ({
      name: generateTitle(rng),
      authors: pickAuthors(rng, authorPool),
      publisher: pickPublisher(rng),
      genre: opts.genre ?? pick(rng, GENRES),
      ageRating: opts.ageRating ?? pick(rng, AGE_RATINGS),
      baseHue: Math.floor(rng() * 360),
      nextIssue: 1,
    }));

    let seriesIdx = 0;
    while (entries.length < opts.count) {
      const s = seriesList[seriesIdx % seriesList.length];
      seriesIdx++;
      const issueCount = randInt(rng, 1, opts.maxIssues);
      for (let i = 0; i < issueCount && entries.length < opts.count; i++) {
        const issue = s.nextIssue++;
        const subtitle = generateSubtitle(rng);
        const title = `${s.name}: ${subtitle}`;
        const year = randInt(rng, 2010, 2025);
        const month = randInt(rng, 1, 12);
        const pageCount = randInt(rng, opts.minPages, opts.maxPages);
        const raw = `${prefix}${sanitizeFilename(s.name)} - ${String(issue).padStart(3, "0")}.cbz`;
        entries.push({
          title,
          series: s.name,
          issueNumber: issue,
          volume: Math.ceil(issue / 6),
          authors: s.authors,
          genre: s.genre,
          ageRating: s.ageRating,
          publisher: s.publisher,
          year,
          month,
          pageCount,
          filename: raw,
          bookHue: (s.baseHue + issue * 15) % 360,
        });
      }
    }
  } else {
    const usedTitles = new Set<string>();
    while (entries.length < opts.count) {
      let title = generateTitle(rng);
      let attempts = 0;
      while (usedTitles.has(title) && attempts < 20) {
        title = generateTitle(rng);
        attempts++;
      }
      usedTitles.add(title);

      const authors = pickAuthors(rng, authorPool);
      const genre = opts.genre ?? pick(rng, GENRES);
      const ageRating = opts.ageRating ?? pick(rng, AGE_RATINGS);
      const publisher = pickPublisher(rng);
      const year = randInt(rng, 2010, 2025);
      const month = randInt(rng, 1, 12);
      const pageCount = randInt(rng, opts.minPages, opts.maxPages);
      const bookHue = Math.floor(rng() * 360);

      const raw = `${prefix}${sanitizeFilename(title)}.cbz`;
      entries.push({
        title,
        authors,
        genre,
        ageRating,
        publisher,
        year,
        month,
        pageCount,
        filename: raw,
        bookHue,
      });
    }
  }

  return entries;
}

async function buildCBZ(
  entry: ComicEntry,
  rng: RNG,
  opts: GeneratorOptions,
): Promise<Uint8Array> {
  const ext = opts.format === "jpeg" ? "jpg" : "png";
  const files: Record<string, Uint8Array> = {};

  for (let p = 1; p <= entry.pageCount; p++) {
    const dims = randomDimensions(rng, opts.minWidth, opts.maxWidth, opts.minHeight, opts.maxHeight);
    const buf = await generatePage({
      rng,
      bookHue: entry.bookHue,
      width: dims.width,
      height: dims.height,
      pageNum: p,
      total: entry.pageCount,
      title: entry.title,
      format: opts.format,
      quality: opts.quality,
      showPageNumber: opts.showPageNumbers,
    });
    files[`page-${String(p).padStart(4, "0")}.${ext}`] = new Uint8Array(buf);
  }

  if (!opts.noMetadata) {
    const xml = generateComicInfo({
      title: entry.title,
      series: entry.series,
      issueNumber: entry.issueNumber,
      volume: entry.volume,
      summary: generateSummary(rng, entry.title, entry.authors, entry.genre),
      year: entry.year,
      month: entry.month,
      writers: entry.authors,
      publisher: entry.publisher,
      genre: entry.genre,
      pageCount: entry.pageCount,
      lang: opts.lang,
      ageRating: entry.ageRating,
      manga: false,
    });
    files["ComicInfo.xml"] = strToU8(xml);
  }

  return zipSync(files, { level: 0 });
}

export async function generateLibrary(opts: GeneratorOptions): Promise<number> {
  const rng: RNG = createRNG(opts.seed);
  const authorPool = buildAuthorPool(rng, opts.authorPool);

  const entries = buildEntries(rng, authorPool, opts);

  if (opts.verbose || opts.dryRun) {
    console.log(`\nAuthor pool (${authorPool.length}):`);
    for (const a of authorPool) console.log(`  ${a}`);
    console.log(`\nGenerating ${entries.length} file(s) → ${opts.output}\n`);
  }

  if (opts.dryRun) {
    for (const e of entries) {
      console.log(
        `  ${e.filename}  [${e.pageCount} pages, ${e.genre}, ${e.authors.join(", ")}]`,
      );
    }
    return entries.length;
  }

  await mkdir(opts.output, { recursive: true });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    opts.onProgress?.(i + 1, entries.length, entry.filename);

    const data = await buildCBZ(entry, rng, opts);
    const dest = join(opts.output, entry.filename);
    await writeFile(dest, data);

    if (opts.verbose) {
      console.log(`  ✓ ${entry.filename}  (${entry.pageCount} pages)`);
    }
  }

  return entries.length;
}
