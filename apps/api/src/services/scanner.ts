import { scanParallel } from "@indexkit/library-scanner";
import type { ProcessedEntry } from "@indexkit/library-scanner";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { authors, libraries, scanJobs, workAuthors, works } from "../db/schema.js";

const THUMBNAIL_DIR = process.env.THUMBNAIL_DIR ?? "/data/thumbnails";

async function ensureThumbnailDir() {
  await mkdir(THUMBNAIL_DIR, { recursive: true });
}

async function upsertWork(entry: ProcessedEntry, libraryId: string) {
  const { entry: fileEntry, metadata, thumbnail } = entry;

  // Upsert the work
  const [work] = await db
    .insert(works)
    .values({
      libraryId,
      path: fileEntry.path,
      format: fileEntry.format,
      size: fileEntry.size,
      mtime: fileEntry.mtime,
      title: metadata?.title,
      series: metadata?.series,
      issueNumber: metadata?.issueNumber,
      volume: metadata?.volume,
      summary: metadata?.summary,
      year: metadata?.year,
      month: metadata?.month,
      publisher: metadata?.publisher,
      genre: metadata?.genre,
      pageCount: metadata?.pageCount,
      lang: metadata?.lang,
      ageRating: metadata?.ageRating,
      manga: metadata?.manga,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: works.path,
      set: {
        format: fileEntry.format,
        size: fileEntry.size,
        mtime: fileEntry.mtime,
        title: metadata?.title,
        series: metadata?.series,
        issueNumber: metadata?.issueNumber,
        volume: metadata?.volume,
        summary: metadata?.summary,
        year: metadata?.year,
        month: metadata?.month,
        publisher: metadata?.publisher,
        genre: metadata?.genre,
        pageCount: metadata?.pageCount,
        lang: metadata?.lang,
        ageRating: metadata?.ageRating,
        manga: metadata?.manga,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!work) return;

  // Save thumbnail
  if (thumbnail) {
    const thumbPath = join(THUMBNAIL_DIR, `${work.id}.jpg`);
    await writeFile(thumbPath, thumbnail);
    await db
      .update(works)
      .set({ thumbnailPath: thumbPath })
      .where(eq(works.id, work.id));
  }

  // Upsert authors (only writers for now from metadata)
  if (metadata?.writers && metadata.writers.length > 0) {
    for (const writerName of metadata.writers) {
      const [author] = await db
        .insert(authors)
        .values({ name: writerName })
        .onConflictDoNothing()
        .returning();

      const authorId = author?.id ?? (
        await db
          .select({ id: authors.id })
          .from(authors)
          .where(eq(authors.name, writerName))
          .then((r) => r[0]?.id)
      );

      if (authorId) {
        await db
          .insert(workAuthors)
          .values({ workId: work.id, authorId, role: "writer" })
          .onConflictDoNothing();
      }
    }
  }
}

export async function runScan(libraryPath: string, libraryId: string, jobId: string) {
  await ensureThumbnailDir();

  let errorCount = 0;

  try {
    for await (const entry of scanParallel({
      dir: libraryPath,
      extractMetadata: true,
      extractThumbnail: true,
      thumbnailOptions: { width: 300, height: 450, format: "jpeg", quality: 85 },
      concurrency: Number.parseInt(process.env.WORKER_COUNT ?? "4"),
      onProgress: async (done, total) => {
        await db
          .update(scanJobs)
          .set({ processedFiles: done, totalFiles: total })
          .where(eq(scanJobs.id, jobId));
      },
    })) {
      if (entry.error) {
        errorCount++;
      } else {
        await upsertWork(entry, libraryId);
      }
    }

    await db
      .update(scanJobs)
      .set({ status: "completed", completedAt: new Date(), errors: errorCount })
      .where(eq(scanJobs.id, jobId));

    await db
      .update(libraries)
      .set({ status: "idle", lastScannedAt: new Date() })
      .where(eq(libraries.id, libraryId));
  } catch (err) {
    await db
      .update(scanJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errors: errorCount,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(scanJobs.id, jobId));

    await db
      .update(libraries)
      .set({ status: "error" })
      .where(eq(libraries.id, libraryId));
  }
}
