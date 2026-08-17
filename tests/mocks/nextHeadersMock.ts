/**
 * Manual replacement for next/headers. Server Action test files import this
 * module as a namespace and hand it to jest.mock() as the factory's return
 * value:
 *
 *   import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
 *   jest.mock("next/headers", () => nextHeadersMock);
 *
 * (Not require() inside the factory — that trips the no-require-imports
 * lint rule. A static import works the same way since ts-jest hoists
 * jest.mock() calls above other statements, confirmed by reading
 * ts-jest's hoist-jest transformer directly.)
 *
 * The real cookies() reads Next's request-scoped AsyncLocalStorage and
 * throws outside an actual request, so it can't run as-is under plain
 * Jest. This backs cookies() with an in-memory Map instead, matching the
 * get/getAll/set surface lib/supabase/server.ts actually calls.
 */

const store = new Map<string, string>();

/** Seeds a cookie before calling an action, e.g. a live Supabase session cookie. */
export function __setCookie(name: string, value: string): void {
  store.set(name, value);
}

/** Clears all seeded cookies. Call in afterEach so state doesn't leak between tests. */
export function __resetCookies(): void {
  store.clear();
}

export async function cookies() {
  return {
    getAll: () =>
      Array.from(store.entries()).map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
  };
}
