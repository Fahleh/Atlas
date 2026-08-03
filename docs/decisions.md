# Architectural Decisions

> Last updated: July 2026

This document explains *why* certain choices were made where the reasoning
isn't obvious from the code alone — not a changelog, and not a tutorial.
Update it when a deliberate decision is made that a future reader (including
a reviewer or interviewer) might otherwise mistake for an oversight or
inconsistency.

---

## `EntityModal`/`TaskModal` compound vs. `ProjectModal` single-block

**Decision:** `TaskModal` is a compound component (`.Header`, `.Title`,
`.CloseButton`, `.Body`, `.Field`, `.Footer`, `.FooterActions`,
`.CancelButton`, `.SubmitButton`, composed via `Object.assign`).
`ProjectModal` is not — it's a single component taking fixed props
(`name`, `description`, `dueDate`, `status`, `editingProject`), with no
caller-driven composition at all.

**Why they're different on purpose:**

The compound pattern (the lineage this codebase draws from — Radix,
Reach UI, shadcn) exists to solve one specific problem: *unknown, variable
composition*, where a consumer might need to nest arbitrary content inside
a shared shell in ways the component author can't fully predict up front.

`TaskModal` is compound because it predates the later `EntityModal`
extraction — its existing call site in `ProjectSlideOver.tsx` already used
the compound shape, and preserving that public API meant the refactor
(extracting the generic shell into `EntityModal`) didn't require touching
already-working, already-tested consumer code. It is **not** compound
because task editing genuinely requires that flexibility.

`ProjectModal` was built after `EntityModal` already existed, with no
equivalent legacy shape to preserve. Its fields are fixed and no caller
needs to compose it differently — applying the compound pattern here anyway
would mean reaching for machinery designed to solve a problem that doesn't
exist in this case. That would demonstrate not understanding *why* the
compound pattern exists, not consistency for its own sake.

**Takeaway for future modals:** default to a single-block component. Only
reach for the compound pattern when a component genuinely needs
caller-driven, variable composition — not because a similar-looking
component elsewhere happens to be compound.

---

## Status field availability at creation time (`CreateTaskInput`/`CreateProjectInput` vs. the live forms)

**Decision:** `lib/entityFactory.ts`'s `createTask`/`createProject`
functions deliberately exclude `status` from their input types — the
factory always defaults to `todo`/`active`, with status never settable at
call time. `TaskModal.StatusField` and `ProjectModal`'s status field, by
contrast, **do** let a user pick a status at creation time (still defaulting
to `todo`/`active`, but overridable before submit).

**Why these aren't in conflict, even though they look like it:**

These are two independent, separately-decided things that happen to share
a similar shape (task/project creation) but serve different purposes.

`entityFactory.ts` was built early, before real Supabase-backed forms
existed — it's a local/offline entity-construction utility (still used only
by its own test suite; not called anywhere in the live app's data flow as
of this writing). Its no-status-at-creation rule was a deliberate
simplification for that context.

The live `TaskModal`/`ProjectModal` forms were designed later, independently,
against what a real user of a project-management tool would actually expect
— and letting someone set a task's status at creation time (e.g. logging a
task that's already in progress) is standard, expected behavior in every
comparable tool.

**Takeaway:** don't treat `entityFactory.ts`'s input-type constraint as a
rule the live forms are violating. If these are ever intentionally unified
(e.g. by retiring `entityFactory.ts` or extending its input types), that's
a deliberate product decision to make explicitly — not a discovered bug to
silently "fix" by removing the status field from either surface.

---

## Clearing the React Query cache on `(auth)`/`(dashboard)` layout mount, not just on `onAuthStateChange`

**Decision:** `components/ClearQueryCacheOnMount.tsx` — a small Client
Component that calls `queryClient.clear()` once, on mount, returning `null` —
is rendered inside both `app/(auth)/layout.tsx` and
`app/(dashboard)/layout.tsx`. This is the **primary** mechanism preventing
cross-user cache leaks (one user's cached `projects`/`tasks`/`members`/profile
data rendering for a different, newly-logged-in user in the same tab).
`providers/AuthListenerProvider.tsx`'s `onAuthStateChange`-based `clear()` is
kept as a secondary path, not removed, but is no longer the thing this
correctness property actually depends on.

**Why `onAuthStateChange` wasn't sufficient:** Atlas's login/signup/logout
all run as Server Actions against the *server* Supabase client. The
*browser* client's `onAuthStateChange` — which `AuthListenerProvider`
listens on — is never itself told a server-side sign-in/sign-out happened.
This is a confirmed, Supabase-team-acknowledged limitation
(supabase-js#1618), not a bug in Atlas's usage of it, and explains the
intermittent behavior observed in manual two-browser testing before this fix.

**Why layout mount is a reliable substitute:** Next.js fully remounts a
nested layout on every crossing between separate route groups, and does
*not* remount it on navigation within the same group. Since `(auth)` and
`(dashboard)` are sibling nested layouts under the single root
`app/layout.tsx` (which is what makes this a client-side transition rather
than a hard page reload), mounting `ClearQueryCacheOnMount` in both is a
deterministic "a real transition just occurred" signal, independent of
whichever Supabase client happened to run the auth call.

**The assumption this correctness depends on — read before adding any new
auth-adjacent feature:** this only works because, in Atlas's current
single-account auth model, *every* path from one user's identity to a
different one necessarily crosses the `(auth)` route group boundary (you
cannot reach a different user's dashboard session without passing through
`/login` first). If a future feature ever allowed switching identity
*without* crossing that boundary — e.g. an account-switcher or impersonation
feature that swaps the active user via an API call while staying on a
dashboard route — this mechanism would **not** fire, and the cache leak this
fix closes would reopen for that new code path. Any such feature must
either trigger `queryClient.clear()` directly itself, or be designed to
route through a layout boundary the same way login/logout already do.

---

## Bypassing fetch caching in both Supabase clients (`cache: "no-store"`)

**Decision:** Both `lib/supabase/client.ts` and `lib/supabase/server.ts`
override the `fetch` implementation passed to their Supabase client with
`cache: "no-store"`.

**Why (browser client):** PostgREST responses carry `Cache-Control: public,
max-age=600` with no `Authorization` in `Vary`, so the browser's HTTP disk
cache treats identical request URLs as interchangeable regardless of which
user's bearer token made the request. Confirmed via manual two-user
testing: after logging out User A and logging in as User B, the same URL
could be served from disk cache with User A's data.

**Why (server client):** The browser disk cache doesn't apply server-side,
but Next.js patches the global `fetch` to add its own Data Cache layer by
default in Server Components — a structurally similar leak risk. Not
independently confirmed as active here, but this was the second cross-user
caching leak found in one session, so the server client got the same fix
for consistency and defense-in-depth rather than waiting for confirmation.

---

## Redirecting already-authenticated users away from `/login`/`/signup`

**Decision:** `proxy.ts` redirects an authenticated user who lands on
`/login` or `/signup` straight to `/`. Scoped to `AUTH_ENTRY_PATHS` only —
`/auth/confirm` stays reachable regardless of auth state.

**Why:** Without this, a still-logged-in user could reach the login form
in the same tab, and a different user could sign in from it — producing an
ambiguous auth state before `ClearQueryCacheOnMount` gets a chance to run
on the next layout mount.

---

## Triggering the success-banner side effect imperatively, not via `useEffect` on a boolean

**Decision:** `ProfileForm.tsx`'s `triggerSuccessBanner()` is called directly
from the save action's success branch, not from a `useEffect` watching
`state.success`.

**Why:** `useActionState` returns a new state object on every dispatch, but
`state.success` itself can be `true` on two consecutive successful saves —
React's effect dependency comparison (`Object.is`) sees `true → true` as no
change, so an effect keyed on that boolean wouldn't re-fire on the second
save, and the dismiss timer wouldn't reset. Calling the trigger imperatively,
inside the action itself, fires on every dispatch regardless of whether the
resulting value changed — the correct behavior for "react to an event having
happened," which a value-comparison-based effect can't reliably express.

---

## Keeping `avatars: anyone can view` despite Supabase's own "clients can list all files" warning

**Decision:** The Storage SELECT policy on the `avatars` bucket is kept as
originally written, despite Supabase's dashboard flagging that it allows
bucket-wide listing/enumeration.

**Why:** Confirmed (via a Supabase maintainer's own answer, and by directly
testing both configurations) that `list` and single-file access share the
same RLS SELECT policy — there is no way to grant one without the other.
Removing the policy was tested and found to break `upsert: true` re-uploads
(Postgres/the client needs read access to determine whether a row already
exists before deciding insert vs. overwrite). The actual exposure from
keeping it is narrow — avatar storage paths are `{userId}/avatar.ext`, so
the only information enumerable is which user IDs have uploaded a photo,
not any other data. Accepted as a documented tradeoff, same reasoning as
`lookup_user_id_by_email`'s deliberate scope decision.