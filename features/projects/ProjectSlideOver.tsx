"use client";

import { ActionErrorMessage } from "@/components/ActionErrorMessage";
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
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import type { Member, Project, ProjectStatus, Task } from "@/types/atlas.types";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./ProjectSlideOver.module.css";
import {
  addMember,
  deleteProject,
  removeMember,
  type ProjectFormState,
} from "./projectActions";
import sharedStyles from "./projectShared.module.css";
import { DATE_FORMAT, STATUS_LABELS } from "./projectUtils";

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

type AddMemberFormState = {
  error: string | null;
  errorKind: SupabaseWriteErrorKind | null;
  email: string;
};
type AddMemberFormProps = {
  project: Project;
};

/**
 * Add-member form, extracted so it can be keyed by project.id.
 * ProjectSlideOver itself never unmounts, so without this, useActionState's error/email state
 * would persist across project switches. See docs/decisions.md.
 */
function AddMemberForm({ project }: AddMemberFormProps) {
  const queryClient = useQueryClient();

  const addMemberAction = useMemo(
    () =>
      async (
        _prevState: AddMemberFormState,
        formData: FormData,
      ): Promise<AddMemberFormState> => {
        const emailRaw = formData.get("email") as string | null;
        const email = emailRaw?.trim();

        if (!email)
          return {
            error: "Email is required.",
            errorKind: null,
            email: email ?? "",
          };
        if (!isValidEmail(email)) {
          return {
            error: "Please enter a valid email address.",
            errorKind: null,
            email,
          };
        }

        const result = await addMember(project.id, email, queryClient);
        if (result.error)
          return { error: result.error, errorKind: result.errorKind, email };

        return { error: null, errorKind: null, email: "" };
      },
    [project, queryClient],
  );

  const [addMemberState, addMemberFormAction] = useActionState(
    addMemberAction,
    {
      error: null,
      errorKind: null,
      email: "",
    },
  );

  return (
    <>
      <form action={addMemberFormAction} className={styles.addMemberForm}>
        <label htmlFor="add-member-email" className={styles.srOnly}>
          Add member by email
        </label>
        <input
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
        <ActionErrorMessage
          error={addMemberState.error}
          errorKind={addMemberState.errorKind}
          className={styles.addMemberError}
        />
      )}
    </>
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
  // Gates Edit/Delete/add-member/remove-member controls below — owner-only
  // by design; RLS is the actual enforcement boundary, this is UI-only.

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
  // Lives here, not in TaskModal, since this component renders the fields.
  // Sticky once true, not re-derived per keystroke, see docs/decisions.md.
  const [isTaskDirty, setIsTaskDirty] = useState(false);
  const queryClient = useQueryClient();

  function markTaskDirtyIfChanged(current: string, original: string) {
    if (editingTask && current !== original) setIsTaskDirty(true);
  }

  // False positive in eslint-plugin-react-hooks@7.1.1, ref is only read at
  // submit time, not during render. See facebook/react#34954 and #35813.
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
        if (!project) return { error: null, errorKind: null };

        const result = await deleteProject(project.id, queryClient);
        if (result.error)
          return { error: result.error, errorKind: result.errorKind };

        setIsDeleteModalOpen(false);
        onClose();
        return { error: null, errorKind: null };
      },
    [project, queryClient, onClose],
  );

  // ---- Remove-member confirm state -------------------------------------------

  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(
    null,
  );
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberState, setRemoveMemberState] = useState<{
    error: string | null;
    errorKind: SupabaseWriteErrorKind | null;
  }>({ error: null, errorKind: null });

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Explicitly focuses Cancel when the trash icon swaps to Cancel/Confirm,
  // otherwise focus falls back to unreliable browser-default behavior.
  useEffect(() => {
    if (!confirmingMemberId) return;
    cancelButtonRef.current?.focus();
  }, [confirmingMemberId]);

  // Resets remove-member confirm state on project switch/close. Adjusted
  // during render, not in an effect — see CLAUDE.md's React Components section.
  const currentProjectId = project?.id ?? null;
  const [resetProjectId, setResetProjectId] = useState(currentProjectId);
  if (currentProjectId !== resetProjectId) {
    setResetProjectId(currentProjectId);
    setConfirmingMemberId(null);
    setRemovingMemberId(null);
    setRemoveMemberState({ error: null, errorKind: null });
  }

  async function handleRemoveMember(memberId: string) {
    if (!project) return;
    setRemovingMemberId(memberId);
    setRemoveMemberState({ error: null, errorKind: null });

    const result = await removeMember(project.id, memberId, queryClient);
    setRemovingMemberId(null);

    if (result.error) {
      setRemoveMemberState(result);
      return;
    }
    setConfirmingMemberId(null);
  }

  function openForCreate() {
    editingTaskRef.current = null;
    setEditingTask(null);
    setModalResetKey((k) => k + 1);
    setIsTaskDirty(false);
    setIsModalOpen(true);
  }

  function openForEdit(task: Task) {
    editingTaskRef.current = task;
    setEditingTask(task);
    setModalResetKey((k) => k + 1);
    setIsTaskDirty(false);
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

              {isOwner && <AddMemberForm key={project.id} project={project} />}

              {members.length === 0 ? (
                <p className={styles.emptyText}>No members yet.</p>
              ) : (
                <ul className={styles.memberList}>
                  {members.map((member) => (
                    <li key={member.id} className={styles.memberRow}>
                      <Avatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        size="medium"
                      />
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberRole}>
                          {MEMBER_ROLE_LABELS[member.role]}
                        </span>
                      </div>

                      {isOwner && member.role !== "owner" && (
                        <div className={styles.removeMemberWrapper}>
                          {confirmingMemberId === member.id ? (
                            <div className={styles.removeConfirmGroup}>
                              <button
                                ref={cancelButtonRef}
                                type="button"
                                onClick={() => setConfirmingMemberId(null)}
                                disabled={removingMemberId === member.id}
                                aria-label="Cancel remove"
                                className={styles.removeMemberButton}
                              >
                                <X size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                disabled={removingMemberId === member.id}
                                onClick={() => handleRemoveMember(member.id)}
                                aria-label={`Confirm remove ${member.name}`}
                                className={styles.removeMemberButtonDanger}
                              >
                                {removingMemberId === member.id ? (
                                  <Loader2
                                    size={14}
                                    className={styles.spinning}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Check size={14} aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveMemberState({
                                  error: null,
                                  errorKind: null,
                                });
                                setConfirmingMemberId(member.id);
                              }}
                              aria-label={`Remove ${member.name}`}
                              className={styles.removeMemberButton}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                          {removeMemberState.error &&
                            confirmingMemberId === member.id && (
                              <ActionErrorMessage
                                error={removeMemberState.error}
                                errorKind={removeMemberState.errorKind}
                                className={styles.removeMemberError}
                              />
                            )}
                        </div>
                      )}
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
        initialState={{ error: null, errorKind: null }}
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
                onChange={(e) =>
                  markTaskDirtyIfChanged(
                    e.target.value,
                    editingTask?.title ?? "",
                  )
                }
                placeholder="Task title"
                required
              />
            </TaskModal.Field>
            <TaskModal.Field label="Description" htmlFor="task-description">
              <textarea
                id="task-description"
                name="description"
                defaultValue={editingTask?.description ?? ""}
                onChange={(e) =>
                  markTaskDirtyIfChanged(
                    e.target.value,
                    editingTask?.description ?? "",
                  )
                }
                placeholder="Optional description"
              />
            </TaskModal.Field>
            <TaskModal.StatusField
              name="status"
              defaultValue={editingTask?.status ?? "todo"}
              onChange={(value) =>
                markTaskDirtyIfChanged(value, editingTask?.status ?? "todo")
              }
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
                onChange={(e) =>
                  markTaskDirtyIfChanged(
                    e.target.value,
                    editingTask?.dueDate
                      ? editingTask.dueDate.toISOString().split("T")[0]
                      : "",
                  )
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
              <TaskModal.SubmitButton
                disabled={!!editingTask && !isTaskDirty}
              >
                {editingTask ? "Save changes" : "Create task"}
              </TaskModal.SubmitButton>
            </TaskModal.FooterActions>
          </TaskModal.Footer>
        </TaskModal>
      )}
    </>
  );
}
