"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ERROR_STATE_ICON_SIZE } from "@/lib/utils";
import styles from "./error.module.css";

type RootErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Root-level catch-all error boundary. Catches genuine unexpected render
 * bugs, including a throw inside (dashboard)/layout.tsx or (auth)/layout.tsx
 * themselves (e.g. Sidebar/Header) — those aren't covered by the per-route-group
 * boundaries, since error.js never wraps the layout.js in its own segment.
 * Does not catch Atlas's normal error paths (structured action state, React
 * Query error states), which are handled declaratively, not by throwing.
 * See docs/decisions.md.
 */
export default function RootError({ error, retry }: RootErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Scoped exception to the no-console.log rule: this is the deliberate,
  // minimal-viable observability path in the absence of a real error-reporting
  // service. console.error only, never console.log. See docs/decisions.md.
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [error]);

  return (
    <div className={styles.container}>
      <AlertCircle
        size={ERROR_STATE_ICON_SIZE}
        className={styles.icon}
        aria-hidden="true"
      />
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        Something went wrong
      </h1>
      <p className={styles.description}>
        An unexpected error occurred. You can try again, or return to the
        dashboard.
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={retry} className={styles.retryButton}>
          Try again
        </button>
        <Link href="/" className={styles.homeLink}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
