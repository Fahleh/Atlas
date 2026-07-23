"use client";

import { createClient } from "@/lib/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { Project, ProjectStatus } from "@/types/atlas.types";
import { PROJECT_STATUS_CONFIG } from "./projectUtils";
import { updateProject, updateProjectStatus } from "@/lib";

// ---- Types ------------------------------------------------------------------

export type ProjectFormState = { error: string | null };

export type CreateProjectActionDeps = {
  editingProjectRef: React.RefObject<Project | null>;
  queryClient: QueryClient;
  setIsModalOpen: (open: boolean) => void;
};

// ---- Delete -----------------------------------------------------------------

/**
 * Deletes a project and all of its tasks (via ON DELETE CASCADE on tasks.project_id).
 * Invalidates the projects query so the list view refreshes automatically.
 * Also invalidates the tasks query for this project so the cache does not hold
 * stale data if the same project ID is ever reused.
 *
 * @param projectId - ID of the project to delete
 * @param queryClient - TanStack QueryClient for cache invalidation
 * @returns `{ error: string | null }` — null on success, message string on failure
 */
export async function deleteProject(
  projectId: string,
  queryClient: QueryClient,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) return { error: error.message };

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["projects"] }),
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  ]);
  return { error: null };
}

// ---- Save helpers -----------------------------------------------------------

const VALID_PROJECT_STATUSES = Object.keys(
  PROJECT_STATUS_CONFIG,
) as readonly ProjectStatus[];

function isProjectStatus(value: string): value is ProjectStatus {
  return (VALID_PROJECT_STATUSES as readonly string[]).includes(value);
}

// ---- Factory ----------------------------------------------------------------

/**
 * Returns a React 19 form action for creating and editing projects.
 * Follows the same factory pattern as `createTaskAction` — accepts stable
 * component references as deps rather than closing over component scope directly.
 *
 * Security: `owner_id` on create is derived from `supabase.auth.getClaims()`
 * (the browser client's JWT claims) — never from FormData or any client-supplied
 * value. RLS enforces the ownership invariant at the database layer
 * (`owner_id = auth.uid()`), so this read is a convenience, not the trust boundary.
 *
 * @param deps - Stable references: editingProjectRef, queryClient, setIsModalOpen
 * @returns A `(prevState, formData) => Promise<ProjectFormState>` action function
 */
export function createProjectAction(
  deps: CreateProjectActionDeps,
): (
  prevState: ProjectFormState,
  formData: FormData,
) => Promise<ProjectFormState> {
  const { editingProjectRef, queryClient, setIsModalOpen } = deps;

  return async function projectAction(
    _prevState: ProjectFormState,
    formData: FormData,
  ): Promise<ProjectFormState> {
    const nameRaw = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) ?? "";
    const statusRaw = formData.get("status") as string | null;
    const dueDateRaw = formData.get("dueDate") as string | null;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    const name = nameRaw?.trim();
    if (!name) return { error: "Project name is required." };

    let status: ProjectStatus = "active";
    if (statusRaw && isProjectStatus(statusRaw)) {
      status = statusRaw;
    }

    // TODO: persist due_date once the projects table migration adds the column.
    // The database.types.ts Row/Insert/Update for projects currently has no
    // due_date field, so we read and validate the value in the form but do not
    // pass it to Supabase yet.

    const supabase = createClient();
    const currentProject = editingProjectRef.current;

    if (currentProject) {
      // Edit
      const withChanges = updateProject(currentProject, {
        name,
        description,
        dueDate,
      });
      const final = updateProjectStatus(withChanges, status);

      const { error } = await supabase
        .from("projects")
        .update({
          name: final.name,
          description: final.description,
          status: final.status,
          due_date: final.dueDate
            ? final.dueDate.toISOString().split("T")[0]
            : null,
        })
        .eq("id", final.id);

      if (error) return { error: error.message };
    } else {
      // Create — owner_id from JWT claims, never from FormData
      const { data: claimsData } = await supabase.auth.getClaims();
      const ownerId = claimsData?.claims?.sub;

      if (!ownerId) return { error: "Not authenticated." };

      const { error } = await supabase.from("projects").insert({
        owner_id: ownerId,
        name,
        description,
        status,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
      });

      if (error) return { error: error.message };
    }

    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setIsModalOpen(false);
    return { error: null };
  };
}
