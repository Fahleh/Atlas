import type { TaskStatus } from "@/types/atlas.types";

// TEMPORARY, throwaway live-verification test, not part of the approved diff.
export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotColorClass: "dotMuted" | "dotAccent" | "dotSuccess" }
> = {
  todo: { label: "To Do", dotColorClass: "dotMuted" },
  in_progress: { label: "In Progress", dotColorClass: "dotAccent" },
  done: { label: "Done", dotColorClass: "dotSuccess" },
};
