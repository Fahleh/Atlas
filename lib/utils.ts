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
