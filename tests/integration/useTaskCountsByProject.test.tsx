/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

describe("useTaskCountsByProject", () => {
  it("should start in a loading state before the fetch resolves", () => {
    const { result } = renderHookWithClient(() => useTaskCountsByProject(["project-1"]));

    expect(result.current.isLoading).toBe(true);
  });

  it("should never fetch when projectIds is empty, per enabled: sortedIds.length > 0", () => {
    let fetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_task_stats`, () => {
        fetchCalled = true;
        return HttpResponse.json([]);
      }),
    );

    const { result } = renderHookWithClient(() => useTaskCountsByProject([]));

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchCalled).toBe(false);
  });

  it("should group counts by project, defaulting null total/done to 0", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_task_stats`, () =>
        HttpResponse.json([
          { project_id: "project-1", total_tasks: 4, done_tasks: 1 },
          { project_id: "project-2", total_tasks: null, done_tasks: null },
        ]),
      ),
    );

    const { result } = renderHookWithClient(() =>
      useTaskCountsByProject(["project-1", "project-2"]),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      "project-1": { total: 4, done: 1 },
      "project-2": { total: 0, done: 0 },
    });
  });

  it("should surface a SupabaseReadError on a failed fetch", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_task_stats`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );

    const { result } = renderHookWithClient(() => useTaskCountsByProject(["project-1"]));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });
});
