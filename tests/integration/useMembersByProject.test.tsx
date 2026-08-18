/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useMembersByProject } from "@/hooks/useMembersByProject";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

describe("useMembersByProject", () => {
  it("should start in a loading state before the fetch resolves", () => {
    const { result } = renderHookWithClient(() => useMembersByProject(["project-1"]));

    expect(result.current.isLoading).toBe(true);
  });

  it("should never fetch when projectIds is empty, per enabled: sortedIds.length > 0", () => {
    let fetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_members`, () => {
        fetchCalled = true;
        return HttpResponse.json([]);
      }),
    );

    const { result } = renderHookWithClient(() => useMembersByProject([]));

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchCalled).toBe(false);
  });

  it("should group by project, sort by joinedAt, drop null profiles, and default an unrecognized role to collaborator", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        HttpResponse.json([
          {
            project_id: "project-1",
            role: "owner",
            joined_at: "2026-01-02T00:00:00.000Z",
            profiles: { id: "user-2", name: "Second", avatar_url: null },
          },
          {
            project_id: "project-1",
            role: "unrecognized-role",
            joined_at: "2026-01-01T00:00:00.000Z",
            profiles: { id: "user-1", name: "First", avatar_url: null },
          },
          {
            project_id: "project-1",
            role: "owner",
            joined_at: "2026-01-03T00:00:00.000Z",
            profiles: null,
          },
          {
            project_id: "project-2",
            role: "collaborator",
            joined_at: "2026-01-01T00:00:00.000Z",
            profiles: { id: "user-3", name: "Third", avatar_url: null },
          },
        ]),
      ),
    );

    const { result } = renderHookWithClient(() =>
      useMembersByProject(["project-1", "project-2"]),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      "project-1": [
        { id: "user-1", name: "First", avatarUrl: null, role: "collaborator" },
        { id: "user-2", name: "Second", avatarUrl: null, role: "owner" },
      ],
      "project-2": [{ id: "user-3", name: "Third", avatarUrl: null, role: "collaborator" }],
    });
  });

  it("should surface a SupabaseReadError on a failed fetch", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );

    const { result } = renderHookWithClient(() => useMembersByProject(["project-1"]));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });
});
