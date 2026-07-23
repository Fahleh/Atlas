"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { EntityModal, useEntityModalContext } from "@/components/EntityModal";
import { StatusBox } from "@/components/StatusBox";
import type { TaskStatus } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";
import styles from "./TaskModal.module.css";

// ---- Types ------------------------------------------------------------------

export type TaskFormState = { error: string | null };

type TaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (
    prevState: TaskFormState,
    formData: FormData,
  ) => Promise<TaskFormState>;
  disableScrollLock?: boolean;
  children: React.ReactNode;
};

export type TaskModalFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

export type StatusFieldProps = {
  defaultValue: TaskStatus;
  name: string;
};

type DeleteButtonProps = {
  action: (formData: FormData) => Promise<{ error: string | null }>;
};

// ---- Constants --------------------------------------------------------------

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

// ---- DeleteButton -----------------------------------------------------------

/**
 * Two-step task delete button for the modal footer.
 * First click reveals a danger confirm button; second click submits via
 * `formAction` — bypassing the form's primary save action — and captures
 * the returned error in local state so it surfaces below the button.
 *
 * Uses `useFormStatus().action` identity comparison (via EntityModalContext)
 * to distinguish delete-pending from save-pending, avoiding the FormData
 * pollution that the previous hidden-input approach suffered.
 *
 * @param action - Single-arg delete action from `createDeleteTaskAction`
 */
function DeleteButton({ action }: DeleteButtonProps) {
  const { formAction } = useEntityModalContext();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const status = useFormStatus();
  // True only when capturedAction (not the form's primary taskAction) is running.
  const isThisDeletePending = status.pending && status.action !== formAction;

  async function capturedAction(formData: FormData): Promise<void> {
    setDeleteError(null);
    const result = await action(formData);
    if (result.error) setDeleteError(result.error);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        disabled={status.pending}
        onClick={() => setConfirming(true)}
        className={styles.deleteButton}
      >
        Delete task
      </button>
    );
  }

  return (
    <>
      {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
      <button
        type="submit"
        formAction={capturedAction}
        disabled={status.pending}
        className={styles.deleteButtonDanger}
      >
        {isThisDeletePending ? "Deleting…" : "Confirm delete?"}
      </button>
    </>
  );
}

// ---- TaskStatusField --------------------------------------------------------

/**
 * Task-specific status listbox: wraps StatusBox with the task status config
 * and rendering order baked in. Callers only supply the field name and default.
 *
 * @param defaultValue - Pre-selected task status; re-mount to reset
 * @param name - The `name` attribute for the hidden input
 */
function TaskStatusField({ defaultValue, name }: StatusFieldProps) {
  return (
    <StatusBox<TaskStatus>
      defaultValue={defaultValue}
      name={name}
      config={STATUS_CONFIG}
      order={STATUS_ORDER}
      label="Status"
    />
  );
}

// ---- Root wrapper -----------------------------------------------------------

/**
 * Thin wrapper around EntityModal fixed to TaskFormState.
 * Keeps the compound API identical to its pre-refactor shape so no callers
 * (ProjectSlideOver.tsx) require changes.
 *
 * @param open - Whether the modal is visible
 * @param onOpenChange - Callback to update open state
 * @param action - React 19 action: `(prevState, formData) => Promise<TaskFormState>`
 * @param disableScrollLock - Pass when the parent already locks body scroll
 * @param children - Composed sub-components: Header, Body, Footer
 */
function TaskModalRoot({
  open,
  onOpenChange,
  action,
  disableScrollLock = false,
  children,
}: TaskModalProps) {
  return (
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      action={action}
      initialState={{ error: null }}
      disableScrollLock={disableScrollLock}
    >
      {children}
    </EntityModal>
  );
}

// ---- Compound export --------------------------------------------------------

export const TaskModal = Object.assign(TaskModalRoot, {
  Header: EntityModal.Header,
  Title: EntityModal.Title,
  CloseButton: EntityModal.CloseButton,
  Body: EntityModal.Body,
  Field: EntityModal.Field,
  Footer: EntityModal.Footer,
  FooterActions: EntityModal.FooterActions,
  CancelButton: EntityModal.CancelButton,
  SubmitButton: EntityModal.SubmitButton,
  StatusField: TaskStatusField,
  DeleteButton,
});
