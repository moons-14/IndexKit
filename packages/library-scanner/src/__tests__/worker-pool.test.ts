import { describe, expect, it } from "vitest";
import { WorkerPool } from "../pool/pool.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Simple echo worker for testing
const ECHO_WORKER_CODE = `
import { parentPort } from 'node:worker_threads';
parentPort.on('message', (task) => {
  parentPort.postMessage({ result: task.value * 2, id: task.id });
});
`;

interface EchoTask {
  value: number;
  id: number;
}

interface EchoResult {
  result: number;
  id: number;
}

describe("WorkerPool", () => {
  it("runs tasks and returns results", async () => {
    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "pool-test-"),
    );
    const workerPath = path.join(tmpDir, "echo-worker.mjs");

    try {
      await fs.promises.writeFile(workerPath, ECHO_WORKER_CODE, "utf-8");

      const pool = new WorkerPool<EchoTask, EchoResult>(2, workerPath);

      const results = await Promise.all([
        pool.run({ value: 1, id: 1 }),
        pool.run({ value: 2, id: 2 }),
        pool.run({ value: 3, id: 3 }),
        pool.run({ value: 4, id: 4 }),
      ]);

      expect(results.map((r) => r.result).sort((a, b) => a - b)).toEqual([
        2, 4, 6, 8,
      ]);
      expect(results.map((r) => r.id).sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4,
      ]);

      await pool.terminate();
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("rejects after termination", async () => {
    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "pool-test-"),
    );
    const workerPath = path.join(tmpDir, "echo-worker.mjs");

    try {
      await fs.promises.writeFile(workerPath, ECHO_WORKER_CODE, "utf-8");

      const pool = new WorkerPool<EchoTask, EchoResult>(1, workerPath);
      await pool.terminate();

      await expect(pool.run({ value: 1, id: 1 })).rejects.toThrow(
        "terminated",
      );
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("respects concurrency limit", async () => {
    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "pool-test-",
    ));
    const workerPath = path.join(tmpDir, "echo-worker.mjs");

    try {
      await fs.promises.writeFile(workerPath, ECHO_WORKER_CODE, "utf-8");

      const concurrency = 2;
      const pool = new WorkerPool<EchoTask, EchoResult>(concurrency, workerPath);

      // Submit more tasks than workers
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        value: i + 1,
        id: i + 1,
      }));

      const results = await Promise.all(tasks.map((t) => pool.run(t)));
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.result === (r.id) * 2)).toBe(true);

      await pool.terminate();
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
