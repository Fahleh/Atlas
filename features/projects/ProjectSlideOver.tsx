"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Project, ProjectStatus, Task, TaskStatus } from "@/types/atlas.types";
import { createClient } from "@/lib/supabase/client";
import { updateTask, updateTaskStatus } from "@/lib/updateImmutable";
import styles from "./ProjectSlideOver.module.css";
import { STATUS_LABELS } from "./projectUtils";
import { TaskList } from "@/features/tasks/TaskList";
import { TaskModal, type TaskFormState } from "@/features/tasks/TaskModal";

type ProjectSlideOverProps = {
  project: Project | null;
  onClose: () => void;
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

/**
 * Slide-over panel that shows full project details.
 * Always rendered in the DOM — visibility is CSS-controlled via isOpen state.
 * Includes focus trap, body scroll lock, and Escape key handling.
 *
 * @param project - The selected project, or null when no project is selected
 * @param onClose - Callback to clear the selected project
 */
export function ProjectSlideOver({ project, onClose }: ProjectSlideOverProps) {
  const isOpen = project !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ---- Task modal state ----------------------------------------------------

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Ref gives taskAction access to the current task without stale-closure risk.
  const editingTaskRef = useRef<Task | null>(null);
  // Incremented on every open so the modal remounts and resets form values.
  const [modalResetKey, setModalResetKey] = useState(0);
  const queryClient = useQueryClient();

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

  /**
   * React 19 form action for creating and editing tasks.
   * `projectId` and the edit/create mode come from FormData so this function
   * closes over only stable references (queryClient, editingTaskRef, setIsModalOpen).
   *
   * Will 401 against live Supabase until auth is implemented in Week 6 —
   * expected; the error surfaces in the modal's error banner.
   */
  async function  taskAction(
    _prevState: TaskFormState,
    formData: FormData,
  ): Promise<TaskFormState> {
    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string) ?? "";
    const status = formData.get("status") as TaskStatus;
    const dueDateRaw = formData.get("dueDate") as string;
    const projectId = formData.get("projectId") as string;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    if (!title) return { error: "Title is required" };

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

  // Escape key closes the panel — but not when the task modal is open
  // (the modal handles its own Escape).
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isModalOpen) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isModalOpen, onClose]);

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
              <dl className={styles.detailList}>
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Created</dt>
                  <dd className={styles.detailValue}>
                    {new Date(project.createdAt).toLocaleDateString(
                      "en-US",
                      DATE_FORMAT,
                    )}
                  </dd>
                </div>
                {project.dueDate && (
                  <div className={styles.detailRow}>
                    <dt className={styles.detailLabel}>Due date</dt>
                    <dd className={styles.detailValue}>
                      {new Date(project.dueDate).toLocaleDateString(
                        "en-US",
                        DATE_FORMAT,
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
              {/* TODO: wire to members data */}
              <p className={styles.emptyText}>No members yet.</p>
            </section>
          </div>
        )}
      </div>

      {/* Task modal — disableScrollLock because the slide-over already holds
          body scroll lock. Keyed by modalResetKey so the form resets on every open. */}
      {project && (
        <TaskModal
          key={modalResetKey}
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
            <TaskModal.CancelButton>Cancel</TaskModal.CancelButton>
            <TaskModal.SubmitButton>
              {editingTask ? "Save changes" : "Create task"}
            </TaskModal.SubmitButton>
          </TaskModal.Footer>
        </TaskModal>
      )}
    </>
  );
}
