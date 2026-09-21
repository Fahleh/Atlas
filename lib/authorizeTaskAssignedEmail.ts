import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Types ------------------------------------------------------------------

export type AuthorizeTaskAssignedEmailResult =
  | { authorized: true; actorName: string; projectName: string; taskTitle: string }
  | { authorized: false; status: 401 | 403 | 404 | 500; error: string };

// ---- Authorization ------------------------------------------------------------

/**
 * Confirms the caller is a member of the project (any role) and that the
 * task's actual current assignee matches what the caller claims, before
 * app/api/task-assigned-email/route.ts sends anything. Unlike
 * authorizeMemberAddedEmail, this does not require the caller be the
 * project owner: any project member can reassign a task, per
 * "tasks: project members can update" (docs/database.md).
 *
 * @param supabase - authenticated server Supabase client for this request
 * @param params - the task, its project, and the assigneeId the caller claims was just assigned
 * @returns actor name, project name, and task title on success, or a status/error to return as-is
 */
export async function authorizeTaskAssignedEmail(
  supabase: SupabaseClient,
  {
    taskId,
    projectId,
    assigneeId,
  }: { taskId: string; projectId: string; assigneeId: string },
): Promise<AuthorizeTaskAssignedEmailResult> {
  const { data: claims } = await supabase.auth.getClaims();
  const actorId = claims?.claims.sub;
  if (!actorId) {
    return { authorized: false, status: 401, error: "Not authenticated." };
  }

  const { data: callerMembership } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", actorId)
    .maybeSingle();

  if (!callerMembership) {
    return { authorized: false, status: 403, error: "Not authorized." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, project_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.project_id !== projectId) {
    return { authorized: false, status: 404, error: "Task not found." };
  }

  if (task.assignee_id !== assigneeId) {
    return {
      authorized: false,
      status: 403,
      error: "That assignment does not match the task's current state.",
    };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { authorized: false, status: 500, error: "Project not found." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .single();

  if (!actor) {
    return {
      authorized: false,
      status: 500,
      error: "Actor profile not found.",
    };
  }

  return {
    authorized: true,
    actorName: actor.name,
    projectName: project.name,
    taskTitle: task.title,
  };
}
