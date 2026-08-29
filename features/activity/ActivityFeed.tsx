"use client";

import { Activity } from "lucide-react";
import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import { Skeleton } from "@/components/Skeleton";
import { useActivityLog } from "@/hooks/useActivityLog";
import { ActivityItem } from "./ActivityItem";
import styles from "./ActivityFeed.module.css";

const ACTIVITY_SKELETON_ROW_COUNT = 4;

export type ActivityFeedProps = {
  now: number;
};

/**
 * Dashboard section listing the most recent activity across every project
 * the current user belongs to. RLS scopes the underlying query, no
 * per-project filtering happens here.
 *
 * @param now - Fixed "now" timestamp from the dashboard, passed through to each row's relative-time formatter
 */
export function ActivityFeed({ now }: ActivityFeedProps) {
  const {
    data: activity = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useActivityLog();

  if (isLoading) {
    return (
      <div
        className={styles.activityCard}
        role="status"
        aria-live="polite"
        aria-label="Loading recent activity"
      >
        {Array.from({ length: ACTIVITY_SKELETON_ROW_COUNT }).map((_, i) => (
          <div key={i} className={styles.activitySkeletonRow}>
            <Skeleton width="34px" height="34px" borderRadius="50%" />
            <div className={styles.activitySkeletonBody}>
              <Skeleton width="70%" height="0.875rem" />
              <Skeleton width="40%" height="0.75rem" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ActionErrorMessage
        error={error?.message ?? "Couldn't load recent activity."}
        errorKind={error?.errorKind}
        onRetry={() => refetch()}
        className={styles.partialError}
      />
    );
  }

  if (activity.length === 0) {
    return (
      <div className={styles.stateContainer}>
        <Activity size={48} className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.stateMessage}>No recent activity.</p>
        <p className={styles.stateSubtitle}>
          Actions across your projects will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.activityCard}>
      {activity.map((entry) => (
        <ActivityItem key={entry.id} entry={entry} now={now} />
      ))}
    </div>
  );
}
