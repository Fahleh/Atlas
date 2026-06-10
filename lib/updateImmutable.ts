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
