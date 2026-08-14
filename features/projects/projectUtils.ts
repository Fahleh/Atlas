import type { ProjectStatus } from "@/types/atlas.types";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

// TEMPORARY, throwaway live-verification test, not part of the approved diff.
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
