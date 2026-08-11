"use client";

import Link from "next/link";
import { AlertCircle, ClipboardList } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
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
 * Loading skeleton for the initial task fetch.
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
 * @param projectId - The ID of the project whose tasks to display
 * @param onTaskSelect - Called when a task row is activated; opens the edit modal
 */
export function TaskList({ projectId, onTaskSelect }: TaskListProps) {
  const {
    data: tasks,
    isLoading,
    isError,
    error: tasksError,
    refetch,
  } = useTasks(projectId);

  if (isLoading) {
    return renderLoadingSkeleton();
  }

  if (isError) {
    return (
      <div className={styles.stateContainer} role="alert">
        <AlertCircle size={20} className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.stateMessage}>
          {tasksError?.message ?? "Couldn't load tasks."}
        </p>
        {tasksError?.errorKind === "sessionExpired" ? (
          <Link href="/login" className={styles.retryButton}>
            Log in
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.retryButton}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
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
