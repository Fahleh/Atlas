type Task<T> = () => Promise<T>;

interface AsyncQueueOptions {
  /**
   * Maximum number of tasks to run concurrently.
   * Defaults to 1 (fully sequential / FIFO).
   */
  concurrency?: number;
}

export class AsyncQueue {
  private queue: Array<{
    task: Task<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  private running = 0;
  private readonly concurrency: number;

  constructor(options: AsyncQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 1;
  }

  /**
   * Adds a task to the queue.
   *
   * Returns a promise that resolves with the result of the tasks execution
   * or rejects with the tasks error.
   *
   */
  add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task: task as Task<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      /* Call for task execution */
      this._run();
    });
  }

  /**
   * Executes tasks from the queue while running tasks are less than the concurrency limit.
   * _run() is called after a task is completed to execute the next available task in the queue.
   * This ensures that the maximum number of concurrent tasks is maintained while processing the queue.
   */
  private _run(): void {
    while (this.activeCount < this.concurrency && this.size > 0) {
      const taskItem = this.queue.shift()!;
      this.running++;

      taskItem
        .task()
        .then((res) => {
          taskItem.resolve(res);
        })
        .catch((err) => {
          taskItem.reject(err);
        })
        .finally(() => {
          this.running--;
          this._run();
        });
    }
  }

  /** Number of tasks waiting to run. */
  get size(): number {
    return this.queue.length;
  }

  /** Number of tasks currently executing. */
  get activeCount(): number {
    return this.running;
  }
}
