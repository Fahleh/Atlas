import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { ActivityLogEntry } from "@/types/atlas.types";
import { buildActivityMessage, formatRelativeTime } from "./activityUtils";
import styles from "./ActivityFeed.module.css";

export type ActivityItemProps = {
  entry: ActivityLogEntry;
  now: number;
};

/**
 * One row in the Recent Activity feed: actor avatar, the built message,
 * an optional link to the entry's project, and a relative timestamp.
 *
 * @param entry - A single activity log entry, already joined with actor/project data
 * @param now - Fixed "now" timestamp from the dashboard, passed through to the relative-time formatter
 */
export function ActivityItem({ entry, now }: ActivityItemProps) {
  const message = buildActivityMessage(entry);

  return (
    <div className={styles.activityRow}>
      <Avatar name={entry.actorName} avatarUrl={entry.actorAvatarUrl} />
      <div className={styles.activityContent}>
        <p className={styles.activityMessage}>{message}</p>
        {entry.projectName && (
          <Link
            href={`/projects?project=${entry.projectId}`}
            className={styles.activityProjectLink}
          >
            {entry.projectName}
          </Link>
        )}
      </div>
      <span className={styles.activityTimestamp}>
        {formatRelativeTime(entry.createdAt, now)}
      </span>
    </div>
  );
}
