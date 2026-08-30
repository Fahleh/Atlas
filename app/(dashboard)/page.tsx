"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, FolderPlus, ListChecks } from "lucide-react";
import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import { useProjects } from "@/hooks/useProjects";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { useMembersByProject } from "@/hooks/useMembersByProject";
import { useTasks } from "@/hooks/useTasks";
import { useDueSoonTaskCount } from "@/hooks/useDueSoonTaskCount";
import { Skeleton } from "@/components/Skeleton";
import { ProjectStats } from "@/features/projects/ProjectStats";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { VelocityStatus } from "@/features/projects/VelocityStatus";
import { ActivityFeed } from "@/features/activity/ActivityFeed";
import { DUE_DATE_FORMAT } from "@/features/projects/projectUtils";
import { STATUS_CONFIG } from "@/features/tasks/taskUtils";
import layoutStyles from "@/styles/layout.module.css";
import dotStyles from "@/styles/statusDot.module.css";
import styles from "./page.module.css";

const RECENT_PROJECTS_COUNT = 2;
const UPCOMING_TASKS_COUNT = 5;
const TASK_SKELETON_ROW_COUNT = 5;

export default function DashboardPage() {
  // Fixes "now" as of mount, not a live clock. react-hooks/purity forbids
  // calling Date.now() directly during render or inside useMemo.
  const [now] = useState(() => Date.now());
  const {
    data: projects = [],
    isLoading,
    isError,
    error: projectsError,
    refetch,
  } = useProjects();

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const {
    data: taskCountsByProject = {},
    isLoading: isTaskCountsLoading,
    isError: isTaskCountsError,
    error: taskCountsError,
    refetch: refetchTaskCounts,
  } = useTaskCountsByProject(projectIds);

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
  const {
    data: membersByProject = {},
    isError: isMembersError,
    error: membersError,
    refetch: refetchMembers,
  } = useMembersByProject(recentProjectIds);

  // Soonest due date first (nulls last) among projects with no due date,
  // most-recently-updated first. First project with any tasks wins.
  const upcomingTasksProject = useMemo(() => {
    const sortedByDueDate = [...projects].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return (
      sortedByDueDate.find(
        (p) => (taskCountsByProject[p.id]?.total ?? 0) > 0,
      ) ?? null
    );
  }, [projects, taskCountsByProject]);

  const {
    data: upcomingTasksData = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks(upcomingTasksProject?.id ?? "");
  const upcomingTasks = useMemo(
    () => upcomingTasksData.slice(0, UPCOMING_TASKS_COUNT),
    [upcomingTasksData],
  );

  const {
    data: dueSoonTaskCount = 0,
    isLoading: isDueSoonLoading,
    isError: isDueSoonError,
    refetch: refetchDueSoon,
  } = useDueSoonTaskCount(now);

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
            {projectsError?.message ?? "Couldn't load your dashboard."}
          </p>
          {projectsError?.errorKind === "sessionExpired" ? (
            <Link href="/login" className={styles.dashboardErrorRetry}>
              Log in
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => refetch()}
              className={styles.dashboardErrorRetry}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={layoutStyles.pageContainer}>
      {(isTaskCountsError || isMembersError) && (
        <ActionErrorMessage
          error={
            (taskCountsError ?? membersError)?.message ??
            "Some project details couldn't load."
          }
          errorKind={(taskCountsError ?? membersError)?.errorKind}
          onRetry={() => {
            if (isTaskCountsError) refetchTaskCounts();
            if (isMembersError) refetchMembers();
          }}
          className={styles.partialError}
        />
      )}

      <ProjectStats
        projects={projects}
        taskCounts={taskCountsByProject}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[4fr_2fr] gap-10 mt-2">
        <div className={styles.dashboardColumn}>
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Projects</h2>
              <Link href="/projects" className={styles.viewAllLink}>
                View all projects
              </Link>
            </div>

            {isLoading ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-6"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-6">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    members={membersByProject[project.id] ?? []}
                    taskCounts={
                      taskCountsByProject[project.id] ?? { total: 0, done: 0 }
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Activity</h2>
            </div>
            <ActivityFeed now={now} />
          </section>
        </div>

        <div className={styles.dashboardColumn}>
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Upcoming Tasks</h2>
            </div>

            {isLoading || isTaskCountsLoading || isTasksLoading ? (
              <div className={styles.taskCard}>
                <div
                  className={styles.taskList}
                  role="status"
                  aria-live="polite"
                  aria-label="Loading upcoming tasks"
                >
                  {Array.from({ length: TASK_SKELETON_ROW_COUNT }).map(
                    (_, i) => (
                      <div key={i} className={styles.taskSkeletonRow}>
                        <Skeleton width="60%" height="1rem" />
                        <Skeleton width="40%" height="0.875rem" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : isTasksError ? (
              <ActionErrorMessage
                error={tasksError?.message ?? "Couldn't load upcoming tasks."}
                errorKind={tasksError?.errorKind}
                onRetry={() => refetchTasks()}
                className={styles.partialError}
              />
            ) : !upcomingTasksProject ? (
              <div className={styles.stateContainer}>
                <ListChecks
                  size={48}
                  className={styles.stateIcon}
                  aria-hidden="true"
                />
                <p className={styles.stateMessage}>No upcoming tasks.</p>
                <p className={styles.stateSubtitle}>
                  Add tasks to a project to see them here.
                </p>
              </div>
            ) : (
              <div className={styles.taskCard}>
                <div className={styles.taskList}>
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className={styles.taskRow}>
                      <div className={styles.taskRowHeader}>
                        <span
                          aria-hidden="true"
                          className={`${styles.taskStatusDot} ${dotStyles[STATUS_CONFIG[task.status].dotColorClass]}`}
                        />
                        <span className={styles.taskTitle}>{task.title}</span>
                      </div>
                      <span className={styles.taskDueDate}>
                        {task.dueDate?.toLocaleDateString(
                          "en-US",
                          DUE_DATE_FORMAT,
                        ) ?? "No due date"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.taskCardFooter}>
                  <Link
                    href={`/projects?project=${upcomingTasksProject.id}`}
                    className={styles.viewAllLink}
                  >
                    View tasks
                  </Link>
                </div>
              </div>
            )}
          </section>

          <VelocityStatus
            dueSoonTaskCount={dueSoonTaskCount}
            isLoading={isDueSoonLoading}
            isError={isDueSoonError}
            onRetry={() => refetchDueSoon()}
          />
        </div>
      </div>
    </div>
  );
}
