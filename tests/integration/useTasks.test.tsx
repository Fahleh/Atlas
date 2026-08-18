/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTasks } from "@/hooks/useTasks";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_TASK_ROW } from "@/tests/mocks/handlers/tasks";

describe("useTasks", () => {
  it("should start in a loading state before the fetch resolves", () => {
    const projectId = crypto.randomUUID();

    const { result } = renderHookWithClient(() => useTasks(projectId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("should return camelCased, date-parsed tasks on success", async () => {
    const projectId = crypto.randomUUID();

    const { result } = renderHookWithClient(() => useTasks(projectId));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: FAKE_TASK_ROW.id,
        assigneeId: null,
        projectId: FAKE_TASK_ROW.project_id,
        title: FAKE_TASK_ROW.title,
        description: FAKE_TASK_ROW.description,
        status: FAKE_TASK_ROW.status,
        dueDate: null,
        createdAt: new Date(FAKE_TASK_ROW.created_at),
      },
    ]);
  });

  it("should surface a SupabaseReadError with the connection-error message on a generic failure", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );
    const projectId = crypto.randomUUID();

    const { result } = renderHookWithClient(() => useTasks(projectId));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
    expect(result.current.error?.message).toBe(
      "Couldn't connect. Check your connection and try again.",
    );
  });

  it("should never fetch when projectId is empty, per enabled: !!projectId", async () => {
    let fetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        fetchCalled = true;
        return HttpResponse.json([FAKE_TASK_ROW]);
      }),
    );

    const { result } = renderHookWithClient(() => useTasks(""));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(fetchCalled).toBe(false);
  });
});
