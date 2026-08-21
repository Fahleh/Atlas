"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestPasswordReset } from "./actions";
import type { RequestPasswordResetFormState } from "./actions";
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
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

/**
 * Isolated in its own component; see docs/frontend.md's useSearchParams
 * section.
 */
function RecoveryErrorBanner() {
  const searchParams = useSearchParams();
  const recoveryFailed = searchParams.get("error") === "recovery_failed";

  if (!recoveryFailed) return null;

  return (
    <div role="alert" className={styles.errorBanner}>
      That reset link is invalid or has expired. Request a new one below.
    </div>
  );
}

// ---- ResetPasswordPage --------------------------------------------------------

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<
    RequestPasswordResetFormState,
    FormData
  >(requestPasswordReset, { error: null, success: false });

  if (state.success) {
    return (
      <div className={styles.successState}>
        <h1 className={styles.successTitle}>Check your email</h1>
        <p className={styles.successMessage}>
          If an account exists for that email, we sent a link to reset your
          password.
        </p>
        <p className={styles.navRow}>
          <Link href="/login" className={styles.navLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <Suspense fallback={null}>
        <RecoveryErrorBanner />
      </Suspense>

      {state.error && (
        <div role="alert" className={styles.errorBanner}>
          {state.error}
        </div>
      )}

      <form action={formAction} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
          />
        </div>

        <SubmitButton />
      </form>

      <div className={styles.footerLinks}>
        <p className={styles.navRow}>
          Remembered your password?{" "}
          <Link href="/login" className={styles.navLink}>
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
