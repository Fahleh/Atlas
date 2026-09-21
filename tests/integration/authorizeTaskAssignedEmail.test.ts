import "@/jest.setup";

import { http, HttpResponse } from "msw";
import { createClient } from "@/lib/supabase/client";
import { authorizeTaskAssignedEmail } from "@/lib/authorizeTaskAssignedEmail";
import { server } from "@/tests/mocks/server";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_TASK_ROW } from "@/tests/mocks/handlers/tasks";
import { FAKE_PROJECT_ROW } from "@/tests/mocks/handlers/projects";
import { FAKE_PROFILE_ROW } from "@/tests/mocks/handlers/profiles";
import { mockNoSession, mockLiveSession } from "@/tests/mocks/getClaims";

const ACTOR_ID = FAKE_PROFILE_ROW.id;
const ASSIGNEE_ID = "00000000-0000-4000-8000-00000000000a";

const ASSIGNED_TASK_ROW = {
  ...FAKE_TASK_ROW,
  assignee_id: ASSIGNEE_ID,
};

describe("authorizeTaskAssignedEmail", () => {
  // Shared tasks/projects/profiles handlers return arrays; .maybeSingle()/
  // .single() need a bare object, so this file overrides all three defaults.
  beforeEach(() => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        HttpResponse.json(ASSIGNED_TASK_ROW),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
        HttpResponse.json(FAKE_PROJECT_ROW),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        HttpResponse.json(FAKE_PROFILE_ROW),
      ),
    );
  });

  it("returns 401 when there is no session", async () => {
    mockNoSession();
    const supabase = createClient();

    const result = await authorizeTaskAssignedEmail(supabase, {
      taskId: ASSIGNED_TASK_ROW.id,
      projectId: ASSIGNED_TASK_ROW.project_id,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result).toEqual({
      authorized: false,
      status: 401,
      error: "Not authenticated.",
    });
  });

  it("returns 403 when the caller is not a member of the project", async () => {
    mockLiveSession("not-a-member");
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        HttpResponse.json([]),
      ),
    );
    const supabase = createClient();

    const result = await authorizeTaskAssignedEmail(supabase, {
      taskId: ASSIGNED_TASK_ROW.id,
      projectId: ASSIGNED_TASK_ROW.project_id,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result).toEqual({
      authorized: false,
      status: 403,
      error: "Not authorized.",
    });
  });

  it("returns 404 when the task does not belong to the claimed project", async () => {
    mockLiveSession(ACTOR_ID);
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        HttpResponse.json({ ...ASSIGNED_TASK_ROW, project_id: "different-project" }),
      ),
    );
    const supabase = createClient();

    const result = await authorizeTaskAssignedEmail(supabase, {
      taskId: ASSIGNED_TASK_ROW.id,
      projectId: ASSIGNED_TASK_ROW.project_id,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result).toEqual({
      authorized: false,
      status: 404,
      error: "Task not found.",
    });
  });

  it("returns 403 when the claimed assigneeId does not match the task's actual current assignee", async () => {
    mockLiveSession(ACTOR_ID);
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tasks`, () =>
        HttpResponse.json({ ...ASSIGNED_TASK_ROW, assignee_id: "someone-else" }),
      ),
    );
    const supabase = createClient();

    const result = await authorizeTaskAssignedEmail(supabase, {
      taskId: ASSIGNED_TASK_ROW.id,
      projectId: ASSIGNED_TASK_ROW.project_id,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result).toEqual({
      authorized: false,
      status: 403,
      error: "That assignment does not match the task's current state.",
    });
  });

  it("authorizes and returns the actor name, project name, and task title when every check passes", async () => {
    mockLiveSession(ACTOR_ID);
    const supabase = createClient();

    const result = await authorizeTaskAssignedEmail(supabase, {
      taskId: ASSIGNED_TASK_ROW.id,
      projectId: ASSIGNED_TASK_ROW.project_id,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result).toEqual({
      authorized: true,
      actorName: "Fake User",
      projectName: "Fake Project",
      taskTitle: "Fake task",
    });
  });
});
