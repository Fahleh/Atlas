import type { ProjectStatus } from "@/types/atlas.types";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; dotColorClass: "dotMuted" | "dotAccent" | "dotSuccess" }
> = {
  active: { label: "Active", dotColorClass: "dotSuccess" },
  completed: { label: "Completed", dotColorClass: "dotAccent" },
  archived: { label: "Archived", dotColorClass: "dotMuted" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "active",
  "completed",
  "archived",
];

export const DUE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

export const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const DESCRIPTION_MAX_LENGTH = 72;

/**
 * Truncates a description to a maximum character length,
 * appending a Unicode ellipsis if the string exceeds the limit.
 *
 * @param description - Full description string
 * @param maxLength - Character limit before truncation (default 72)
 * @returns The original string, or a trimmed version ending with "…"
 */
export function truncateDescription(
  description: string,
  maxLength = DESCRIPTION_MAX_LENGTH,
): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Calculates a task-completion percentage per docs/architecture.md's
 * honest-percentages rule.
 *
 * total === 0 is a deliberate exception to that rule: done === total
 * (0 === 0) is technically satisfied, but a zero-task project reading
 * "100% complete" is misleading, not honest, so it reads 0% instead.
 *
 * @param taskCounts - done/total task counts for one project
 * @returns Integer percentage 0-100
 */
export function calculateProgressPercent(taskCounts: TaskCounts): number {
  const { done, total } = taskCounts;
  if (total === 0) return 0;
  if (done === 0) return 0;
  if (done === total) return 100;
  return Math.min(99, Math.max(1, Math.round((done / total) * 100)));
}
