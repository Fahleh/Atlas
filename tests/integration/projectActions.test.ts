import "@/jest.setup";

import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { GoTrueClient } from "@supabase/auth-js";
import {
  deleteProject,
  addMember,
  removeMember,
  createProjectAction,
} from "@/features/projects/projectActions";
import type { Project } from "@/types/atlas.types";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import {
  mockNoSession,
  mockLiveSession,
  type GetClaimsResult,
} from "@/tests/mocks/getClaims";

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("deleteProject", () => {
  it("should delete a project and invalidate the projects and tasks queries on success", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const projectId = crypto.randomUUID();

    const result = await deleteProject(projectId, queryClient);

    expect(result).toEqual({ error: null, errorKind: null });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
  });

  it("should return sessionExpired for PGRST301 and invalidate nothing", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const projectId = crypto.randomUUID();

    const result = await deleteProject(projectId, queryClient);

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("should return sessionExpired for 42501 when getClaims finds no session", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockNoSession();

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const projectId = crypto.randomUUID();

    const result = await deleteProject(projectId, queryClient);

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("should return forbidden for 42501 when getClaims finds a live session", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockLiveSession();

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const projectId = crypto.randomUUID();

    const result = await deleteProject(projectId, queryClient);

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("addMember", () => {
  it("should add a member, invalidate projectMembers, and notify the new route on success", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    // MSW patches global.fetch too; this mock falls through to it for
    // the Supabase calls, or the RPC lookup breaks.
    const realFetch = global.fetch;
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockImplementation((input, init) => {
        if (input === "/api/member-added-email") {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        return realFetch(input, init);
      });
    const projectId = crypto.randomUUID();
    const email = "new-member@example.com";

    const result = await addMember(projectId, email, queryClient);

    expect(result).toEqual({ error: null, errorKind: null });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projectMembers"],
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/member-added-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, email }),
    });
  });

  it("should return a not-found message and never attempt the insert when the RPC finds no account", async () => {
    let insertCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/lookup_user_id_by_email`, () =>
        HttpResponse.json(null),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () => {
        insertCalled = true;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "nobody@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "No Atlas account found with that email.",
      errorKind: null,
    });
    expect(insertCalled).toBe(false);
  });

  it("should return sessionExpired when the RPC itself fails with PGRST301, never attempting the insert", async () => {
    let insertCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/lookup_user_id_by_email`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () => {
        insertCalled = true;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "user@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(insertCalled).toBe(false);
  });

  it("should return the already-a-member message for a 23505 insert conflict, not the generic interpreter message", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "23505", message: "duplicate key value" }, 409),
      ),
    );
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "already-member@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "This person is already a member of this project.",
      errorKind: null,
    });
  });

  it("should return sessionExpired for PGRST301 on the insert", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "user@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return sessionExpired for a 42501 insert failure when getClaims finds no session", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockNoSession();
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "user@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return forbidden for a 42501 insert failure when getClaims finds a live session", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockLiveSession();
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "user@example.com",
      queryClient,
    );

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
  });

  it("should pass through an unmatched insert error code's message", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "23503", message: "foreign key violation" }, 409),
      ),
    );
    const queryClient = new QueryClient();

    const result = await addMember(
      crypto.randomUUID(),
      "user@example.com",
      queryClient,
    );

    expect(result).toEqual({ error: "foreign key violation", errorKind: null });
  });
});

describe("removeMember", () => {
  it("should remove a member and invalidate projectMembers on success", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const result = await removeMember(
      crypto.randomUUID(),
      crypto.randomUUID(),
      queryClient,
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projectMembers"],
    });
  });

  it("should return sessionExpired for PGRST301", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const result = await removeMember(
      crypto.randomUUID(),
      crypto.randomUUID(),
      queryClient,
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("should return sessionExpired for a 42501 delete failure when getClaims finds no session", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockNoSession();
    const queryClient = new QueryClient();

    const result = await removeMember(
      crypto.randomUUID(),
      crypto.randomUUID(),
      queryClient,
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return forbidden for a 42501 delete failure when getClaims finds a live session", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    mockLiveSession();
    const queryClient = new QueryClient();

    const result = await removeMember(
      crypto.randomUUID(),
      crypto.randomUUID(),
      queryClient,
    );

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
  });
});

describe("createProjectAction, create branch", () => {
  it("should return sessionExpired and never attempt the insert when getClaims finds no session", async () => {
    mockNoSession();
    let insertCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, () => {
        insertCalled = true;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "Not authenticated.",
      errorKind: "sessionExpired",
    });
    expect(insertCalled).toBe(false);
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });

  it("should return a validation error for a blank name without creating a Supabase client", async () => {
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "   ", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "Project name is required.",
      errorKind: null,
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });

  it("should insert with owner_id from JWT claims, not form data, and invalidate/close on success", async () => {
    mockLiveSession();
    let insertBody: unknown;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
        insertBody = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        name: "Atlas",
        description: "A PM tool",
        status: "completed",
        dueDate: "2026-12-31",
      }),
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(insertBody).toEqual({
      owner_id: "user-123",
      name: "Atlas",
      description: "A PM tool",
      status: "completed",
      due_date: "2026-12-31",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should fall back to active status when an invalid status value is submitted", async () => {
    mockLiveSession();
    let insertBody: { status?: string } | undefined;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
        insertBody = (await request.json()) as { status?: string };
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        name: "Atlas",
        description: "A PM tool",
        status: "not-a-real-status",
      }),
    );

    expect(insertBody?.status).toBe("active");
  });

  it("should return sessionExpired for PGRST301 on the insert", async () => {
    mockLiveSession();
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });

  it("should return sessionExpired for a 42501 insert failure when the session has since expired", async () => {
    jest
      .spyOn(GoTrueClient.prototype, "getClaims")
      .mockResolvedValueOnce({
        data: { claims: { sub: "user-123" }, header: {}, signature: new Uint8Array() },
        error: null,
      } as GetClaimsResult)
      .mockResolvedValueOnce({ data: null, error: null } as GetClaimsResult);
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return forbidden for a 42501 insert failure with a live session throughout", async () => {
    mockLiveSession();
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "42501", message: "permission denied" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
  });

  it("should pass through an unmatched insert error code's message", async () => {
    mockLiveSession();
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "23514", message: "check constraint violation" }, 400),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas", description: "A PM tool" }),
    );

    expect(result).toEqual({
      error: "check constraint violation",
      errorKind: null,
    });
  });
});

describe("createProjectAction, edit branch", () => {
  const existingProject: Project = {
    id: crypto.randomUUID(),
    ownerId: "user-123",
    name: "Atlas",
    description: "A PM tool",
    dueDate: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should send the merged update payload and invalidate/close on success", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
        patchBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: existingProject },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        name: "Atlas Pro",
        description: "An updated PM tool",
        status: "completed",
        dueDate: "2026-12-31",
      }),
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody).toEqual({
      name: "Atlas Pro",
      description: "An updated PM tool",
      status: "completed",
      due_date: "2026-12-31",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should return sessionExpired for PGRST301 without closing the modal", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/projects`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createProjectAction({
      editingProjectRef: { current: existingProject },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ name: "Atlas Pro", description: "An updated PM tool" }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });
});
