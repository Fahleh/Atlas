"use client";

import type { Member, Task } from "@/types/atlas.types";
import { AssigneeControl } from "./AssigneeControl";
import { STATUS_CONFIG } from "./taskUtils";
import styles from "./TaskItem.module.css";
import dotStyles from "@/styles/statusDot.module.css";

type TaskItemProps = {
  task: Task;
  members: Member[];
  onSelect: (task: Task) => void;
};

/**
 * Renders a single task row: title and status indicator behind a real
 * button that opens the edit modal, plus an inline assignee control as a
 * sibling. Not one big role="button" div, a real interactive element
 * nested inside one would be stripped out of the accessibility tree by
 * ARIA's presentational-children behavior, see docs/decisions.md's
 * ProjectCard entry for the same issue caught there.
 *
 * @param task - The task to display
 * @param members - Members of the task's project, for the assignee popover
 * @param onSelect - Callback fired when the title/status area is activated
 */
export function TaskItem({ task, members, onSelect }: TaskItemProps) {
  const config = STATUS_CONFIG[task.status];

  return (
    <div className={styles.row}>
      <button
        type="button"
        aria-label={`Open ${task.title}`}
        onClick={() => onSelect(task)}
        className={styles.openButton}
      >
        <span className={styles.title}>{task.title}</span>
        <div className={styles.statusBadge}>
          <span
            aria-hidden="true"
            className={`${styles.statusDot} ${dotStyles[config.dotColorClass]}`}
          />
          <span>{config.label}</span>
        </div>
      </button>
      <AssigneeControl
        key={`${task.id}-${task.assigneeId ?? "unassigned"}`}
        task={task}
        members={members}
      />
    </div>
  );
}
