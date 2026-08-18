/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http } from "msw";
import { useProjects } from "@/hooks/useProjects";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_PROJECT_ROW } from "@/tests/mocks/handlers/projects";

describe("useProjects", () => {
  it("should start in a loading state before the fetch resolves", () => {
    const { result } = renderHookWithClient(() => useProjects());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return camelCased, date-parsed projects on success", async () => {
    const { result } = renderHookWithClient(() => useProjects());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: FAKE_PROJECT_ROW.id,
        ownerId: FAKE_PROJECT_ROW.owner_id,
        name: FAKE_PROJECT_ROW.name,
        description: FAKE_PROJECT_ROW.description,
        status: FAKE_PROJECT_ROW.status,
        dueDate: null,
        createdAt: new Date(FAKE_PROJECT_ROW.created_at),
        updatedAt: new Date(FAKE_PROJECT_ROW.updated_at),
      },
    ]);
  });

  it("should surface a SupabaseReadError on a failed fetch", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );

    const { result } = renderHookWithClient(() => useProjects());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });
});
