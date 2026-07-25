"use client";

import { AlertCircle, ClipboardList, ShieldOff } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/Skeleton";
import { TaskItem } from "./TaskItem";
import type { Task } from "@/types/atlas.types";
import styles from "./TaskList.module.css";

type TaskListProps = {
  projectId: string;
  onTaskSelect: (task: Task) => void;
};

const SKELETON_ROW_COUNT = 4;

/**
 * Loading skeleton shared by the initial task fetch and the membership
 * recheck below, so the recheck never flashes "No tasks yet." before
 * replacing it with the loading state a moment later.
 */
function renderLoadingSkeleton() {
  return (
    <ul
      className={styles.list}
      role="status"
      aria-live="polite"
      aria-label="Loading tasks"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <li key={i} className={styles.skeletonRow}>
          <Skeleton width="65%" height="1rem" />
          <Skeleton width="80px" height="1rem" borderRadius="var(--radius-pill)" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the task list for a given project.
 * Handles loading, error, empty, and success states internally.
 *
 * An empty result is ambiguous: RLS silently filters tasks for a project the
 * user has lost access to, which looks identical to a project that genuinely
 * has zero tasks. Only when tasks resolves empty, confirm actual membership
 * via `is_project_member` and show a distinct message if access was revoked.
 *
 * @param projectId - The ID of the project whose tasks to display
 * @param onTaskSelect - Called when a task row is activated; opens the edit modal
 */
export function TaskList({ projectId, onTaskSelect }: TaskListProps) {
  const { data: tasks, isLoading, isError, refetch } = useTasks(projectId);
  const { data: currentUser } = useCurrentUser();

  const shouldCheckMembership = !isLoading && !isError && tasks?.length === 0;

  const { data: isMember, isLoading: isCheckingMembership } = useQuery({
    queryKey: ["isProjectMember", projectId, currentUser?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("is_project_member", {
        _user_id: currentUser!.id,
        _project_id: projectId,
      });
      if (error) throw error;
      return data;
    },
    enabled: shouldCheckMembership && !!currentUser?.id,
  });

  if (isLoading) {
    return renderLoadingSkeleton();
  }

  if (isError) {
    return (
      <div className={styles.stateContainer} role="alert">
        <AlertCircle size={20} className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.stateMessage}>Couldn&apos;t load tasks.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className={styles.retryButton}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    if (shouldCheckMembership && isCheckingMembership) {
      return renderLoadingSkeleton();
    }

    if (isMember === false) {
      return (
        <div className={styles.stateContainer} role="status" aria-live="polite">
          <ShieldOff size={24} className={styles.stateIcon} aria-hidden="true" />
          <p className={styles.stateMessage}>
            You no longer have access to this project.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.stateContainer}>
        <ClipboardList
          size={24}
          className={styles.stateIcon}
          aria-hidden="true"
        />
        <p className={styles.stateMessage}>No tasks yet.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} aria-label="Project tasks">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskItem task={task} onSelect={onTaskSelect} />
        </li>
      ))}
    </ul>
  );
}
