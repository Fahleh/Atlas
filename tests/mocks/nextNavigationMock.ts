/**
 * Manual replacement for next/navigation. Server Action test files import
 * this module as a namespace and hand it to jest.mock() as the factory's
 * return value:
 *
 *   import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";
 *   jest.mock("next/navigation", () => nextNavigationMock);
 *
 * (Not require() inside the factory — that trips the no-require-imports
 * lint rule. A static import works the same way since ts-jest hoists
 * jest.mock() calls above other statements, confirmed by reading
 * ts-jest's hoist-jest transformer directly.)
 *
 * The real redirect() depends on Next's request-scoped actionAsyncStorage
 * to pick push vs. replace, unavailable under plain Jest. This mock throws
 * the same shape the real one does — confirmed by reading
 * next/dist/client/components/redirect.js directly: an Error whose .digest
 * is `NEXT_REDIRECT;<type>;<url>;<statusCode>;` — so a test can either
 * assert on the jest.fn()'s call args directly, or catch the thrown error
 * and read .digest the way Next's own isRedirectError()/
 * getURLFromRedirectError() helpers do.
 */

export const redirect = jest.fn((url: string, type: "push" | "replace" = "push") => {
  const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
  error.digest = `NEXT_REDIRECT;${type};${url};307;`;
  throw error;
});
