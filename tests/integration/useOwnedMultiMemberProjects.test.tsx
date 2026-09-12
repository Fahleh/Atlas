/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useOwnedMultiMemberProjects } from "@/hooks/useOwnedMultiMemberProjects";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { mockNoSession, mockLiveSession } from "@/tests/mocks/getClaims";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useOwnedMultiMemberProjects", () => {
  it("should never fetch until useCurrentUser resolves an id", () => {
    let fetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () => {
        fetchCalled = true;
        return HttpResponse.json([]);
      }),
    );
    mockNoSession();

    const { result } = renderHookWithClient(() => useOwnedMultiMemberProjects());

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchCalled).toBe(false);
  });

  it("should return the owned multi-member projects, camelCased", async () => {
    mockLiveSession("owner-1");
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
        HttpResponse.json([
          {
            id: "project-1",
            name: "Shared Project",
            project_members: [{ user_id: "collab-1" }],
          },
        ]),
      ),
    );

    const { result } = renderHookWithClient(() => useOwnedMultiMemberProjects());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: "project-1", name: "Shared Project" },
    ]);
  });

  it("should return an empty list when the owner has no multi-member projects", async () => {
    mockLiveSession("owner-1");
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () => HttpResponse.json([])),
    );

    const { result } = renderHookWithClient(() => useOwnedMultiMemberProjects());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("should surface a SupabaseReadError on a failed fetch", async () => {
    mockLiveSession("owner-1");
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );

    const { result } = renderHookWithClient(() => useOwnedMultiMemberProjects());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });
});
