"use client";

import { createClient } from "@/lib/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { Project, ProjectStatus } from "@/types/atlas.types";
import { PROJECT_STATUS_CONFIG } from "./projectUtils";

// ---- Types ------------------------------------------------------------------

export type ProjectFormState = { error: string | null };

export type CreateProjectActionDeps = {
  editingProjectRef: React.RefObject<Project | null>;
  queryClient: QueryClient;
  setIsModalOpen: (open: boolean) => void;
};

// ---- Helpers ----------------------------------------------------------------

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
      const { error } = await supabase
        .from("projects")
        .update({ name, description, status })
        .eq("id", currentProject.id);

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
      });

      if (error) return { error: error.message };
    }

    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setIsModalOpen(false);
    return { error: null };
  };
}
