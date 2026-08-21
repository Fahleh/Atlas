/**
 * Manual replacement for next/navigation, imported as a namespace and
 * handed to jest.mock(). See docs/decisions.md ("Test mocks verified
 * against real dependency source, not assumed") for the redirect() digest
 * shape and why this uses a static import, not require().
 */

export const redirect = jest.fn((url: string, type: "push" | "replace" = "push") => {
  const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
  error.digest = `NEXT_REDIRECT;${type};${url};307;`;
  throw error;
});
