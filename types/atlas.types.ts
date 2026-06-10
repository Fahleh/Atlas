export type ProjectStatus = "active" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate: Date | null;
  createdAt: Date;
};

export type Task = {
  id: string;
  assigneeId: string | null;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date | null;
  createdAt: Date;
};

export type CreateProjectInput = {
  name: string;
  description: string;
  dueDate: Date | null;
};

export type CreateTaskInput = {
  projectId: string;
  assigneeId?: string | null;
  title: string;
  description: string;
  dueDate: Date | null;
};

export type UpdateProjectInput = {
  name: string;
  description: string;
  dueDate: Date | null;
};

export type UpdateTaskInput = {
  title: string;
  description: string;
  dueDate: Date | null;
};