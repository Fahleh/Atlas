"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import type { TaskStatus } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";
import styles from "./TaskModal.module.css";

// ---- Types ----------------------------------------------------------------

export type TaskFormState = { error: string | null };

type TaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (
    prevState: TaskFormState,
    formData: FormData,
  ) => Promise<TaskFormState>;
  /** Pass when rendered inside a component that already locks body scroll. */
  disableScrollLock?: boolean;
  children: React.ReactNode;
};

type TaskModalContextValue = {
  onOpenChange: (open: boolean) => void;
};

type TaskModalHeaderProps = { children: React.ReactNode };
type TaskModalTitleProps = { children: React.ReactNode };
type TaskModalBodyProps = { children: React.ReactNode };
type TaskModalFooterProps = { children: React.ReactNode };
type TaskModalCancelButtonProps = { children: React.ReactNode };
type TaskModalSubmitButtonProps = { children: React.ReactNode };

export type TaskModalFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

export type StatusFieldProps = {
  /** The status value to pre-select. Re-mount the component to reset it. */
  defaultValue: TaskStatus;
  /** Name attribute for the hidden `<input>` that carries the value into FormData. */
  name: string;
};

// ---- Constants -------------------------------------------------------------

// Stable ID for aria-labelledby — one modal open at a time, so a static ID is safe.
const MODAL_TITLE_ID = "task-modal-title";

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

// ---- Context ---------------------------------------------------------------

const TaskModalContext = createContext<TaskModalContextValue | null>(null);

function useTaskModalContext(): TaskModalContextValue {
  const ctx = useContext(TaskModalContext);
  if (!ctx)
    throw new Error("TaskModal sub-components must be used within <TaskModal>");
  return ctx;
}

// ---- Sub-components --------------------------------------------------------

function Header({ children }: TaskModalHeaderProps) {
  return <div className={styles.header}>{children}</div>;
}

function Title({ children }: TaskModalTitleProps) {
  return (
    <h2 id={MODAL_TITLE_ID} className={styles.title}>
      {children}
    </h2>
  );
}

function CloseButton() {
  const { onOpenChange } = useTaskModalContext();
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      aria-label="Close"
      className={styles.closeButton}
    >
      <X size={20} />
    </button>
  );
}

function Body({ children }: TaskModalBodyProps) {
  return <div className={styles.body}>{children}</div>;
}

/**
 * Generic label + input wrapper for a single form field.
 * Styles native `<input>` and `<textarea>` children automatically via
 * descendant selectors in the CSS module — callers do not need to add classes.
 *
 * @param label - Visible label text
 * @param htmlFor - ID of the associated input element
 * @param children - A native `<input>` or `<textarea>` element
 */
function Field({ label, htmlFor, children }: TaskModalFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Custom status dropdown that participates in FormData submission via a
 * hidden input. Uses local state for selected value and open/close — the
 * documented exception to "uncontrolled by default" for custom listboxes.
 *
 * @param defaultValue - Pre-selected status; re-mount the component to reset
 * @param name - The `name` attribute for the hidden input
 */
function StatusField({ defaultValue, name }: StatusFieldProps) {
  const [status, setStatus] = useState<TaskStatus>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[status];

  // Close on Escape — capture phase so this runs before the modal's bubble-phase
  // handler, preventing Escape from closing the modal while the dropdown is open.
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isOpen]);

  // Close on click outside the wrapper
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  // Set focus to the listbox when it opens so that Arrow key navigation works immediately
  useEffect(() => {
    if (isOpen) {
      listboxRef.current?.focus();
    }
  }, [isOpen]);

  function handleTriggerClick() {
    setIsOpen((wasOpen) => {
      // Set the focusedIndex to the selected status when opening the dropdown
      // so that focus starts on the current status
      if (!wasOpen) {
        const index = STATUS_ORDER.indexOf(status);
        setFocusedIndex(index >= 0 ? index : 0);
      }
      return !wasOpen;
    });
  }

  function handleOptionClick(value: TaskStatus) {
    setStatus(value);
    setIsOpen(false);
  }

  function getOptionId(s: TaskStatus): string {
    return `status-option-${s}`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % STATUS_ORDER.length);
        break;

      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(
          (i) => (i - 1 + STATUS_ORDER.length) % STATUS_ORDER.length,
        );
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        handleOptionClick(STATUS_ORDER[focusedIndex]);
        break;

      default:
        break;
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel} id="status-field-label">
        Status
      </span>

      {/* Hidden input carries the selected value into FormData */}
      <input type="hidden" name={name} value={status} />

      <div ref={wrapperRef} className={styles.statusWrapper}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby="status-field-label"
          onClick={handleTriggerClick}
          className={styles.statusTrigger}
        >
          <span
            aria-hidden="true"
            style={{ "--status-dot": config.dotColor } as React.CSSProperties}
            className={styles.statusDot}
          />
          <span className={styles.statusTriggerLabel}>{config.label}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`${styles.statusChevron} ${isOpen ? styles.statusChevronOpen : ""}`}
          />
        </button>

        <div
          ref={listboxRef}
          role="listbox"
          aria-label="Task status"
          tabIndex={0}
          aria-activedescendant={
            isOpen ? getOptionId(STATUS_ORDER[focusedIndex]) : undefined
          }
          onKeyDown={(e) => handleKeyDown(e)}
          className={`${styles.statusOptions} ${isOpen ? styles.statusOptionsOpen : ""}`}
        >
          {STATUS_ORDER.map((s) => {
            const opt = STATUS_CONFIG[s];
            return (
              <div
                key={s}
                id={getOptionId(s)}
                role="option"
                aria-selected={s === status}
                onClick={() => handleOptionClick(s)}
                className={`${styles.statusOption} ${s === status ? styles.statusOptionSelected : ""} 
                  ${isOpen && STATUS_ORDER[focusedIndex] === s ? styles.statusOptionFocused : ""}`}
              >
                <span
                  aria-hidden="true"
                  style={
                    { "--status-dot": opt.dotColor } as React.CSSProperties
                  }
                  className={styles.statusDot}
                />
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Footer({ children }: TaskModalFooterProps) {
  return <div className={styles.footer}>{children}</div>;
}

function CancelButton({ children }: TaskModalCancelButtonProps) {
  const { onOpenChange } = useTaskModalContext();
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={styles.cancelButton}
    >
      {children}
    </button>
  );
}

/**
 * Submit button that derives its pending state from `useFormStatus`.
 * Must be rendered as a descendant of the `<form>` element — never in the
 * same component that renders the form.
 */
function SubmitButton({ children }: TaskModalSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submitButton}>
      {pending ? "Saving…" : children}
    </button>
  );
}

// ---- Root component --------------------------------------------------------

/**
 * Compound modal for creating and editing tasks.
 * Owns `useActionState`, focus trap, body scroll lock, and overlay a11y.
 * Always rendered in the DOM — visibility is CSS-controlled via `open`.
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
  const [state, formAction] = useActionState(action, { error: null });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus to the first focusable element when the modal opens
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const first = dialog.querySelector<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [open]);

  // Focus trap: cycle Tab/Shift+Tab within the dialog while open
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
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

    dialog.addEventListener("keydown", handleTabKey);
    return () => {
      dialog.removeEventListener("keydown", handleTabKey);
    };
  }, [open]);

  // Escape key closes the modal
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  // Body scroll lock while the modal is open — skipped when the parent
  // already holds the lock (e.g. ProjectSlideOver).
  useEffect(() => {
    if (disableScrollLock) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, disableScrollLock]);

  function handleBackdropKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  return (
    <TaskModalContext.Provider value={{ onOpenChange }}>
      {/* Backdrop — always in DOM, visibility via CSS */}
      <div
        role="button"
        aria-label="Close modal"
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
        onKeyDown={handleBackdropKeyDown}
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
      />

      {/* Centering positioner — layout only, never interactive */}
      <div className={styles.positioner}>
        <div
          ref={dialogRef}
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-labelledby={MODAL_TITLE_ID}
          className={`${styles.dialog} ${open ? styles.dialogOpen : ""}`}
        >
          <form action={formAction} className={styles.form}>
            {state.error && (
              <div role="alert" className={styles.errorBanner}>
                {state.error}
              </div>
            )}
            {children}
          </form>
        </div>
      </div>
    </TaskModalContext.Provider>
  );
}

// ---- Compound export -------------------------------------------------------

export const TaskModal = Object.assign(TaskModalRoot, {
  Header,
  Title,
  CloseButton,
  Body,
  Field,
  StatusField,
  Footer,
  CancelButton,
  SubmitButton,
});
