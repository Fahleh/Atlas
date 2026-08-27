/**
 * Manual replacement for next/navigation, imported as a namespace and
 * handed to jest.mock(). Uses a static import, not require(), since
 * require() inside the jest.mock() factory trips the no-require-imports
 * lint rule.
 */

export const redirect = jest.fn((url: string, type: "push" | "replace" = "push") => {
  const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
  error.digest = `NEXT_REDIRECT;${type};${url};307;`;
  throw error;
});
