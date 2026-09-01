# Atlas Authentication and Session Handling

This document defines Next.js request-interception conventions, Supabase SSR
cookie handling, route protection, redirects, auth confirmation, logout, and
cross-user cache isolation.

---

## Next.js 16 Request Interception

Use root `proxy.ts`.

```typescript
export async function proxy(request: NextRequest) {
  // ...
}
```

Do not create `middleware.ts` or export `middleware`.

Translate older examples to the installed Next.js 16 convention.

---

## Supabase Clients

Use the established clients:

- `lib/supabase/client.ts` for the browser;
- `lib/supabase/server.ts` for Server Components and Server Actions.

Both use the `@supabase/ssr` `getAll`/`setAll` cookie pattern.

Do not recreate or duplicate client setup.

---

## `proxy.ts` Responsibilities

`proxy.ts` has separate responsibilities that must not be conflated.

### 1. Session refresh

Call `getClaims()` on every request.

When token refresh causes `setAll`:

1. write cookies to `request.cookies`;
2. rebuild the response with `NextResponse.next({ request })`;
3. write cookies to `response.cookies`;
4. apply refresh-provided cache headers to `response.headers`.

The request mutation lets Server Components in the same request see the fresh
token. The response mutation sends it to the browser.

The installed `@supabase/ssr` types expose a second `setAll` argument containing
headers such as:

- `Cache-Control`;
- `Expires`;
- `Pragma`.

Apply them:

```typescript
Object.entries(headers).forEach(([key, value]) => {
  response.headers.set(key, value);
});
```

Failing to apply these headers risks caching a refreshed authenticated response.

Build the response after request-cookie mutation, not before.

### 2. Route protection

Session refresh runs unconditionally.

Only the redirect decision depends on whether a route is public.

`PUBLIC_PATHS` must include every unauthenticated route, including Route
Handlers. `/auth` must cover `/auth/confirm` through the chosen matching rule.

Review `PUBLIC_PATHS` whenever a new top-level route is added.

### 3. Preserve the original destination

When redirecting an unauthenticated user to login, attach the original path and
query string as `redirectTo`.

```typescript
const loginUrl = new URL("/login", request.url);
loginUrl.searchParams.set(
  "redirectTo",
  request.nextUrl.pathname + request.nextUrl.search
);
```

Do not concatenate query strings manually.

---

## Server Trust Decisions

Preference order:

1. `getClaims()`;
2. `getUser()` when live Auth-server data is required;
3. never trust `getSession()` for authorization.

### `getClaims()`

Verifies the JWT signature.

With Atlas's asymmetric ECC P-256 signing setup, verification is local through
WebCrypto/JWKS after keys are available. Use it by default.

### `getUser()`

Makes a network call for the live Auth user record. Use only when correctness
depends on data that may change between token refreshes and is not present in
claims.

### `getSession()`

Reads stored session data without server-side verification. Never use it as an
authorization trust boundary.

---

## Open-Redirect Protection

Any user-provided destination must be parsed and origin-checked.

```typescript
function getSafeRedirectPath(value: string, baseUrl: string): string {
  try {
    const url = new URL(value, baseUrl);
    const base = new URL(baseUrl);

    if (url.origin !== base.origin) {
      return "/";
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
```

Use `process.env.NEXT_PUBLIC_BASE_URL` as the known base origin.

Never use:

```typescript
redirectTo.startsWith("/")
```

Protocol-relative URLs such as `//evil.com` pass that check.

After validation, redirect with the relative path, not the absolute URL. This
keeps custom domains, preview deployments, and reverse proxies working.

`lib/baseUrl.ts`'s `getBaseUrl()` is the actual source for
`NEXT_PUBLIC_BASE_URL`, not a direct env read at each call site. It gates
on `process.env.VERCEL`, not `NODE_ENV`/`isDev`. The question that matters
here is whether the code is genuinely running on Vercel's infrastructure,
not whether it's a dev build, and a missing `NEXT_PUBLIC_BASE_URL` on
Vercel should fail loud rather than silently validate redirects against
`localhost:3000` in a real deployment. Everywhere else (local dev, CI,
any other host), an unset var falls back to `http://localhost:3000` the
same way it always has.

Confirmed against Vercel's own docs: `VERCEL` is only populated when the
project's "Enable access to System Environment Variables" setting is
turned on in the dashboard. It is not on by default for every project.
If that setting is ever off for Atlas's Vercel project, `VERCEL` will
never be set, and `getBaseUrl()` will silently take the local-fallback
branch even in production, the exact failure this gate exists to avoid.
Check that setting is on before trusting this gate in production.

---

## Auth Confirmation

The Supabase email template must use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The Route Handler is:

```text
app/auth/confirm/route.ts
```

It is public and outside route groups.

For standard signup confirmation, the OTP type is `email`. Verify this against
current Supabase docs and the actual configured template before changing it.
The TypeScript type is too permissive to protect against plausible wrong values.

Route Handlers return `NextResponse.redirect(...)`. Do not call
`redirect()` from `next/navigation` there.

---

## Logout

Logout is a Server Action in:

```text
app/(dashboard)/actions.ts
```

It:

1. creates the server Supabase client;
2. calls `supabase.auth.signOut({ scope: "local" })`;
3. calls `redirect("/")`.

`scope: "local"` signs out the current device only.

Keep `redirect()` outside `try/catch`.

Do not add `revalidatePath`. Atlas server state is managed by React Query rather
than Next.js cached `fetch`/`unstable_cache`.

Wire logout as a form action around the logout button, not as a client `onClick`.

---

## Cache Isolation

`QueryProvider` is scoped to `app/(dashboard)/layout.tsx` only, not root
`app/layout.tsx`. `(dashboard)/layout.tsx` fully unmounts on every crossing to
`(auth)`, so `QueryProvider`'s own mount/unmount lifecycle is the primary
cross-user React Query cache isolation mechanism under the current auth
model, not `ClearQueryCacheOnMount`, which is deleted. See `docs/decisions.md`.

`AuthListenerProvider` listens for `SIGNED_OUT` only as a secondary safeguard.

Read `docs/decisions.md` before changing account-switching behavior, cache
lifetime, or auth-listener events.

---

## Auth-Specific Manual Verification

`docs/testing.md`'s Manual Browser Verification section states the general
rule for when live-environment testing is required. For a change touching
auth, session, or routing specifically, also confirm:

- unauthenticated redirect preserves the original destination;
- `redirectTo` rejects external and protocol-relative URLs;
- signup confirmation works through the real email link, not a stubbed flow;
- logout signs out the current device only;
- a token-refresh response carries correct cookies and headers;
- protected and public routes resolve correctly for both auth states.

---

## Current Scope

This file intentionally does not invent Vercel project settings, CI pipelines,
preview-environment policy, environment-variable inventories, or rollback
procedures that were not present in the original engineering brief.

Add them here when Atlas adopts them.
