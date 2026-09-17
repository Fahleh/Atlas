"use client";

import { createClient } from "@/lib/supabase/client";
import { interpretSupabaseWriteError } from "@/lib/supabase/errors";
import { updateTask, updateTaskStatus } from "@/lib";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";
import type { TaskFormState, DeleteTaskState } from "./TaskModal";

// ---- Types ------------------------------------------------------------------

export type CreateTaskActionDeps = {
  editingTaskRef: React.RefObject<Task | null>;
  queryClient: QueryClient;
  setIsModalOpen: (open: boolean) => void;
};

// ---- Invalidation helper -----------------------------------------------------

// Runs both invalidations in parallel. They're independent of each other.
async function invalidateTaskQueries(
  queryClient: QueryClient,
  taskQueryKey: QueryKey,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: taskQueryKey }),
    queryClient.invalidateQueries({ queryKey: ["taskCountsByProject"] }),
    queryClient.invalidateQueries({ queryKey: ["activityLog"] }),
  ]);
}

// ---- Assign -------------------------------------------------------------------

export type AssignTaskParams = {
  taskId: string;
  projectId: string;
  assigneeId: string | null;
  previousAssigneeId: string | null;
  queryClient: QueryClient;
};

/**
 * Fires the task-assigned notification, unawaited, own .catch(), outside
 * cache invalidation. Only for a genuine new assignment to someone other
 * than the acting user: assigneeId must be set, must differ from what it
 * was before, and must not be the person doing the assigning. See
 * docs/decisions.md.
 */
function notifyTaskAssigned(params: {
  taskId: string;
  projectId: string;
  assigneeId: string | null;
  previousAssigneeId: string | null;
  actorId: string | undefined;
}) {
  const { taskId, projectId, assigneeId, previousAssigneeId, actorId } =
    params;
  if (!assigneeId) return;
  if (assigneeId === previousAssigneeId) return;
  if (assigneeId === actorId) return;

  fetch("/api/task-assigned-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, projectId, assigneeId }),
  }).catch(() => {});
}

/**
 * Directly updates a task's assignee. Used by the inline quick-assign
 * popover in TaskList, not a form action, there is no form here, the
 * popover selection is the action itself.
 *
 * @param params - taskId, projectId (for cache invalidation), the new assigneeId, previousAssigneeId (for the notification's change guard), and queryClient
 * @returns `{ error, errorKind }`, both null on success
 */
export async function assignTask({
  taskId,
  projectId,
  assigneeId,
  previousAssigneeId,
  queryClient,
}: AssignTaskParams): Promise<TaskFormState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId })
    .eq("id", taskId);

  if (error) return interpretSupabaseWriteError(error, supabase);

  await invalidateTaskQueries(queryClient, ["tasks", projectId]);

  const { data: claims } = await supabase.auth.getClaims();
  notifyTaskAssigned({
    taskId,
    projectId,
    assigneeId,
    previousAssigneeId,
    actorId: claims?.claims.sub,
  });

  return { error: null, errorKind: null };
}

// ---- Delete factory ---------------------------------------------------------

/**
 * Returns a single-arg form action for deleting the current task.
 * Uses the direct `(formData: FormData) => Promise<{ error }>` signature
 * (not the two-arg `useActionState` shape) since it is invoked via a button's
 * `formAction` attribute rather than through `useActionState`.
 *
 * Reads `projectId` from FormData (always present as a hidden input in the task
 * modal form) to scope the React Query invalidation correctly.
 *
 * @param deps - Same stable references as createTaskAction
 * @returns A `(formData: FormData) => Promise<DeleteTaskState>` action
 */
export function createDeleteTaskAction(
  deps: CreateTaskActionDeps,
): (formData: FormData) => Promise<DeleteTaskState> {
  const { editingTaskRef, queryClient, setIsModalOpen } = deps;

  return async function deleteTaskAction(
    formData: FormData,
  ): Promise<DeleteTaskState> {
    const currentTask = editingTaskRef.current;
    if (!currentTask) return { error: "No task selected.", errorKind: null };

    const projectId = formData.get("projectId") as string | null;
    if (!projectId)
      return { error: "Project ID is required.", errorKind: null };

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", currentTask.id);

    if (error) return interpretSupabaseWriteError(error, supabase);

    await invalidateTaskQueries(queryClient, ["tasks", projectId]);
    setIsModalOpen(false);
    return { error: null, errorKind: null };
  };
}

// ---- Save helpers -----------------------------------------------------------

const VALID_STATUSES = Object.keys(STATUS_CONFIG) as readonly TaskStatus[];

function isTaskStatus(value: string): value is TaskStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

// ---- Factory ----------------------------------------------------------------

/**
 * Returns a React 19 form action for creating and editing tasks.
 * Accepts the stable component dependencies as a plain object rather than
 * closing over component scope directly, making the logic independently testable.
 *
 * The returned action reads `projectId` and the edit/create mode from FormData
 * and derives the current task from `editingTaskRef`, avoiding stale closures.
 *
 * @param deps - Stable references: editingTaskRef, queryClient, setIsModalOpen
 * @returns A `(prevState, formData) => Promise<TaskFormState>` action function
 */
export function createTaskAction(
  deps: CreateTaskActionDeps,
): (prevState: TaskFormState, formData: FormData) => Promise<TaskFormState> {
  const { editingTaskRef, queryClient, setIsModalOpen } = deps;

  return async function taskAction(
    _prevState: TaskFormState,
    formData: FormData,
  ): Promise<TaskFormState> {
    const titleRaw = formData.get("title") as string | null;
    const description = (formData.get("description") as string | null) ?? "";
    const statusRaw = formData.get("status") as string | null;
    const dueDateRaw = formData.get("dueDate") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const assigneeIdRaw = formData.get("assigneeId") as string | null;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    const assigneeId = !assigneeIdRaw?.trim() ? null : assigneeIdRaw;

    if (!projectId)
      return { error: "Project ID is required", errorKind: null };

    const title = titleRaw?.trim();
    if (!title) return { error: "Title is required", errorKind: null };
    if (title.length > 100)
      return {
        error: "Title must be at most 100 characters long.",
        errorKind: null,
      };
    if (description.length > 2000)
      return {
        error: "Description must be at most 2000 characters long.",
        errorKind: null,
      };

    let status: TaskStatus = "todo";
    if (statusRaw && isTaskStatus(statusRaw)) {
      status = statusRaw;
    }

    const supabase = createClient();
    const currentTask = editingTaskRef.current;
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = claims?.claims.sub;

    if (currentTask) {
      // Edit. Apply general changes then status change, merge into one update.
      const withChanges = updateTask(currentTask, {
        title,
        description,
        dueDate,
        assigneeId,
      });
      const final = updateTaskStatus(withChanges, status);

      const { error } = await supabase
        .from("tasks")
        .update({
          title: final.title,
          description: final.description,
          status: final.status,
          due_date: final.dueDate
            ? final.dueDate.toISOString().split("T")[0]
            : null,
          assignee_id: final.assigneeId,
        })
        .eq("id", final.id);

      if (error) return interpretSupabaseWriteError(error, supabase);

      await invalidateTaskQueries(queryClient, ["tasks", projectId]);
      notifyTaskAssigned({
        taskId: final.id,
        projectId,
        assigneeId: final.assigneeId,
        previousAssigneeId: currentTask.assigneeId,
        actorId,
      });
    } else {
      // Create
      const { data: created, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title,
          description,
          status,
          due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
          assignee_id: assigneeId,
        })
        .select("id")
        .single();

      if (error) return interpretSupabaseWriteError(error, supabase);

      await invalidateTaskQueries(queryClient, ["tasks", projectId]);
      notifyTaskAssigned({
        taskId: created.id,
        projectId,
        assigneeId,
        previousAssigneeId: null,
        actorId,
      });
    }

    setIsModalOpen(false);
    return { error: null, errorKind: null };
  };
}
