"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { ERROR_STATE_ICON_SIZE } from "@/lib/utils";
import styles from "./not-found.module.css";

/**
 * Global 404 page. No route-group-specific version exists: there are
 * currently no dynamic route segments and nothing calls notFound()
 * programmatically, so this single page covers every case that exists today.
 */
export default function NotFound() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Explicit focus on mount, not browser-default behavior — this is
  // effectively new page content landed on without a full navigation event.
  // See docs/decisions.md's remove-member Cancel-button precedent.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.container}>
      <FileQuestion
        size={ERROR_STATE_ICON_SIZE}
        className={styles.icon}
        aria-hidden="true"
      />
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        Page not found
      </h1>
      <p className={styles.description}>
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <Link href="/" className={styles.homeLink}>
        Back to Dashboard
      </Link>
    </div>
  );
}
