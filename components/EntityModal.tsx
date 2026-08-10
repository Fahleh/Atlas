"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { ActionErrorMessage } from "./ActionErrorMessage";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import styles from "./EntityModal.module.css";

// ---- Types ------------------------------------------------------------------

type EntityModalFormState = {
  error: string | null;
  errorKind?: SupabaseWriteErrorKind | null;
};

export type EntityModalProps<TFormState extends EntityModalFormState> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Mirrors React's useActionState signature: prevState is Awaited<TFormState>
  // and the return is TFormState | Promise<TFormState>.
  action: (
    prevState: Awaited<TFormState>,
    formData: FormData,
  ) => TFormState | Promise<TFormState>;
  initialState: Awaited<TFormState>;
  disableScrollLock?: boolean;
  children: React.ReactNode;
};

type EntityModalContextValue = {
  onOpenChange: (open: boolean) => void;
  titleId: string;
  // Stable action reference used by SubmitButton/DeleteButton for action-identity comparison against useFormStatus().action.
  formAction: (formData: FormData) => void;
};

export type EntityModalFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

type HeaderProps = { children: React.ReactNode };
type TitleProps = { children: React.ReactNode };
type BodyProps = { children: React.ReactNode };
type FooterProps = { children: React.ReactNode };
type FooterActionsProps = { children: React.ReactNode };
type CancelButtonProps = { children: React.ReactNode };
type SubmitButtonProps = {
  children: React.ReactNode;
  variant?: "default" | "danger";
  pendingLabel?: string;
  /** Disables the button for a reason other than pending, e.g. an unchanged edit form. */
  disabled?: boolean;
};

// ---- Context ----------------------------------------------------------------

const EntityModalContext = createContext<EntityModalContextValue | null>(null);

export function useEntityModalContext(): EntityModalContextValue {
  const ctx = useContext(EntityModalContext);
  if (!ctx)
    throw new Error(
      "EntityModal sub-components must be used within <EntityModal>",
    );
  return ctx;
}

// ---- Sub-components ---------------------------------------------------------

function Header({ children }: HeaderProps) {
  return <div className={styles.header}>{children}</div>;
}

function Title({ children }: TitleProps) {
  const { titleId } = useEntityModalContext();
  return (
    <h2 id={titleId} className={styles.title}>
      {children}
    </h2>
  );
}

function CloseButton() {
  const { onOpenChange } = useEntityModalContext();
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

function Body({ children }: BodyProps) {
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
function Field({ label, htmlFor, children }: EntityModalFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Footer({ children }: FooterProps) {
  return <div className={styles.footer}>{children}</div>;
}

/**
 * Groups Cancel + Submit on the right side of Footer.
 * Use when a destructive action (e.g. DeleteButton) occupies the left slot —
 * the Footer's `justify-content: space-between` separates the two groups.
 */
function FooterActions({ children }: FooterActionsProps) {
  return <div className={styles.footerActions}>{children}</div>;
}

function CancelButton({ children }: CancelButtonProps) {
  const { onOpenChange } = useEntityModalContext();
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
 *
 * Uses action-identity comparison to detect non-primary (e.g. delete)
 * submissions and suppress `pendingLabel` accordingly — see docs/decisions.md.
 *
 * @param variant - "danger" renders the button using `--color-danger`
 * @param pendingLabel - Text shown while the form's primary action is in progress
 * @param disabled - Disables the button for a reason other than pending
 */
function SubmitButton({
  children,
  variant = "default",
  pendingLabel = "Saving…",
  disabled = false,
}: SubmitButtonProps) {
  const { formAction } = useEntityModalContext();
  const status = useFormStatus();
  // True when a button-level formAction (not this form's primary action) is running.
  const isNonPrimaryActionPending =
    status.pending && status.action !== formAction;

  return (
    <button
      type="submit"
      disabled={status.pending || disabled}
      className={
        variant === "danger" ? styles.submitButtonDanger : styles.submitButton
      }
    >
      {status.pending && !isNonPrimaryActionPending ? pendingLabel : children}
    </button>
  );
}

// ---- Root component ---------------------------------------------------------

/**
 * Generic compound modal for create/edit flows.
 * Owns `useActionState`, focus trap, body scroll lock, and overlay a11y.
 * Always rendered in the DOM — visibility is CSS-controlled via `open`.
 * Uses `useId()` per-instance so two EntityModal instances (e.g. a task modal
 * and a project modal) can exist as DOM siblings without duplicate aria IDs.
 *
 * @template TFormState - Form state shape; must include `error: string | null`
 * @param open - Whether the modal is visible
 * @param onOpenChange - Callback to update open state
 * @param action - React 19 action: `(prevState, formData) => Promise<TFormState>`
 * @param initialState - Zero value of TFormState passed to useActionState
 * @param disableScrollLock - Pass when the parent already locks body scroll
 * @param children - Composed sub-components: Header, Body, Footer
 */
function EntityModalRoot<TFormState extends EntityModalFormState>({
  open,
  onOpenChange,
  action,
  initialState,
  disableScrollLock = false,
  children,
}: EntityModalProps<TFormState>) {
  const [state, formAction] = useActionState(action, initialState);
  const titleId = useId();
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
    <EntityModalContext.Provider value={{ onOpenChange, titleId, formAction }}>
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
          aria-labelledby={titleId}
          className={`${styles.dialog} ${open ? styles.dialogOpen : ""}`}
        >
          <form action={formAction} className={styles.form}>
            {state.error && (
              <ActionErrorMessage
                error={state.error}
                errorKind={state.errorKind}
                className={styles.errorBanner}
              />
            )}
            {children}
          </form>
        </div>
      </div>
    </EntityModalContext.Provider>
  );
}

// ---- Compound export --------------------------------------------------------

export const EntityModal = Object.assign(EntityModalRoot, {
  Header,
  Title,
  CloseButton,
  Body,
  Field,
  Footer,
  FooterActions,
  CancelButton,
  SubmitButton,
});
