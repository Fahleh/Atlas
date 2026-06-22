"use client";

import type { Task } from "@/types/atlas.types";
import { STATUS_CONFIG } from "./taskUtils";
import styles from "./TaskItem.module.css";

type TaskItemProps = {
  task: Task;
  onSelect: (task: Task) => void;
};

/**
 * Renders a single task row with title and status indicator.
 * Clickable — fires onSelect with the full Task object.
 *
 * @param task - The task to display
 * @param onSelect - Callback fired when the row is activated
 */
export function TaskItem({ task, onSelect }: TaskItemProps) {
  const config = STATUS_CONFIG[task.status];

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      onSelect(task);
    }

    if (e.key === " ") {
      e.preventDefault();
      onSelect(task);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${task.title}`}
      onClick={() => onSelect(task)}
      onKeyDown={handleKeyDown}
      className={styles.row}
    >
      <span className={styles.title}>{task.title}</span>
      <div className={styles.statusBadge}>
        <span
          aria-hidden="true"
          style={{ "--task-dot-color": config.dotColor } as React.CSSProperties}
          className={styles.statusDot}
        />
        <span>{config.label}</span>
      </div>
    </div>
  );
}
