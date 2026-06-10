import { fetcher } from "@/lib";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("fetcher", () => {
  global.fetch = jest.fn();

  it("should return json data of type T on successful fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "619", title: "Atlas" }),
    });

    const result = await fetcher<{ id: string; title: string }>(
      "/endpoint/projects/619",
    );

    expect(result).toEqual({ id: "619", title: "Atlas" });
  });

  it("should return an error object of type 'server' on failed fetch with status < 500", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await fetcher<{ id: string; title: string }>(
      "/endpoint/projects/619",
    );

    expect(result).toEqual({
      status: 404,
      message: "Not Found",
      type: "server",
    });
  });

  it("should retry on server errors of status 5XX and return a server error after all retry attempts ", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

    jest.useFakeTimers();

    const resultPromise = fetcher<{ id: string; title: string }>(
      "/endpoint/projects/619",
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(global.fetch).toHaveBeenCalledTimes(3);

    expect(result).toEqual({
      status: 500,
      message: "Internal Server Error",
      type: "server",
    });
  });

  it("should return an error object on failed fetch and a json data of type T on successful retry", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "619", title: "Atlas" }),
      });

    jest.useFakeTimers();

    const resultPromise = fetcher<{ id: string; title: string }>(
      "/endpoint/projects/619",
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ id: "619", title: "Atlas" });
  });

  it("should return an error object of type 'network' when fetch rejects aafter all retry attempts", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"));

    jest.useFakeTimers();

    const resultPromise = fetcher<{ id: string; title: string }>(
      "/endpoint/projects/619",
    );
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({
      status: null,
      message: "Network error",
      type: "network",
    });
  });
});
