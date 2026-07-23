import type { ProjectStatus } from "@/types/atlas.types";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; dotColor: string }
> = {
  active: { label: "Active", dotColor: "var(--color-success)" },
  completed: { label: "Completed", dotColor: "var(--color-accent)" },
  archived: { label: "Archived", dotColor: "var(--color-text-muted)" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "active",
  "completed",
  "archived",
];

/**
 * Returns up to three capital initials from a name string.
 *
 * @param name - Full name or project name string
 * @returns Uppercase initials, e.g. "AT" for "Atlas Tasks"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

type AvatarColor = { bg: string; text: string };

// Non-token hex colors for member avatars. These intentionally fall outside the
// design token system — they are UI-only accent hues with no semantic meaning,
// and the token palette does not provide a sufficient range of distinct colours.
const MEMBER_AVATAR_PALETTE: AvatarColor[] = [
  { bg: "#ede9fe", text: "#7c3aed" }, // purple
  { bg: "#cffafe", text: "#0e7490" }, // cyan
  { bg: "#fce7f3", text: "#be185d" }, // pink
  { bg: "#ccfbf1", text: "#0f766e" }, // teal
  { bg: "#e0e7ff", text: "#4338ca" }, // indigo
  { bg: "#fef9c3", text: "#a16207" }, // warm yellow — distinct from accent
];

/**
 * Derives a consistent avatar colour from an initials string.
 * The same initials always map to the same palette entry across renders.
 *
 * @param initials - Uppercase initials string, e.g. "JD"
 * @returns Object with bg and text hex colour values
 */
export function getMemberAvatarColor(initials: string): AvatarColor {
  const hash = initials
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return MEMBER_AVATAR_PALETTE[hash % MEMBER_AVATAR_PALETTE.length];
}

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
