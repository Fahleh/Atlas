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

// ---- Members ------------------------------------------------------------------

/**
 * Adds a project member by looking up their user ID from an email address
 * via the `lookup_user_id_by_email` RPC, then inserting a `project_members`
 * row with the `collaborator` role. Invalidates the members query on success.
 *
 * @param projectId - ID of the project to add the member to
 * @param email - Email address of the Atlas account to add
 * @param queryClient - TanStack QueryClient for cache invalidation
 * @returns `{ error: string | null }` — null on success, message string on failure
 */
export async function addMember(
  projectId: string,
  email: string,
  queryClient: QueryClient,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: userId, error: lookupError } = await supabase.rpc(
    "lookup_user_id_by_email",
    { _email: email },
  );

  if (lookupError) return { error: lookupError.message };
  if (!userId) return { error: "No Atlas account found with that email." };

  const { error: insertError } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, role: "collaborator" });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "This person is already a member of this project." };
    }
    return { error: insertError.message };
  }

  await queryClient.invalidateQueries({ queryKey: ["projectMembers"] });
  return { error: null };
}

/**
 * Removes a member from a project. RLS ("project_members: owner can delete")
 * already enforces owner-only at the database layer — no additional
 * server-side check needed here.
 *
 * @param projectId - ID of the project to remove the member from
 * @param userId - ID of the member to remove
 * @param queryClient - TanStack QueryClient for cache invalidation
 * @returns `{ error: string | null }` — null on success, message string on failure
 */
export async function removeMember(
  projectId: string,
  userId: string,
  queryClient: QueryClient,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  await queryClient.invalidateQueries({ queryKey: ["projectMembers"] });
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
