import os from "node:os";
import { fileURLToPath } from "node:url";
import type {
  ParallelScanOptions,
  ProcessedEntry,
  WorkerResult,
  WorkerTask,
} from "./types.js";
import { WorkerPool } from "./pool/pool.js";
import { scan } from "./scanner.js";

function getWorkerPath(): string {
  return fileURLToPath(new URL("./pool/worker-entry.js", import.meta.url));
}

export async function* scanParallel(
  opts: ParallelScanOptions,
): AsyncGenerator<ProcessedEntry> {
  const {
    extractMetadata = true,
    extractThumbnail = false,
    thumbnailOptions,
    onProgress,
    concurrency = os.cpus().length,
    ...scanOpts
  } = opts;

  const workerPath = getWorkerPath();
  const pool = new WorkerPool<WorkerTask, WorkerResult>(concurrency, workerPath);

  const pending: Array<Promise<ProcessedEntry>> = [];
  let done = 0;
  let total = 0;

  try {
    for await (const entry of scan(scanOpts)) {
      total++;

      const task: WorkerTask = {
        path: entry.path,
        format: entry.format,
        size: entry.size,
        mtime: entry.mtime.toISOString(),
        extractMetadata,
        extractThumbnail,
        thumbnailOptions,
      };

      const p = pool.run(task).then((result): ProcessedEntry => {
        done++;
        onProgress?.(done, total);

        return {
          entry,
          metadata: result.metadata,
          thumbnail: result.thumbnail
            ? Buffer.from(result.thumbnail)
            : undefined,
          error: result.error ? new Error(result.error) : undefined,
        };
      });

      pending.push(p);

      // Yield completed entries as they arrive (sliding window)
      if (pending.length >= concurrency * 2) {
        yield await pending.shift()!;
      }
    }

    // Drain remaining
    while (pending.length > 0) {
      yield await pending.shift()!;
    }
  } finally {
    await pool.terminate();
  }
}
