import type { TaskStatus } from "@/types/atlas.types";

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotColor: string }
> = {
  todo: { label: "To Do", dotColor: "var(--color-text-muted)" },
  in_progress: { label: "In Progress", dotColor: "var(--color-accent)" },
  done: { label: "Done", dotColor: "var(--color-success)" },
};
