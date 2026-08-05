import { Skeleton } from "@/components/Skeleton";
import styles from "./VelocityStatus.module.css";

export type VelocityStatusProps = {
  dueSoonTaskCount: number;
  isLoading: boolean;
};

/**
 * Narrative card summarising how many not-done tasks are due within the
 * next 7 days, across all of the user's projects. Background and
 * status-dot color share one nonzero/zero condition, driven by
 * `data-variant`, so the two never fall out of sync.
 *
 * @param dueSoonTaskCount - Count of not-done tasks with a dueDate in the next 7 days
 * @param isLoading - Whether the due-soon task count is still loading
 */
export function VelocityStatus({
  dueSoonTaskCount,
  isLoading,
}: VelocityStatusProps) {
  const variant = dueSoonTaskCount > 0 ? "due" : "clear";

  const narrative =
    dueSoonTaskCount === 0 ? (
      <>
        <strong className={styles.emphasis}>Nothing due</strong> in the next 7
        days. <strong className={styles.emphasis}>No!</strong> That does not
        mean ignore responsibilities.
      </>
    ) : dueSoonTaskCount === 1 ? (
      <>
        <strong className={styles.emphasis}>1 task</strong> is due within the
        next 7 days.{" "}
        <strong className={styles.emphasis}>Time to lock in!</strong>
      </>
    ) : (
      <>
        <strong className={styles.emphasis}>{dueSoonTaskCount} tasks</strong>{" "}
        are due within the next 7 days.{" "}
        <strong className={styles.emphasis}>Time to lock in.</strong>
      </>
    );

  if (isLoading) {
    return (
      <div
        className={styles.card}
        role="status"
        aria-live="polite"
        aria-label="Loading velocity status"
      >
        <div className={styles.header}>
          <Skeleton width="8px" height="8px" borderRadius="50%" />
          <Skeleton width="40%" height="1.125rem" />
        </div>
        <Skeleton width="90%" height="0.875rem" />
      </div>
    );
  }

  return (
    <div className={styles.card} data-variant={variant}>
      <div className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        <h2 className={styles.title}>Velocity Status</h2>
      </div>
      <p className={styles.narrative}>{narrative}</p>
    </div>
  );
}
