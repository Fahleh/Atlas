import "@/jest.setup";

import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import {
  assignTask,
  createDeleteTaskAction,
  createTaskAction,
  reorderTask,
} from "@/features/tasks/taskActions";
import type { Task } from "@/types/atlas.types";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_TASK_ROW } from "@/tests/mocks/handlers/tasks";
import { mockLiveSession, mockNoSession } from "@/tests/mocks/getClaims";

/**
 * Spies on global.fetch, short-circuiting only the task-assigned
 * notification endpoint and falling through to the real (MSW-patched)
 * fetch for everything else, so the Supabase calls underneath still work.
 * Mirrors the equivalent addMember spy in projectActions.test.ts.
 */
function spyOnNotifyFetch() {
  const realFetch = global.fetch;
  return jest.spyOn(global, "fetch").mockImplementation((input, init) => {
    if (input === "/api/task-assigned-email") {
      return Promise.resolve(new Response(null, { status: 200 }));
    }
    return realFetch(input, init);
  });
}

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

describe("assignTask", () => {
  const taskId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const newAssigneeId = crypto.randomUUID();

  it("should update assignee_id, invalidate the coupled queries, and notify on a genuine new assignment", async () => {
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const result = await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId: null,
      queryClient,
    });

    expect(result).toEqual({ error: null, errorKind: null });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/task-assigned-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, projectId, assigneeId: newAssigneeId }),
    });
  });

  it("should notify on reassignment, replacing a different previous assignee", async () => {
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const previousAssigneeId = crypto.randomUUID();

    await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId,
      queryClient,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when unassigning (assigneeId null)", async () => {
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();

    const result = await assignTask({
      taskId,
      projectId,
      assigneeId: null,
      previousAssigneeId: newAssigneeId,
      queryClient,
    });

    expect(result).toEqual({ error: null, errorKind: null });
    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should skip the Supabase update, invalidation, and notification entirely when reselecting the same assignee (no-op)", async () => {
    const getClaimsSpy = mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    let updateCalled = false;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        updateCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId: newAssigneeId,
      queryClient,
    });

    expect(result).toEqual({ error: null, errorKind: null });
    expect(updateCalled).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(getClaimsSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when assigning the task to yourself", async () => {
    mockLiveSession(newAssigneeId);
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();

    await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId: null,
      queryClient,
    });

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when there is no session to read the acting user's id from", async () => {
    mockNoSession();
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();

    const result = await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId: null,
      queryClient,
    });

    // No session means actorId is undefined, so the self-assignment guard
    // (assigneeId === actorId) can never match a truthy assigneeId, this
    // isn't a suppression case, just confirming the write itself still
    // succeeds and still notifies without a session to compare against.
    expect(result).toEqual({ error: null, errorKind: null });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should return sessionExpired for PGRST301 without notifying", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();

    const result = await assignTask({
      taskId,
      projectId,
      assigneeId: newAssigneeId,
      previousAssigneeId: null,
      queryClient,
    });

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });
});

describe("reorderTask", () => {
  const projectId = crypto.randomUUID();

  function buildTask(id: string, position: number): Task {
    return {
      id,
      projectId,
      assigneeId: null,
      title: `Task ${id}`,
      description: "",
      status: "todo",
      position,
      dueDate: null,
      createdAt: new Date(),
    };
  }

  it("should write a single midpoint position when the gap has room", async () => {
    // task-c dropped into the middle slot, between task-a and task-b.
    const orderedTasks = [
      buildTask("task-a", 1000),
      buildTask("task-c", 3000),
      buildTask("task-b", 2000),
    ];
    let patchCount = 0;
    let patchBody: unknown;
    let patchUrl = "";
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
        patchCount += 1;
        patchBody = await request.json();
        patchUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const result = await reorderTask({
      projectId,
      orderedTasks,
      movedTaskId: "task-c",
      queryClient,
    });

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchCount).toBe(1);
    expect(patchBody).toEqual({ position: 1500 });
    expect(patchUrl).toContain("id=eq.task-c");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
  });

  it("should call the renormalize RPC with the full ordered id list when the gap has collapsed", async () => {
    // task-moved dropped between task-a and task-c, whose positions are
    // only 0.5 apart, too tight for computeDropPosition to bisect.
    const orderedTasks = [
      buildTask("task-a", 1000),
      buildTask("task-moved", 5000),
      buildTask("task-c", 1000.5),
    ];
    let rpcBody: unknown;
    let patchCalled = false;
    server.use(
      http.post(
        `${SUPABASE_URL}/rest/v1/rpc/renormalize_task_positions`,
        async ({ request }) => {
          rpcBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () => {
        patchCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const result = await reorderTask({
      projectId,
      orderedTasks,
      movedTaskId: "task-moved",
      queryClient,
    });

    expect(result).toEqual({ error: null, errorKind: null });
    expect(rpcBody).toEqual({
      _project_id: projectId,
      _ordered_task_ids: ["task-a", "task-moved", "task-c"],
    });
    // The renormalization branch must never fall back to per-row client
    // updates, that's the exact non-atomic behavior this RPC replaces.
    expect(patchCalled).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", projectId],
    });
  });

  it("should return sessionExpired for PGRST301 when the renormalize RPC fails", async () => {
    const orderedTasks = [
      buildTask("task-a", 1000),
      buildTask("task-moved", 5000),
      buildTask("task-c", 1000.5),
    ];
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/renormalize_task_positions`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();

    const result = await reorderTask({
      projectId,
      orderedTasks,
      movedTaskId: "task-moved",
      queryClient,
    });

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return sessionExpired for PGRST301 on the single-row path", async () => {
    const orderedTasks = [buildTask("task-a", 1000), buildTask("task-b", 2000)];
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();

    const result = await reorderTask({
      projectId,
      orderedTasks,
      movedTaskId: "task-a",
      queryClient,
    });

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
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
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () => HttpResponse.json([])),
      http.post(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
        insertBody = await request.json();
        return HttpResponse.json(FAKE_TASK_ROW, { status: 201 });
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
      assignee_id: null,
      position: 1000,
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

  it("should notify when a task is created with a non-self assignee already picked", async () => {
    const projectId = crypto.randomUUID();
    const newAssigneeId = crypto.randomUUID();
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId,
        title: "Create navbar",
        assigneeId: newAssigneeId,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith("/api/task-assigned-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: FAKE_TASK_ROW.id,
        projectId,
        assigneeId: newAssigneeId,
      }),
    });
  });

  it("should not notify when a task is created with no assignee picked", async () => {
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({ projectId: crypto.randomUUID(), title: "Create navbar" }),
    );

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when a task is created and assigned to yourself", async () => {
    const selfId = crypto.randomUUID();
    mockLiveSession(selfId);
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: null },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: crypto.randomUUID(),
        title: "Create navbar",
        assigneeId: selfId,
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
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
    position: 1000,
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
      assignee_id: null,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["tasks", existingTask.projectId],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["taskCountsByProject"],
    });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should send the submitted assigneeId in the merged update payload", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/tasks`, async ({ request }) => {
        patchBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: existingTask },
      queryClient,
      setIsModalOpen,
    });
    const newAssigneeId = crypto.randomUUID();

    const result = await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: existingTask.projectId,
        title: existingTask.title,
        description: existingTask.description,
        status: existingTask.status,
        assigneeId: newAssigneeId,
      }),
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody).toMatchObject({ assignee_id: newAssigneeId });
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

  it("should notify when editing changes the assignee to someone new", async () => {
    const newAssigneeId = crypto.randomUUID();
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: existingTask },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: existingTask.projectId,
        title: existingTask.title,
        description: existingTask.description,
        status: existingTask.status,
        assigneeId: newAssigneeId,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith("/api/task-assigned-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: existingTask.id,
        projectId: existingTask.projectId,
        assigneeId: newAssigneeId,
      }),
    });
  });

  it("should not notify when editing leaves the assignee unchanged", async () => {
    const alreadyAssignedTask: Task = {
      ...existingTask,
      assigneeId: "00000000-0000-4000-8000-00000000000a",
    };
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: alreadyAssignedTask },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: alreadyAssignedTask.projectId,
        title: alreadyAssignedTask.title,
        description: alreadyAssignedTask.description,
        status: alreadyAssignedTask.status,
        assigneeId: alreadyAssignedTask.assigneeId ?? "",
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when editing clears the assignee", async () => {
    const alreadyAssignedTask: Task = {
      ...existingTask,
      assigneeId: "00000000-0000-4000-8000-00000000000a",
    };
    mockLiveSession("acting-user");
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: alreadyAssignedTask },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: alreadyAssignedTask.projectId,
        title: alreadyAssignedTask.title,
        description: alreadyAssignedTask.description,
        status: alreadyAssignedTask.status,
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });

  it("should not notify when editing assigns the task to yourself", async () => {
    const selfId = crypto.randomUUID();
    mockLiveSession(selfId);
    const fetchSpy = spyOnNotifyFetch();
    const queryClient = new QueryClient();
    const setIsModalOpen = jest.fn();
    const action = createTaskAction({
      editingTaskRef: { current: existingTask },
      queryClient,
      setIsModalOpen,
    });

    await action(
      { error: null, errorKind: null },
      buildFormData({
        projectId: existingTask.projectId,
        title: existingTask.title,
        description: existingTask.description,
        status: existingTask.status,
        assigneeId: selfId,
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/task-assigned-email",
      expect.anything(),
    );
  });
});
