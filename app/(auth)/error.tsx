"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ERROR_STATE_ICON_SIZE } from "@/lib/utils";
import styles from "./error.module.css";

type AuthErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Catches unexpected render errors within (auth)/layout.tsx's children.
 * The wordmark in (auth)/layout.tsx is a <span>, not a heading, so this is
 * safely the page's sole h1. Does not catch Atlas's normal error paths
 * (login/signup already report failures via useActionState); see
 * docs/decisions.md.
 */
export default function AuthError({ error, retry }: AuthErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Scoped exception to the no-console.log rule; console.error only. See
  // docs/decisions.md.
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [error]);

  return (
    <>
      <div className={styles.header}>
        <AlertCircle
          size={ERROR_STATE_ICON_SIZE}
          className={styles.icon}
          aria-hidden="true"
        />
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          Something went wrong
        </h1>
        <p className={styles.subtitle}>
          An unexpected error occurred. You can try again.
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={retry} className={styles.retryButton}>
          Try again
        </button>
        <Link href="/login" className={styles.loginLink}>
          Back to login
        </Link>
      </div>
    </>
  );
}
