"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActionErrorMessage } from "@/components/ActionErrorMessage";
import type { SupabaseWriteErrorKind } from "@/lib/supabase/errors";
import type { Member, Task } from "@/types/atlas.types";
import { AssigneeListbox } from "./AssigneeListbox";
import { assignTask } from "./taskActions";
import styles from "./TaskItem.module.css";

type AssigneeControlProps = {
  task: Task;
  members: Member[];
};

/**
 * Inline quick-assign control for a task row. There is no form here,
 * selecting a member or Unassigned writes directly to the database, the
 * selection is the action itself.
 *
 * Keyed by task.id and task.assigneeId together at the call site
 * (TaskItem), not here, so that a refetch after assignTask invalidates
 * the tasks query actually resyncs the listbox's internal selection
 * instead of showing a stale value. failedAttemptCount below handles
 * the other resync case, a write that fails rather than one that
 * succeeds elsewhere.
 *
 * @param task - The task whose assignee can be changed
 * @param members - Members of the task's project, for the popover list
 */
export function AssigneeControl({ task, members }: AssigneeControlProps) {
  const queryClient = useQueryClient();
  const [assignState, setAssignState] = useState<{
    error: string | null;
    errorKind: SupabaseWriteErrorKind | null;
  }>({ error: null, errorKind: null });
  // Bumped on a failed write and folded into AssigneeListbox's key below,
  // forcing it to remount and re-seed from task.assigneeId. Without this,
  // a failed write leaves the listbox showing the rejected selection next
  // to the error with no way back to the real value.
  const [failedAttemptCount, setFailedAttemptCount] = useState(0);

  async function handleChange(assigneeId: string | null) {
    if (assigneeId === task.assigneeId) return;

    setAssignState({ error: null, errorKind: null });
    const result = await assignTask({
      taskId: task.id,
      projectId: task.projectId,
      assigneeId,
      previousAssigneeId: task.assigneeId,
      queryClient,
    });
    if (result.error) {
      setAssignState(result);
      setFailedAttemptCount((count) => count + 1);
    }
  }

  return (
    <div className={styles.assigneeControl}>
      <AssigneeListbox
        key={failedAttemptCount}
        variant="avatar"
        members={members}
        defaultValue={task.assigneeId}
        onChange={handleChange}
      />
      {assignState.error && (
        <ActionErrorMessage
          error={assignState.error}
          errorKind={assignState.errorKind}
          className={styles.assigneeError}
        />
      )}
    </div>
  );
}
