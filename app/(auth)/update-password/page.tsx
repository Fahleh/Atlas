"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updatePassword } from "./actions";
import type { UpdatePasswordFormState } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "../authShared.module.css";

/**
 * Submit button that derives its pending state from `useFormStatus`.
 * Must be a descendant of the `<form>` element, never in the same component
 * that renders the form.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submitButton}>
      {pending ? "Saving…" : "Save new password"}
    </button>
  );
}

// ---- UpdatePasswordPage --------------------------------------------------------

export default function UpdatePasswordPage() {
  const [state, formAction] = useActionState<UpdatePasswordFormState, FormData>(
    updatePassword,
    { error: null, sessionExpired: false, success: false },
  );

  if (state.success) {
    return (
      <div className={styles.successState}>
        <h1 className={styles.successTitle}>Password updated</h1>
        <p className={styles.successMessage}>
          Your password has been changed.
        </p>
        <p className={styles.navRow}>
          <Link href="/" className={styles.navLink}>
            Continue to Atlas
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>Choose a new password for your account</p>
      </div>

      {state.error && (
        <div role="alert" className={styles.errorBanner}>
          {state.error}{" "}
          {state.sessionExpired && (
            <Link
              href="/reset-password"
              className={`${styles.errorLink} ${styles.accentLink}`}
            >
              Request a new reset link
            </Link>
          )}
        </div>
      )}

      <form action={formAction} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.fieldLabel}>
            New password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.fieldLabel}>
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            autoComplete="new-password"
          />
        </div>

        <SubmitButton />
      </form>
    </>
  );
}
