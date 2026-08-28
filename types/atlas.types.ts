export type ProjectStatus = "active" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type MemberRole = "owner" | "collaborator";

export type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: MemberRole;
};

export type Project = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export type ActivityVerb =
  | "project_created"
  | "project_updated"
  | "task_created"
  | "task_status_changed"
  | "task_updated"
  | "task_deleted"
  | "member_added"
  | "member_removed";

export type ActivityEntityType = "project" | "task" | "project_member";

export type ActivityLogEntry = {
  id: string;
  projectId: string;
  projectName: string | null;
  actorId: string | null;
  actorName: string;
  actorAvatarUrl: string | null;
  verb: ActivityVerb;
  entityType: ActivityEntityType;
  entityId: string | null;
  entityName: string;
  metadata: unknown;
  createdAt: Date;
};