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
