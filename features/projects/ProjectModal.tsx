"use client";

// ProjectModal is deliberately non-compound, unlike TaskModal. See
// docs/decisions.md ("EntityModal/TaskModal compound vs. ProjectModal single-block").

import { useState } from "react";
import { EntityModal } from "@/components/EntityModal";
import { StatusBox } from "@/components/StatusBox";
import type { Project, ProjectStatus } from "@/types/atlas.types";
import { PROJECT_STATUS_CONFIG, PROJECT_STATUS_ORDER } from "./projectUtils";
import type { ProjectFormState } from "./projectActions";

// ---- Types ------------------------------------------------------------------

export type ProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (
    prevState: ProjectFormState,
    formData: FormData,
  ) => Promise<ProjectFormState>;
  /** null = create mode; non-null = edit mode. Drives form defaults and title. */
  editingProject: Project | null;
  /** Pass when the parent (e.g. ProjectSlideOver) already holds the scroll lock. */
  disableScrollLock?: boolean;
};

// ---- Component --------------------------------------------------------------

/**
 * Modal for creating and editing projects. Built on EntityModal + StatusBox.
 * Rendered always in the DOM (keyed by the caller for per-open remounting).
 *
 * In edit mode, Save is disabled until a field differs from `editingProject`.
 * Create mode is never disabled by this check.
 *
 * @param open - Whether the modal is visible
 * @param onOpenChange - Callback to update open state
 * @param action - React 19 action from `createProjectAction`
 * @param editingProject - null for create; the project being edited otherwise
 * @param disableScrollLock - Skip scroll lock when a parent already holds it
 */
export function ProjectModal({
  open,
  onOpenChange,
  action,
  editingProject,
  disableScrollLock = false,
}: ProjectModalProps) {
  const isEditing = editingProject !== null;

  // Sticky once true — not fully re-derived on every keystroke, see
  // docs/decisions.md. Resets for free since the caller remounts this
  // component (via a changing `key`) on every open.
  const [isDirty, setIsDirty] = useState(false);

  const originalDueDate = editingProject?.dueDate
    ? editingProject.dueDate.toISOString().split("T")[0]
    : "";

  function markDirtyIfChanged(current: string, original: string) {
    if (isEditing && current !== original) setIsDirty(true);
  }

  return (
    <EntityModal<ProjectFormState>
      open={open}
      onOpenChange={onOpenChange}
      action={action}
      initialState={{ error: null, errorKind: null }}
      disableScrollLock={disableScrollLock}
    >
      <EntityModal.Header>
        <EntityModal.Title>
          {isEditing ? "Edit project" : "New project"}
        </EntityModal.Title>
        <EntityModal.CloseButton />
      </EntityModal.Header>

      <EntityModal.Body>
        <EntityModal.Field label="Name" htmlFor="project-name">
          <input
            id="project-name"
            type="text"
            name="name"
            defaultValue={editingProject?.name ?? ""}
            onChange={(e) =>
              markDirtyIfChanged(e.target.value, editingProject?.name ?? "")
            }
            placeholder="Project name"
            required
          />
        </EntityModal.Field>

        <EntityModal.Field label="Description" htmlFor="project-description">
          <textarea
            id="project-description"
            name="description"
            defaultValue={editingProject?.description ?? ""}
            onChange={(e) =>
              markDirtyIfChanged(
                e.target.value,
                editingProject?.description ?? "",
              )
            }
            placeholder="Optional description"
          />
        </EntityModal.Field>

        <StatusBox<ProjectStatus>
          name="status"
          defaultValue={editingProject?.status ?? "active"}
          config={PROJECT_STATUS_CONFIG}
          order={PROJECT_STATUS_ORDER}
          label="Status"
          onChange={(value) =>
            markDirtyIfChanged(value, editingProject?.status ?? "active")
          }
        />

        <EntityModal.Field label="Due date" htmlFor="project-due-date">
          <input
            id="project-due-date"
            type="date"
            name="dueDate"
            defaultValue={originalDueDate || undefined}
            onChange={(e) =>
              markDirtyIfChanged(e.target.value, originalDueDate)
            }
          />
        </EntityModal.Field>
      </EntityModal.Body>

      <EntityModal.Footer>
        <EntityModal.CancelButton>Cancel</EntityModal.CancelButton>
        <EntityModal.SubmitButton disabled={isEditing && !isDirty}>
          {isEditing ? "Save changes" : "Create project"}
        </EntityModal.SubmitButton>
      </EntityModal.Footer>
    </EntityModal>
  );
}
