"use client";

import { EntityModal } from "@/components/EntityModal";
import { StatusBox } from "@/components/StatusBox";
import type { TaskStatus } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";

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

// ---- Constants --------------------------------------------------------------

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

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
  CancelButton: EntityModal.CancelButton,
  SubmitButton: EntityModal.SubmitButton,
  StatusField: TaskStatusField,
});
