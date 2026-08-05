"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, FolderPlus } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { useMembersByProject } from "@/hooks/useMembersByProject";
import { Skeleton } from "@/components/Skeleton";
import { ProjectStats } from "@/features/projects/ProjectStats";
import { ProjectCard } from "@/features/projects/ProjectCard";
import layoutStyles from "@/styles/layout.module.css";
import styles from "./page.module.css";

const RECENT_PROJECTS_COUNT = 2;

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects = [], isLoading, isError, refetch } = useProjects();

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const { data: taskCountsByProject = {} } =
    useTaskCountsByProject(projectIds);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, RECENT_PROJECTS_COUNT),
    [projects],
  );
  const recentProjectIds = useMemo(
    () => recentProjects.map((p) => p.id),
    [recentProjects],
  );
  const { data: membersByProject = {} } =
    useMembersByProject(recentProjectIds);

  // Cross-route navigation from the dashboard — push, not replace, so Back
  // returns here rather than skipping past it. See docs/decisions.md.
  function handleSelectProject(id: string) {
    router.push(`/projects?project=${id}`);
  }

  if (isError) {
    return (
      <div className={layoutStyles.pageContainer}>
        <div className={styles.dashboardError} role="alert">
          <AlertCircle
            size={20}
            className={styles.dashboardErrorIcon}
            aria-hidden="true"
          />
          <p className={styles.dashboardErrorMessage}>
            Couldn&apos;t load your dashboard.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.dashboardErrorRetry}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={layoutStyles.pageContainer}>
      <ProjectStats
        projects={projects}
        taskCounts={taskCountsByProject}
        isLoading={isLoading}
      />

      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Projects</h2>
          <Link href="/projects" className={styles.viewAllLink}>
            View all projects
          </Link>
        </div>

        {isLoading ? (
          <div
            className={styles.recentProjectsGrid}
            role="status"
            aria-live="polite"
            aria-label="Loading recent projects"
          >
            {Array.from({ length: RECENT_PROJECTS_COUNT }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonCardHeader}>
                  <Skeleton
                    width="36px"
                    height="36px"
                    borderRadius="var(--radius-md)"
                  />
                  <Skeleton
                    width="80px"
                    height="1.25rem"
                    borderRadius="var(--radius-pill)"
                  />
                </div>
                <div className={styles.skeletonCardBody}>
                  <Skeleton width="70%" height="1rem" />
                  <Skeleton width="100%" height="0.75rem" />
                  <Skeleton width="55%" height="0.75rem" />
                </div>
                <Skeleton
                  width="100%"
                  height="4px"
                  borderRadius="var(--radius-pill)"
                />
                <div className={styles.skeletonAvatars}>
                  <Skeleton
                    width="28px"
                    height="28px"
                    borderRadius="var(--radius-pill)"
                  />
                  <Skeleton
                    width="28px"
                    height="28px"
                    borderRadius="var(--radius-pill)"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className={styles.stateContainer}>
            <FolderPlus
              size={48}
              className={styles.stateIcon}
              aria-hidden="true"
            />
            <p className={styles.stateMessage}>
              Your recent projects will show up here.
            </p>
            <p className={styles.stateSubtitle}>
              Create a project to get started.
            </p>
          </div>
        ) : (
          <div className={styles.recentProjectsGrid}>
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={handleSelectProject}
                members={membersByProject[project.id] ?? []}
                taskCounts={
                  taskCountsByProject[project.id] ?? { total: 0, done: 0 }
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
