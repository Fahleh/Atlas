"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
 * Renders a single task row: a drag handle, title and status indicator
 * behind a real button that opens the edit modal, plus an inline assignee
 * control, three siblings, not one nested inside another. A real
 * interactive element nested inside another interactive element would be
 * stripped out of the accessibility tree by ARIA's presentational-children
 * behavior, see docs/decisions.md's ProjectCard entry for the same issue
 * caught there.
 *
 * @param task - The task to display
 * @param members - Members of the task's project, for the assignee popover
 * @param onSelect - Callback fired when the title/status area is activated
 */
export function TaskItem({ task, members, onSelect }: TaskItemProps) {
  const config = STATUS_CONFIG[task.status];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isDragging ? styles.rowDragging : ""}`}
    >
      <button
        type="button"
        aria-label={`Reorder ${task.title}`}
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
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
