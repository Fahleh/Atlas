"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { ERROR_STATE_ICON_SIZE } from "@/lib/utils";
import layoutStyles from "@/styles/layout.module.css";
import styles from "./error.module.css";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/**
 * Catches unexpected render errors within (dashboard)/layout.tsx's children
 * only — Sidebar/Header stay mounted (error.js doesn't wrap the layout.js in
 * its own segment), so no separate "back to dashboard" link is needed here.
 * Does not catch Atlas's normal error paths; see docs/decisions.md.
 */
export default function DashboardError({ error, retry }: DashboardErrorProps) {
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
    <div className={layoutStyles.pageContainer}>
      <div className={styles.stateContainer}>
        <AlertCircle
          size={ERROR_STATE_ICON_SIZE}
          className={styles.icon}
          aria-hidden="true"
        />
        {/* h2, not h1 — Header.tsx already renders the page's h1. */}
        <h2 ref={headingRef} tabIndex={-1} className={styles.title}>
          Something went wrong
        </h2>
        <p className={styles.description}>
          An unexpected error occurred loading this page. You can try again.
        </p>
        <button type="button" onClick={retry} className={styles.retryButton}>
          Try again
        </button>
      </div>
    </div>
  );
}
