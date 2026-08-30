"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "./actions";
import type { LoginFormState } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "./login.module.css";
import sharedStyles from "../authShared.module.css";

/**
 * Submit button that derives its pending state from `useFormStatus`.
 * Must be a descendant of the `<form>` element, never in the same component
 * that renders the form.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={sharedStyles.submitButton}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

/**
 * Isolated in its own component; see docs/frontend.md's useSearchParams
 * section.
 */
function RedirectField() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const confirmationError = searchParams.get("error") === "confirmation_failed";

  return (
    <>
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      {confirmationError && (
        <div role="alert" className={sharedStyles.errorBanner}>
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
      <div className={sharedStyles.header}>
        <h1 className={sharedStyles.title}>Welcome back</h1>
        <p className={sharedStyles.subtitle}>Sign in to your account</p>
      </div>

      {state.error && (
        <div role="alert" className={sharedStyles.errorBanner}>
          {state.error}
        </div>
      )}

      <form action={formAction} className={sharedStyles.form}>
        <Suspense fallback={<div></div>}>
          <RedirectField />
        </Suspense>

        <div className={sharedStyles.field}>
          <label htmlFor="email" className={sharedStyles.fieldLabel}>
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

        <div className={sharedStyles.field}>
          <label htmlFor="password" className={sharedStyles.fieldLabel}>
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </div>

        <SubmitButton />
      </form>

      <div className={sharedStyles.footerLinks}>
        <Link href="/reset-password" className={styles.forgotLink}>
          Forgot password?
        </Link>
        <p className={sharedStyles.navRow}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={sharedStyles.navLink}>
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}
