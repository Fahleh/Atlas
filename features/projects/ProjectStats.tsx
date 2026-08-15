"use client";

import type { Project } from "@/types/atlas.types";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";
import { Skeleton } from "@/components/Skeleton";
import styles from "./ProjectStats.module.css";

type ProjectStatsProps = {
  projects: Project[];
  taskCounts: Record<string, TaskCounts>;
  isLoading: boolean;
};

/**
 * Displays a four-cell stats bar summarising the given project list.
 * Computes all figures internally from raw projects/taskCounts so every
 * render site (projects page, future dashboard) gets consistent numbers
 * without duplicating aggregation logic.
 *
 * @param projects - Full unfiltered project list from useProjects()
 * @param taskCounts - Task counts per project ID from useTaskCountsByProject()
 * @param isLoading - Whether projects/task counts are still loading
 */
export function ProjectStats({
  projects,
  taskCounts,
  isLoading,
}: ProjectStatsProps) {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;

  const { doneTotal, taskTotal } = projects.reduce(
    (acc, p) => {
      const counts = taskCounts[p.id] ?? { total: 0, done: 0 };
      return {
        doneTotal: acc.doneTotal + counts.done,
        taskTotal: acc.taskTotal + counts.total,
      };
    },
    { doneTotal: 0, taskTotal: 0 },
  );

  const now = new Date();
  const overdue = projects.filter(
    (p) => p.dueDate !== null && p.dueDate < now && p.status !== "completed",
  ).length;

  // Skeleton size roughly matches the --font-size-2xl numeric value it replaces.
  const valueSkeleton = <Skeleton width="2.5rem" height="1.5rem" />;

  return (
    <dl
      className={styles.statsBar}
      role={isLoading ? "status" : undefined}
      aria-live={isLoading ? "polite" : undefined}
      aria-label={isLoading ? "Loading project stats" : undefined}
    >
      <div className={styles.stat}>
        <dt className={styles.label}>Total Projects</dt>
        <dd className={styles.value}>{isLoading ? valueSkeleton : total}</dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Active</dt>
        <dd className={`${styles.value} ${styles.valueAccent}`}>
          {isLoading ? valueSkeleton : active}
        </dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Tasks Done</dt>
        <dd className={styles.value}>
          {isLoading ? (
            valueSkeleton
          ) : (
            <>
              {doneTotal}
              <span className={styles.denominator}>/{taskTotal}</span>
            </>
          )}
        </dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Overdue</dt>
        <dd
          className={`${styles.value} ${overdue > 0 && !isLoading ? styles.valueDanger : ""}`}
        >
          {isLoading ? valueSkeleton : overdue}
        </dd>
      </div>
    </dl>
  );
}
