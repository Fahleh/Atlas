/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useDueSoonTaskCount } from "@/hooks/useDueSoonTaskCount";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

describe("useDueSoonTaskCount", () => {
  it("should start in a loading state before the count resolves", () => {
    const nowMs = Date.now();

    const { result } = renderHookWithClient(() => useDueSoonTaskCount(nowMs));

    expect(result.current.isLoading).toBe(true);
  });

  it("should read the count from the Content-Range header, not a response body", async () => {
    server.use(
      http.head(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        return new HttpResponse(null, {
          status: 200,
          headers: { "Content-Range": "*/5" },
        });
      }),
    );
    const nowMs = Date.now();

    const { result } = renderHookWithClient(() => useDueSoonTaskCount(nowMs));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(5);
  });

  it("should surface a SupabaseReadError on a failed count request", async () => {
    server.use(
      http.head(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );
    const nowMs = Date.now();

    const { result } = renderHookWithClient(() => useDueSoonTaskCount(nowMs));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });

  it("should use a distinct cache entry per nowMs, keeping both after a remount", async () => {
    server.use(
      http.head(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        return new HttpResponse(null, {
          status: 200,
          headers: { "Content-Range": "*/3" },
        });
      }),
    );
    const firstMount = Date.now();
    const secondMount = firstMount + 1;

    const { result, rerender, queryClient } = renderHookWithClient(
      ({ nowMs }: { nowMs: number }) => useDueSoonTaskCount(nowMs),
      { initialProps: { nowMs: firstMount } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ nowMs: secondMount });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      queryClient.getQueryCache().find({ queryKey: ["dueSoonTaskCount", firstMount] })?.state
        .status,
    ).toBe("success");
    expect(
      queryClient.getQueryCache().find({ queryKey: ["dueSoonTaskCount", secondMount] })?.state
        .status,
    ).toBe("success");
  });
});
