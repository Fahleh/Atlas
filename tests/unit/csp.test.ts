import { buildCsp, PROD_SUPABASE_ORIGIN } from "@/lib/csp";

const mockSkeletonHashes = ["'sha256-mockhashone='", "'sha256-mockhashtwo='"];

/**
 * NODE_ENV is typed readonly by Next's own global type augmentation, but
 * that's a compile-time-only annotation, nothing actually locks the
 * property at runtime. A narrow cast on this one assignment is the
 * standard fix, not a full property descriptor rebuild.
 */
function setNodeEnv(value: string) {
  (process.env as { NODE_ENV: string }).NODE_ENV = value;
}

/**
 * Splits a CSP header string into a directive name to source-list map.
 * Directive order and incidental whitespace carry no semantic meaning in
 * a real header, so assertions compare this map instead of the raw string.
 */
function parseCsp(header: string): Record<string, string[]> {
  return Object.fromEntries(
    header
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/);
        return [name, values];
      }),
  );
}

describe("buildCsp", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    setNodeEnv(originalNodeEnv);

    if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  it("builds the expected directive set in development", () => {
    setNodeEnv("development");
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local-project.supabase.co";

    expect(parseCsp(buildCsp(mockSkeletonHashes))).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "style-src-attr": ["'unsafe-hashes'", ...mockSkeletonHashes],
      "img-src": ["'self'"],
      "font-src": ["'self'"],
      "connect-src": ["'self'", "https://local-project.supabase.co"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": [],
    });
  });

  it("falls back to the production Supabase origin in development when the env var is unset", () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(parseCsp(buildCsp(mockSkeletonHashes))["connect-src"]).toEqual([
      "'self'",
      PROD_SUPABASE_ORIGIN,
    ]);
  });

  it("builds the expected directive set in production", () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local-project.supabase.co";

    expect(parseCsp(buildCsp(mockSkeletonHashes))).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'"],
      "style-src-attr": ["'unsafe-hashes'", ...mockSkeletonHashes],
      "img-src": ["'self'"],
      "font-src": ["'self'"],
      "connect-src": ["'self'", PROD_SUPABASE_ORIGIN],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": [],
      "require-trusted-types-for": ["'script'"],
      "trusted-types": ["default"],
    });
  });

  it("keeps the documented unsafe-inline exception on script-src in production", () => {
    setNodeEnv("production");

    expect(parseCsp(buildCsp(mockSkeletonHashes))["script-src"]).toContain("'unsafe-inline'");
  });

  it("never allows unsafe-inline on style-src-attr in either environment", () => {
    for (const env of ["development", "production"]) {
      setNodeEnv(env);

      expect(parseCsp(buildCsp(mockSkeletonHashes))["style-src-attr"]).not.toContain(
        "'unsafe-inline'",
      );
    }
  });
});
