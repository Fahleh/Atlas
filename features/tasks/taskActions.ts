"use client";

import { createClient } from "@/lib/supabase/client";
import { updateTask, updateTaskStatus } from "@/lib/updateImmutable";
import type { QueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";
import type { TaskFormState } from "./TaskModal";

// ---- Types ------------------------------------------------------------------

export type CreateTaskActionDeps = {
  editingTaskRef: React.RefObject<Task | null>;
  queryClient: QueryClient;
  setIsModalOpen: (open: boolean) => void;
};

// ---- Helpers ----------------------------------------------------------------

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
 * Will 401 against live Supabase until auth is wired end-to-end — expected;
 * the error surfaces in the modal's error banner.
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
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    if (!projectId) return { error: "Project ID is required" };

    const title = titleRaw?.trim();
    if (!title) return { error: "Title is required" };

    let status: TaskStatus = "todo";
    if (statusRaw && isTaskStatus(statusRaw)) {
      status = statusRaw;
    }

    const supabase = createClient();
    const currentTask = editingTaskRef.current;

    if (currentTask) {
      // Edit — apply general changes then status change, merge into one update.
      const withChanges = updateTask(currentTask, { title, description, dueDate });
      const final = updateTaskStatus(withChanges, status);

      const { error } = await supabase
        .from("tasks")
        .update({
          title: final.title,
          description: final.description,
          status: final.status,
          due_date: final.dueDate
            ? final.dueDate.toISOString().split("T")[0] // TODO: Confirm and handle timezones properly
            : null,
        })
        .eq("id", final.id);

      if (error) return { error: error.message };
    } else {
      // Create
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title,
        description,
        status,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
      });

      if (error) return { error: error.message };
    }

    await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    setIsModalOpen(false);
    return { error: null };
  };
}
