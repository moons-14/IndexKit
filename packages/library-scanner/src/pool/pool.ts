import { Worker } from "node:worker_threads";

interface PendingTask<R> {
  resolve: (value: R) => void;
  reject: (reason: unknown) => void;
}

interface WorkerState<R> {
  worker: Worker;
  busy: boolean;
  pending: PendingTask<R> | null;
}

export class WorkerPool<T, R> {
  private readonly workers: WorkerState<R>[];
  private readonly queue: Array<{ task: T } & PendingTask<R>> = [];
  private terminated = false;

  constructor(workerCount: number, workerScriptPath: string) {
    this.workers = Array.from({ length: workerCount }, () => {
      const worker = new Worker(workerScriptPath, {
        execArgv: this.resolveExecArgv(workerScriptPath),
      });

      const state: WorkerState<R> = {
        worker,
        busy: false,
        pending: null,
      };

      worker.on("message", (result: R) => {
        const pending = state.pending;
        state.pending = null;
        state.busy = false;
        pending?.resolve(result);
        this.drainQueue();
      });

      worker.on("error", (err) => {
        const pending = state.pending;
        state.pending = null;
        state.busy = false;
        pending?.reject(err);
        this.drainQueue();
      });

      return state;
    });
  }

  private resolveExecArgv(_scriptPath: string): string[] {
    return [];
  }

  run(task: T): Promise<R> {
    if (this.terminated) {
      return Promise.reject(new Error("WorkerPool has been terminated"));
    }

    return new Promise<R>((resolve, reject) => {
      const idle = this.workers.find((w) => !w.busy);
      if (idle) {
        this.dispatch(idle, task, resolve, reject);
      } else {
        this.queue.push({ task, resolve, reject });
      }
    });
  }

  private dispatch(
    state: WorkerState<R>,
    task: T,
    resolve: (value: R) => void,
    reject: (reason: unknown) => void,
  ): void {
    state.busy = true;
    state.pending = { resolve, reject };
    state.worker.postMessage(task);
  }

  private drainQueue(): void {
    if (this.queue.length === 0) return;
    const idle = this.workers.find((w) => !w.busy);
    if (!idle) return;
    const next = this.queue.shift()!;
    this.dispatch(idle, next.task, next.resolve, next.reject);
  }

  async drain(): Promise<void> {
    await Promise.all(
      this.workers
        .filter((w) => w.busy && w.pending)
        .map(
          (w) =>
            new Promise<void>((resolve) => {
              const orig = w.pending!.resolve;
              w.pending!.resolve = (v) => {
                orig(v);
                resolve();
              };
            }),
        ),
    );
  }

  async terminate(): Promise<void> {
    this.terminated = true;
    // Reject queued tasks
    for (const { reject } of this.queue) {
      reject(new Error("WorkerPool terminated"));
    }
    this.queue.length = 0;
    await Promise.all(this.workers.map((w) => w.worker.terminate()));
  }
}
