import Link from "next/link";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import styles from "./ActionErrorMessage.module.css";

export type ActionErrorMessageProps = {
  error: string;
  errorKind?: SupabaseWriteErrorKind | null;
  className?: string;
  /** Renders a "Try again" button, e.g. a query's `refetch`. Omit when no retry is available. */
  onRetry?: () => void;
};

/**
 * Renders a failed-write or failed-read error message, adding a login link
 * when `errorKind` is `"sessionExpired"` and a retry button when `onRetry`
 * is given. See `lib/supabase/errors.ts` for how sessionExpired vs.
 * forbidden vs. an ordinary error is determined.
 *
 * @param error - User-facing error message
 * @param errorKind - Discriminant from `interpretSupabaseWriteError`/`interpretSupabaseReadError`, or null for an ordinary error
 * @param className - Additional class applied alongside the component's own styling
 * @param onRetry - Optional retry callback, e.g. a query's `refetch`
 */
export function ActionErrorMessage({
  error,
  errorKind = null,
  className,
  onRetry,
}: ActionErrorMessageProps) {
  return (
    <div role="alert" className={className}>
      {error}
      {errorKind === "sessionExpired" && (
        <>
          {" "}
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.retryButton}>
          Try again
        </button>
      )}
    </div>
  );
}
