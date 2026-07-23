"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "./actions";
import type { LoginFormState } from "./actions";
import styles from "./login.module.css";

/**
 * Submit button that derives its pending state from `useFormStatus`.
 * Must be a descendant of the `<form>` element, never in the same component
 * that renders the form.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submitButton}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

/**
 * Isolated in its own component because `useSearchParams()` requires a
 * Suspense boundary. Without this extraction, LoginPage
 * would be forced to fully de-optimize from static to dynamic rendering.
 */
function RedirectField() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const confirmationError = searchParams.get("error") === "confirmation_failed";

  return (
    <>
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      {confirmationError && (
        <div role="alert" className={styles.errorBanner}>
          Email confirmation failed. Please try signing up again or request a
          new confirmation email.
        </div>
      )}
    </>
  );
}

// ---- LoginPage --------------------------------------------------------------

export default function LoginPage() {
  const [state, formAction] = useActionState<LoginFormState, FormData>(login, {
    error: null,
  });

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>
      </div>

      {state.error && (
        <div role="alert" className={styles.errorBanner}>
          {state.error}
        </div>
      )}

      <form action={formAction} className={styles.form}>
        <Suspense fallback={<div></div>}>
          <RedirectField />
        </Suspense>

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
            autoComplete="current-password"
          />
        </div>

        <SubmitButton />
      </form>

      <div className={styles.footerLinks}>
        {/* TODO: implement password reset */}
        <a href="#" className={styles.forgotLink}>
          Forgot password?
        </a>
        <p className={styles.signupRow}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={styles.signupLink}>
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
