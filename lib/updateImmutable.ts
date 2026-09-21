import {
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/types/atlas.types";

export function updateProject(
  project: Project,
  changes: Partial<UpdateProjectInput>,
): Project {
  return { ...project, ...changes };
}

export function updateProjectStatus(
  project: Project,
  status: ProjectStatus,
): Project {
  return { ...project, status };
}

export function updateTask(
  task: Task,
  changes: Partial<UpdateTaskInput>,
): Task {
  return { ...task, ...changes };
}

export function updateTaskStatus(task: Task, status: TaskStatus): Task {
  return { ...task, status };
}

/**
 * Compares two nullable due dates by value, not by reference. A due date
 * read back from Supabase and one just built from a form field are always
 * different Date instances even when they represent the same day, so a
 * plain === would report a change that never happened.
 *
 * @param a - First due date, or null
 * @param b - Second due date, or null
 * @returns True when both are null or both resolve to the same instant
 */
export function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}
