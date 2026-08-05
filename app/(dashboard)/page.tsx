"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { ProjectStats } from "@/features/projects/ProjectStats";
import layoutStyles from "@/styles/layout.module.css";
import styles from "./page.module.css";

export default function DashboardPage() {
  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useProjects();

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const { data: taskCountsByProject = {} } =
    useTaskCountsByProject(projectIds);

  return (
    <div className={layoutStyles.pageContainer}>
      {isError ? (
        <div className={styles.statsError} role="alert">
          <AlertCircle
            size={20}
            className={styles.statsErrorIcon}
            aria-hidden="true"
          />
          <p className={styles.statsErrorMessage}>Couldn&apos;t load stats.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.statsErrorRetry}
          >
            Try again
          </button>
        </div>
      ) : (
        <ProjectStats
          projects={projects}
          taskCounts={taskCountsByProject}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
