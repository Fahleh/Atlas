import "@/jest.setup";

import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import {
  createDeleteTaskAction,
  createTaskAction,
} from "@/features/tasks/taskActions";
import type { Task } from "@/types/atlas.types";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

afterEach(() => {
  jest.restoreAllMocks();
});

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createDeleteTaskAction", () => {
  it("should return an error and make no Supabase call when no task is selected", async () => {
    let deleteCalled = false;
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createDeleteTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(buildFormData({ projectId: crypto.randomUUID() }));

    expect(result).toEqual({ error: "No task selected.", errorKind: null });
    expect(deleteCalled).toBe(false);
  });

  it("should return an error and make no Supabase call when projectId is missing", async () => {
    let deleteCalled = false;
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const task = { id: crypto.randomUUID() } as Task;
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createDeleteTaskAction({
      editingTaskRef: { current: task },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(buildFormData({}));

    expect(result).toEqual({
      error: "Project ID is required.",
      errorKind: null,
    });
    expect(deleteCalled).toBe(false);
  });

  it("should delete the task, invalidate the coupled tasks/taskCounts queries, and close the modal on success", async () => {
    const task = { id: crypto.randomUUID() } as Task;
    const projectId = crypto.randomUUID();
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const setIsModalOpen = jest.fn();
    const action = createDeleteTaskAction({
      editingTaskRef: { current: task },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(buildFormData({ projectId }));

    expect(result).toEqual({ error: null, errorKind: null });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["taskCountsByProject"],
    });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should return sessionExpired for PGRST301 without closing the modal", async () => {
    server.use(
      http.delete(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const task = { id: crypto.randomUUID() } as Task;
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createDeleteTaskAction({
      editingTaskRef: { current: task },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      buildFormData({ projectId: crypto.randomUUID() }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });
});

describe("createTaskAction, create branch", () => {
  it("should return an error and make no Supabase call when projectId is missing", async () => {
    let insertCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        insertCalled = true;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ title: "Create navbar" }),
    );

    expect(result).toEqual({
      error: "Project ID is required",
      errorKind: null,
    });
    expect(insertCalled).toBe(false);
  });

  it("should return an error and make no Supabase call for a blank title", async () => {
    let insertCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        insertCalled = true;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ projectId: crypto.randomUUID(), title: "   " }),
    );

    expect(result).toEqual({ error: "Title is required", errorKind: null });
    expect(insertCalled).toBe(false);
  });

  it("should insert the task, invalidate the coupled queries, and close the modal on success", async () => {
    const projectId = crypto.randomUUID();
    let insertBody: unknown;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
        insertBody = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId,
        title: "Create navbar",
        description: "Build the nav menu",
        status: "in_progress",
        dueDate: "2026-12-31",
      }),
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(insertBody).toEqual({
      project_id: projectId,
      title: "Create navbar",
      description: "Build the nav menu",
      status: "in_progress",
      due_date: "2026-12-31",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["taskCountsByProject"],
    });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should return sessionExpired for PGRST301 without closing the modal", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({ projectId: crypto.randomUUID(), title: "Create navbar" }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });
});

describe("createTaskAction, edit branch", () => {
  const existingTask: Task = {
    id: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    assigneeId: null,
    title: "Create navbar",
    description: "Build the nav menu",
    dueDate: null,
    status: "todo",
    createdAt: new Date(),
  };

  it("should send the merged update payload, invalidate the coupled queries, and close the modal on success", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
        patchBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: existingTask },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: existingTask.projectId,
        title: "Create web and mobile navbars",
        description: "Build nav menus for all devices",
        status: "done",
        dueDate: "2026-12-31",
      }),
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody).toEqual({
      title: "Create web and mobile navbars",
      description: "Build nav menus for all devices",
      status: "done",
      due_date: "2026-12-31",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", existingTask.projectId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["taskCountsByProject"],
    });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should return sessionExpired for PGRST301 without closing the modal", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: existingTask },
      queryClient,
      setIsModalOpen,
    });

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: existingTask.projectId,
        title: "Create web and mobile navbars",
      }),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();
  });
});
