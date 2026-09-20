"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTasks } from "@/hooks/useTasks";
import { Skeleton } from "@/components/Skeleton";
import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import { TaskItem } from "./TaskItem";
import { reorderTask } from "./taskActions";
import type { Member, Task } from "@/types/atlas.types";
import styles from "./TaskList.module.css";

type TaskListProps = {
  projectId: string;
  members: Member[];
  onTaskSelect: (task: Task) => void;
};

const SKELETON_ROW_COUNT = 4;

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "To reorder a task, press space or enter to pick it up. While dragging, use the up and down arrow keys to move it, then press space or enter to drop it, or escape to cancel.",
};

// Names the real task instead of dnd-kit's generic "Draggable item",
// matching AssigneeListbox/StatusBox's own named-not-generic labels.
function taskTitleFor(tasks: Task[], id: string | number): string {
  return tasks.find((task) => task.id === id)?.title ?? "Task";
}

// Loading skeleton for the initial task fetch.
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
 * @param members - Members of the project, for each row's assignee popover
 * @param onTaskSelect - Called when a task row is activated; opens the edit modal
 */
export function TaskList({ projectId, members, onTaskSelect }: TaskListProps) {
  const {
    data: tasks,
    isLoading,
    isError,
    error: tasksError,
    refetch,
  } = useTasks(projectId);
  const queryClient = useQueryClient();

  // Local, optimistic order, synced from the query result so a refetch
  // after a persisted write becomes the new source of truth again.
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
  const [syncedTasks, setSyncedTasks] = useState<Task[] | undefined>(undefined);
  if (tasks && tasks !== syncedTasks) {
    setSyncedTasks(tasks);
    setOrderedTasks(tasks);
  }

  const [reorderError, setReorderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${taskTitleFor(orderedTasks, active.id)}. Use the arrow keys to move, space or enter to drop.`;
    },
    onDragOver({ active, over }) {
      if (!over) return undefined;
      const title = taskTitleFor(orderedTasks, active.id);
      const position = orderedTasks.findIndex((task) => task.id === over.id) + 1;
      return `${title} moved to position ${position} of ${orderedTasks.length}.`;
    },
    onDragEnd({ active, over }) {
      const title = taskTitleFor(orderedTasks, active.id);
      if (!over) return `${title} was dropped.`;
      const oldIndex = orderedTasks.findIndex((task) => task.id === active.id);
      const newIndex = orderedTasks.findIndex((task) => task.id === over.id);
      const finalOrder = arrayMove(orderedTasks, oldIndex, newIndex);
      const finalPosition = finalOrder.findIndex((task) => task.id === active.id) + 1;
      return `${title} dropped at position ${finalPosition} of ${finalOrder.length}.`;
    },
    onDragCancel({ active }) {
      return `Reordering ${taskTitleFor(orderedTasks, active.id)} was cancelled.`;
    },
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previousOrder = orderedTasks;
    const oldIndex = previousOrder.findIndex((task) => task.id === active.id);
    const newIndex = previousOrder.findIndex((task) => task.id === over.id);
    const nextOrder = arrayMove(previousOrder, oldIndex, newIndex);
    setOrderedTasks(nextOrder);

    const result = await reorderTask({
      projectId,
      orderedTasks: nextOrder,
      movedTaskId: String(active.id),
      queryClient,
    });

    if (result.error) {
      setOrderedTasks(previousOrder);
      setReorderError(result.error);
    }
  }

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
    <>
      {reorderError && (
        <ActionErrorMessage
          error={reorderError}
          className={styles.reorderError}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
        }}
      >
        <SortableContext
          items={orderedTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list} aria-label="Project tasks">
            {orderedTasks.map((task) => (
              <li key={task.id}>
                <TaskItem task={task} members={members} onSelect={onTaskSelect} />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
