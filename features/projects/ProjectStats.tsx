"use client";

import type { Project } from "@/types/atlas.types";
import styles from "./ProjectStats.module.css";

type ProjectStatsProps = {
  projects: Project[];
};

/**
 * Displays a four-cell stats bar summarising the current project list.
 * Tasks Done and Avg. Progress are placeholders until task data is wired.
 *
 * @param projects - Full unfiltered project list from useProjects()
 */
export function ProjectStats({ projects }: ProjectStatsProps) {
  const total = projects.length;
  const active = projects.filter((p) => p.status === "active").length;

  return (
    <dl className={styles.statsBar}>
      <div className={styles.stat}>
        <dt className={styles.label}>Total Projects</dt>
        <dd className={styles.value}>{total}</dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Active</dt>
        <dd className={`${styles.value} ${styles.valueAccent}`}>{active}</dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Tasks Done</dt>
        {/* TODO: wire to tasks data */}
        <dd className={styles.value}>
          0<span className={styles.denominator}>/0</span>
        </dd>
      </div>
      <div className={styles.stat}>
        <dt className={styles.label}>Avg. Progress</dt>
        {/* TODO: wire to tasks data */}
        <dd className={styles.value}>
          0<span className={styles.denominator}>%</span>
        </dd>
      </div>
    </dl>
  );
}
