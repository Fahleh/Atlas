/**
 * transforms Object properties from snake_case to camelCase.
 *
 * @param obj - Object with snake_case properties
 * @returns Object with camelCase properties
 */
export function toCamelCase<T>(obj: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value,
    ]),
  ) as T;
}

/**
 * Converts specified fields on an object from Postgres timestamp strings
 * (or null) into real Date instances. Returns a new object — does not
 * mutate the input, consistent with immutable update conventions.
 *
 * @param obj - Object with camelCase keys, some of which are date-like strings
 * @param dateKeys - Keys whose values should be parsed into Date | null
 * @returns A new object with the specified keys converted
 */
export function parseDates<T extends Record<string, unknown>>(
  obj: T,
  dateKeys: (keyof T)[],
): T {
  const result = { ...obj };
  for (const key of dateKeys) {
    const value = result[key];
    result[key] = (value ? new Date(value as string) : null) as T[typeof key];
  }
  return result;
}

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

export type AvatarColor = { bg: string; text: string };

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

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Checks whether a string is a plausibly valid email address format.
 * This is a UX check only — it catches obviously malformed input before
 * a network round-trip, not a security or deliverability guarantee.
 *
 * @param value - Candidate email string
 * @returns True if the string matches a standard email format
 */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * Icon size (px) for full-page state icons: not-found and error boundaries.
 * Deliberately larger than any inline empty-state icon elsewhere in the app
 * (e.g. ProjectList.tsx's 48px), since these render alone on a full page.
 */
export const ERROR_STATE_ICON_SIZE = 64;
