import { AsyncQueue } from "@/lib";

afterEach(() => {
  jest.useRealTimers();
});

describe("AsyncQueue", () => {
  it("should return a promise that resolves with the result of the task", async () => {
    const queue = new AsyncQueue();

    const result = await queue.add(() =>
      Promise.resolve({ id: "619", name: "John Doe" }),
    );

    expect(result).toEqual({ id: "619", name: "John Doe" });
  });

  it("should return completed tasks in the order they were added", async () => {
    const queue = new AsyncQueue({ concurrency: 1 });
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const completed: Array<string> = [];

    jest.useFakeTimers();

    const task1 = queue.add(async () => {
      await delay(10);

      completed.push("task1");
      return "task1";
    });

    const task2 = queue.add(async () => {
      await delay(10);

      completed.push("task2");
      return "task2";
    });

    const task3 = queue.add(async () => {
      await delay(10);

      completed.push("task3");
      return "task3";
    });

    const resultPromise = Promise.all([task1, task2, task3]);

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(completed).toEqual(["task1", "task2", "task3"]);
    expect(result).toEqual(["task1", "task2", "task3"]);
  });

  it("should not exceed concurrency limit", async () => {
    const concurrency = 2;
    const queue = new AsyncQueue({ concurrency });
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    let concurrent = 0;
    let maxConcurrent = 0;

    jest.useFakeTimers();

    const task = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await delay(10);
      concurrent--;
    };
    
    const resultPromise = Promise.all([
      queue.add(task),
      queue.add(task),
      queue.add(task),
      queue.add(task),
    ]);

    await jest.runAllTimersAsync();

    await resultPromise;

    expect(maxConcurrent).toBeLessThanOrEqual(concurrency);
  });

  it("should have an empty task queue after all tasks are completed", async () => {
    const queue = new AsyncQueue({ concurrency: 2 });
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    jest.useFakeTimers();

    const task1 = async () => {
      await delay(10);

      return "task1";
    };

    const task2 = async () => {
      await delay(10);

      return "task2";
    };

    const task3 = async () => {
      await delay(10);

      return "task3";
    };

    const resultPromise = Promise.all([
      queue.add(task1),
      queue.add(task2),
      queue.add(task3),
    ]);

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toEqual(["task1", "task2", "task3"]);
    expect(queue.size).toEqual(0);
  });

  it("should continue processing queued tasks when a task rejects", async () => {
    const queue = new AsyncQueue({ concurrency: 2 });
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    jest.useFakeTimers();

    const task1 = async () => {
      await delay(10);

      return "task1";
    };

    const task2 = async () => {
      await delay(10);

      throw new Error("task2 failed");
    };

    const task3 = async () => {
      await delay(10);

      return "task3";
    };

    const resultPromise = Promise.allSettled([
      queue.add(task1),
      queue.add(task2),
      queue.add(task3),
    ]);

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result[0]).toEqual({
      status: "fulfilled",
      value: "task1",
    });

    expect(result[1]).toMatchObject({
      status: "rejected",
      reason: expect.any(Error),
    });

    expect(result[1].status).toBe("rejected");

    if (result[1].status === "rejected") {
      expect(result[1].reason.message).toBe("task2 failed");
    }

    expect(result[2]).toEqual({
      status: "fulfilled",
      value: "task3",
    });
  });
});
