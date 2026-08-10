import Link from "next/link";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import styles from "./ActionErrorMessage.module.css";

export type ActionErrorMessageProps = {
  error: string;
  errorKind?: SupabaseWriteErrorKind | null;
  className?: string;
};

/**
 * Renders a failed-write error message, adding a login link when
 * `errorKind` is `"sessionExpired"`. See `lib/supabase/errors.ts` for how
 * sessionExpired vs. forbidden vs. an ordinary error is determined.
 *
 * @param error - User-facing error message
 * @param errorKind - Discriminant from `interpretSupabaseWriteError`, or null for an ordinary error
 * @param className - Additional class applied alongside the component's own styling
 */
export function ActionErrorMessage({
  error,
  errorKind = null,
  className,
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
    </div>
  );
}
