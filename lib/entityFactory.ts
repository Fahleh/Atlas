import {
  CreateProjectInput,
  CreateTaskInput,
  Project,
  Task,
} from "@/types/atlas.types";

/**
 * A function for creating new project entities with unique IDs and timeStamps.
 *
 * @param { CreateProjectInput } input - The param object containing the following properties:
 * name - The project name.
 * description - The project description.
 * dueDate - The due date of the project.
 *
 * @returns { Project } A new project entity
 */

export function createProject(input: CreateProjectInput): Project {
  const { name, description, dueDate } = input;
  const now = new Date();

  const newProject: Project = {
    id: crypto.randomUUID(),
    ownerId: "user-123", // TODO: replace with auth.uid() from Supabase session
    name,
    description,
    status: "active",
    dueDate,
    createdAt: now,
    updatedAt: now,
  };

  return newProject;
}

/**
 * A function for creating new task entities with unique IDs and timeStamps.
 *
 * @param { CreateTaskInput } input - The param object containing the following properties:
 * projectId - The id of the project to which the task belongs.
 * assigneeId - The id of the user assigned to the task.
 * title - The task title.
 * description - The task description.
 * dueDate - The due date of the task.
 *
 * @returns { Task } A new Task entity
 */

export function createTask(input: CreateTaskInput): Task {
  const { projectId, assigneeId, title, description, dueDate } = input;
  const newTask: Task = {
    id: crypto.randomUUID(),
    projectId,
    assigneeId: assigneeId ?? null,
    title,
    description,
    status: "todo",
    dueDate,
    createdAt: new Date(),
  };

  return newTask;
}
