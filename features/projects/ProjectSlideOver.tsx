"use client";

import { Avatar } from "@/components/Avatar";
import { EntityModal } from "@/components/EntityModal";
import { TaskList } from "@/features/tasks/TaskList";
import { TaskModal } from "@/features/tasks/TaskModal";
import {
  createDeleteTaskAction,
  createTaskAction,
} from "@/features/tasks/taskActions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isValidEmail } from "@/lib/utils";
import type { Member, Project, ProjectStatus, Task } from "@/types/atlas.types";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./ProjectSlideOver.module.css";
import {
  addMember,
  deleteProject,
  type ProjectFormState,
} from "./projectActions";
import sharedStyles from "./projectShared.module.css";
import { STATUS_LABELS } from "./projectUtils";

type AddMemberFormState = { error: string | null; email: string };

/**
 * Submit button for the add-member form. Must be a descendant of the form
 * element, since `useFormStatus` cannot be called in the component that
 * renders the `<form>` itself.
 */
function AddMemberSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.addMemberSubmit}>
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

type ProjectSlideOverProps = {
  project: Project | null;
  onClose: () => void;
  /** Called when the user clicks "Edit project" — hoists modal state to ProjectList. */
  onEditProject?: (project: Project) => void;
  members: Member[];
};

const MEMBER_ROLE_LABELS: Record<Member["role"], string> = {
  owner: "Owner",
  collaborator: "Collaborator",
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: styles.statusActive,
  completed: styles.statusCompleted,
  archived: styles.statusArchived,
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const DUE_DATE_LONG_FORMAT: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT,
  timeZone: "UTC",
};

/**
 * Slide-over panel that shows full project details.
 * Always rendered in the DOM — visibility is CSS-controlled via isOpen state.
 * Includes focus trap, body scroll lock, and Escape key handling.
 *
 * @param project - The selected project, or null when no project is selected
 * @param onClose - Callback to clear the selected project
 * @param onEditProject - Optional callback to open the project edit modal
 * @param members - Members of the selected project
 */
export function ProjectSlideOver({
  project,
  onClose,
  onEditProject,
  members,
}: ProjectSlideOverProps) {
  const isOpen = project !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === project?.ownerId;

  // ---- Delete confirmation modal state ------------------------------------

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // Incremented on every open so the EntityModal remounts and clears any
  // previous error state — mirrors the modalResetKey pattern on TaskModal.
  const [deleteModalResetKey, setDeleteModalResetKey] = useState(0);

  // ---- Task modal state ----------------------------------------------------

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Ref gives taskAction access to the current task without stale-closure risk.
  const editingTaskRef = useRef<Task | null>(null);
  // Incremented on every open so the modal remounts and resets form values.
  const [modalResetKey, setModalResetKey] = useState(0);
  const queryClient = useQueryClient();

  // False positive in eslint-plugin-react-hooks@7.1.1: the rule flags any ref
  // passed to a function during render, but editingTaskRef.current is only read
  // inside the returned async callback at form-submit time, never during the
  // useMemo factory's synchronous execution. Open upstream bugs:
  // https://github.com/facebook/react/issues/34954
  // https://github.com/facebook/react/issues/35813
  const taskAction = useMemo(
    // eslint-disable-next-line react-hooks/refs
    () => createTaskAction({ editingTaskRef, queryClient, setIsModalOpen }),
    [queryClient],
  );

  const deleteTaskAction = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      createDeleteTaskAction({ editingTaskRef, queryClient, setIsModalOpen }),
    [queryClient],
  );

  const deleteProjectAction = useMemo(
    () =>
      async (
        _prevState: ProjectFormState,
        _formData: FormData,
      ): Promise<ProjectFormState> => {
        if (!project) return { error: null };

        const result = await deleteProject(project.id, queryClient);
        if (result.error) return { error: result.error };

        setIsDeleteModalOpen(false);
        onClose();
        return { error: null };
      },
    [project, queryClient, onClose],
  );

  // ---- Add-member form -------------------------------------------------------

  const addMemberAction = useMemo(
    () =>
      async (
        _prevState: AddMemberFormState,
        formData: FormData,
      ): Promise<AddMemberFormState> => {
        if (!project) return { error: null, email: "" };

        const emailRaw = formData.get("email") as string | null;
        const email = emailRaw?.trim();

        if (!email) return { error: "Email is required.", email: email ?? "" };
        if (!isValidEmail(email)) {
          return { error: "Please enter a valid email address.", email };
        }

        const result = await addMember(project.id, email, queryClient);
        if (result.error) return { error: result.error, email };

        return { error: null, email: "" };
      },
    [project, queryClient],
  );

  const [addMemberState, addMemberFormAction] = useActionState(
    addMemberAction,
    { error: null, email: "" },
  );

  function openForCreate() {
    editingTaskRef.current = null;
    setEditingTask(null);
    setModalResetKey((k) => k + 1);
    setIsModalOpen(true);
  }

  function openForEdit(task: Task) {
    editingTaskRef.current = task;
    setEditingTask(task);
    setModalResetKey((k) => k + 1);
    setIsModalOpen(true);
  }

  // ---- Slide-over effects --------------------------------------------------

  // Move focus to close button when panel opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Focus trap: cycle Tab/Shift+Tab within the panel while open
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    panel.addEventListener("keydown", handleTabKey);
    return () => {
      panel.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen]);

  // Escape key closes the panel — but not when the task modal or delete
  // confirmation modal is open (each handles its own Escape).
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isModalOpen && !isDeleteModalOpen)
        onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isModalOpen, isDeleteModalOpen, onClose]);

  // Body scroll lock while panel is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleBackdropKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop — always in DOM, visibility via CSS */}
      <div
        role="button"
        aria-label="Close project details"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
        onKeyDown={handleBackdropKeyDown}
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={project ? `${project.name} details` : "Project details"}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelMeta}>
            <h2 className={styles.panelTitle}>{project?.name ?? ""}</h2>
            {project && (
              <div
                className={`${styles.statusBadge} ${STATUS_BADGE_CLASS[project.status]}`}
              >
                <span className={styles.statusDot} aria-hidden="true" />
                {STATUS_LABELS[project.status]}
              </div>
            )}
          </div>

          <div className={styles.headerActions}>
            {project && onEditProject && isOwner && (
              <button
                type="button"
                onClick={() => onEditProject(project)}
                aria-label="Edit project"
                className={styles.headerActionButton}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            )}
            {project && isOwner && (
              <button
                type="button"
                onClick={() => {
                  setDeleteModalResetKey((k) => k + 1);
                  setIsDeleteModalOpen(true);
                }}
                aria-label="Delete project"
                className={styles.headerActionButton}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close project details"
              className={styles.closeButton}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {project && (
          <div className={styles.panelContent}>
            {project.description && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Description</h3>
                <p className={styles.sectionText}>{project.description}</p>
              </section>
            )}

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Details</h3>
              <dl className={sharedStyles.detailList}>
                <div className={sharedStyles.detailRow}>
                  <dt className={sharedStyles.detailLabel}>Created</dt>
                  <dd className={sharedStyles.detailValue}>
                    {new Date(project.createdAt).toLocaleDateString(
                      "en-US",
                      DATE_FORMAT,
                    )}
                  </dd>
                </div>
                {project.dueDate && (
                  <div className={sharedStyles.detailRow}>
                    <dt className={sharedStyles.detailLabel}>Due date</dt>
                    <dd className={sharedStyles.detailValue}>
                      {project.dueDate.toLocaleDateString(
                        "en-US",
                        DUE_DATE_LONG_FORMAT,
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Tasks</h3>
                <button
                  type="button"
                  onClick={openForCreate}
                  className={styles.addTaskButton}
                >
                  <Plus size={14} aria-hidden="true" />
                  Add task
                </button>
              </div>
              <TaskList projectId={project.id} onTaskSelect={openForEdit} />
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Members</h3>

              {isOwner && (
                <>
                  <form
                    action={addMemberFormAction}
                    className={styles.addMemberForm}
                  >
                    <label htmlFor="add-member-email" className={styles.srOnly}>
                      Add member by email
                    </label>
                    <input
                      /** 
                       * No key/remount needed: defaultValue re-syncs to the DOM attribute on every render regardless
                       * of key, and React 19's auto-reset (observed, not documented as a guaranteed ordering) applies
                       * after that re-render — so the field always reflects addMemberState.email correctly. Verified manually
                       * across repeated failures. Revisit if a future React upgrade changes this.
                      */
                      id="add-member-email"
                      type="email"
                      name="email"
                      placeholder="Add member by email"
                      defaultValue={addMemberState.email}
                      required
                      className={styles.addMemberInput}
                    />
                    <AddMemberSubmitButton />
                  </form>
                  {addMemberState.error && (
                    <p role="alert" className={styles.addMemberError}>
                      {addMemberState.error}
                    </p>
                  )}
                </>
              )}

              {members.length === 0 ? (
                <p className={styles.emptyText}>No members yet.</p>
              ) : (
                <ul className={styles.memberList}>
                  {members.map((member) => (
                    <li key={member.id} className={styles.memberRow}>
                      <Avatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        size={36}
                      />
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberRole}>
                          {MEMBER_ROLE_LABELS[member.role]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Project delete confirmation modal — disableScrollLock because the
          slide-over already holds body scroll lock. */}
      <EntityModal
        key={`delete-${deleteModalResetKey}`}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        action={deleteProjectAction}
        initialState={{ error: null }}
        disableScrollLock
      >
        <EntityModal.Header>
          <EntityModal.Title>Delete project</EntityModal.Title>
          <EntityModal.CloseButton />
        </EntityModal.Header>
        <EntityModal.Body>
          <p>
            Are you sure you want to delete <strong>{project?.name}</strong>?
            All tasks will be permanently removed. This action cannot be undone.
          </p>
        </EntityModal.Body>
        <EntityModal.Footer>
          <EntityModal.FooterActions>
            <EntityModal.CancelButton>Cancel</EntityModal.CancelButton>
            <EntityModal.SubmitButton variant="danger" pendingLabel="Deleting…">
              Delete project
            </EntityModal.SubmitButton>
          </EntityModal.FooterActions>
        </EntityModal.Footer>
      </EntityModal>

      {/* Task modal — disableScrollLock because the slide-over already holds
          body scroll lock. Keyed by modalResetKey so the form resets on every open. */}
      {project && (
        <TaskModal
          key={`task-${modalResetKey}`}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          action={taskAction}
          disableScrollLock
        >
          <TaskModal.Header>
            <TaskModal.Title>
              {editingTask ? "Edit task" : "New task"}
            </TaskModal.Title>
            <TaskModal.CloseButton />
          </TaskModal.Header>
          <TaskModal.Body>
            <input type="hidden" name="projectId" value={project.id} />
            <TaskModal.Field label="Title" htmlFor="task-title">
              <input
                type="text"
                id="task-title"
                name="title"
                defaultValue={editingTask?.title ?? ""}
                placeholder="Task title"
                required
              />
            </TaskModal.Field>
            <TaskModal.Field label="Description" htmlFor="task-description">
              <textarea
                id="task-description"
                name="description"
                defaultValue={editingTask?.description ?? ""}
                placeholder="Optional description"
              />
            </TaskModal.Field>
            <TaskModal.StatusField
              name="status"
              defaultValue={editingTask?.status ?? "todo"}
            />
            <TaskModal.Field label="Due date" htmlFor="task-due-date">
              <input
                type="date"
                id="task-due-date"
                name="dueDate"
                defaultValue={
                  editingTask?.dueDate
                    ? editingTask.dueDate.toISOString().split("T")[0]
                    : undefined
                }
              />
            </TaskModal.Field>
          </TaskModal.Body>
          <TaskModal.Footer>
            {editingTask && (
              <TaskModal.DeleteButton action={deleteTaskAction} />
            )}
            <TaskModal.FooterActions>
              <TaskModal.CancelButton>Cancel</TaskModal.CancelButton>
              <TaskModal.SubmitButton>
                {editingTask ? "Save changes" : "Create task"}
              </TaskModal.SubmitButton>
            </TaskModal.FooterActions>
          </TaskModal.Footer>
        </TaskModal>
      )}
    </>
  );
}
