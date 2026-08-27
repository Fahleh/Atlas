"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signup } from "./actions";
import type { SignupFormState } from "./actions";
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
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

// ---- SignupPage -------------------------------------------------------------

export default function SignupPage() {
  const [state, formAction] = useActionState<SignupFormState, FormData>(
    signup,
    { error: null, accountExists: false, success: false },
  );

  if (state.success) {
    return (
      <div className={styles.successState}>
        <h1 className={styles.successTitle}>Check your email</h1>
        <p className={styles.successMessage}>
          We sent a confirmation link to your inbox. Click it to activate your
          account and sign in.
        </p>
        <p className={styles.navRow}>
          Already confirmed?{" "}
          <Link href="/login" className={styles.navLink}>
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Get started with Atlas today</p>
      </div>

      {state.error && (
        <div role="alert" className={styles.errorBanner}>
          {state.error}{" "}
          {state.accountExists && (
            <Link
              href="/login"
              className={`${styles.errorLink} ${styles.accentLink}`}
            >
              Sign in
            </Link>
          )}
        </div>
      )}

      <form action={formAction} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.fieldLabel}>
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            required
            autoComplete="name"
          />
        </div>

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

        <div className={styles.field}>
          <label htmlFor="password" className={styles.fieldLabel}>
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.fieldLabel}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
          />
        </div>

        <SubmitButton />
      </form>

      <div className={styles.footerLinks}>
        <p className={styles.navRow}>
          Already have an account?{" "}
          <Link href="/login" className={styles.navLink}>
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
