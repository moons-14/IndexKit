import { parentPort, workerData } from "node:worker_threads";
import { openReader } from "../reader.js";
import type { WorkerResult, WorkerTask } from "../types.js";

if (!parentPort) {
  throw new Error("worker-entry must be run as a worker thread");
}

parentPort.on("message", async (task: WorkerTask) => {
  const result = await processTask(task);
  parentPort!.postMessage(result);
});

async function processTask(task: WorkerTask): Promise<WorkerResult> {
  const entry = {
    path: task.path,
    format: task.format,
    size: task.size,
    mtime: new Date(task.mtime),
  };

  try {
    const reader = openReader(entry);
    let metadata = undefined;
    let thumbnail = undefined;

    try {
      if (task.extractMetadata) {
        metadata = await reader.getMetadata();
      }
      if (task.extractThumbnail) {
        const buf = await reader.getThumbnail(task.thumbnailOptions);
        thumbnail = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      }
    } finally {
      await reader.close();
    }

    return {
      path: task.path,
      metadata,
      thumbnail,
    };
  } catch (err) {
    return {
      path: task.path,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
