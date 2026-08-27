/**
 * Manual replacement for next/headers, imported as a namespace and handed
 * to jest.mock(). Backs cookies() with an in-memory Map since the real one
 * needs a live request. Uses a static import, not require(), since
 * require() inside the jest.mock() factory trips the no-require-imports
 * lint rule.
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
