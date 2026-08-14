# Architectural Decisions

> Last updated: August 2026

This document explains _why_ certain choices were made where the reasoning
is not obvious from the code alone. It is not a changelog, and not a
tutorial. Update it when a deliberate decision is made that a future reader
(including a reviewer or interviewer) might otherwise mistake for an
oversight or inconsistency.

Entries whose `**Why:**` opens with an **`Incident:`** line were driven by a
real, diagnosed, reproduced bug. The label exists so a reader can quickly
tell "this was found broken and fixed" apart from "this was designed this
way on purpose, nothing was ever wrong." Not every decision has an incident
behind it, and that is expected: pure design reasoning is just as valid a
reason to document something here.

---

## Table of Contents

- [`EntityModal`/`TaskModal` compound vs. `ProjectModal` single-block](#entitymodaltaskmodal-compound-vs-projectmodal-single-block)
- [Status field availability at creation time (`CreateTaskInput`/`CreateProjectInput` vs. the live forms)](#status-field-availability-at-creation-time-createtaskinputcreateprojectinput-vs-the-live-forms)
- [Clearing the React Query cache on `(auth)`/`(dashboard)` layout mount, not just on `onAuthStateChange`](#clearing-the-react-query-cache-on-authdashboard-layout-mount-not-just-on-onauthstatechange)
- [Bypassing fetch caching in both Supabase clients (`cache: "no-store"`)](#bypassing-fetch-caching-in-both-supabase-clients-cache-no-store)
- [`useCurrentUser()`'s finite `staleTime`, not `Infinity`](#usecurrentusers-finite-staletime-not-infinity)
- [Triggering the success-banner side effect imperatively, not via `useEffect` on a boolean](#triggering-the-success-banner-side-effect-imperatively-not-via-useeffect-on-a-boolean)
- [Keeping `avatars: anyone can view` despite Supabase's own "clients can list all files" warning](#keeping-avatars-anyone-can-view-despite-supabases-own-clients-can-list-all-files-warning)
- [No memoization on `ProjectSlideOver`'s `openForEdit`/`openForCreate`](#no-memoization-on-projectslideovers-openforeditopenforcreate)
- [Placing `aria-busy` and the live region on the loading group, not on `Skeleton` itself](#placing-aria-busy-and-the-live-region-on-the-loading-group-not-on-skeleton-itself)
- [Explicit `.focus()` on the remove-member Cancel button, not browser-default behavior](#explicit-focus-on-the-remove-member-cancel-button-not-browser-default-behavior)
- [Zinc over slate, and a separate accent color from the warning color](#zinc-over-slate-and-a-separate-accent-color-from-the-warning-color)
- [URL-derived project selection instead of `ProjectContext`](#url-derived-project-selection-instead-of-projectcontext)
- [Velocity Status counts tasks due soon, not projects](#velocity-status-counts-tasks-due-soon-not-projects)
- [Upcoming Tasks project-selection algorithm](#upcoming-tasks-project-selection-algorithm)
- [Three-tier error boundary structure, not root-only or global-error](#three-tier-error-boundary-structure-not-root-only-or-global-error)
- [Deferring `app/global-error.tsx`](#deferring-appglobal-errortsx)
- [Scoped `console.error` exception in error boundaries](#scoped-consoleerror-exception-in-error-boundaries)
- [Branch workflow: PR-based merges from Production Readiness onward](#branch-workflow-pr-based-merges-from-production-readiness-onward)
- [Playwright for `scripts/get-auth-cookie.ts`, not Puppeteer or Lighthouse's User Flow API](#playwright-for-scriptsget-auth-cookiets-not-puppeteer-or-lighthouses-user-flow-api)
- [Moving `AuthListenerProvider` from root `app/layout.tsx` into `app/(dashboard)/layout.tsx`](#moving-authlistenerprovider-from-root-applayouttsx-into-appdashboardlayouttsx)
- [Distinguishing `sessionExpired` from `forbidden` on failed Postgrest writes](#distinguishing-sessionexpired-from-forbidden-on-failed-postgrest-writes)
- [`isDirty` is sticky, not re-derived per keystroke, in TaskModal/ProjectModal's edit-mode Save disabling](#isdirty-is-sticky-not-re-derived-per-keystroke-in-taskmodalprojectmodals-edit-mode-save-disabling)
- [Stripping `configSettings.extraHeaders` from committed Lighthouse reports](#stripping-configsettingsextraheaders-from-committed-lighthouse-reports)
- [Scoping `QueryProvider` to `app/(dashboard)/layout.tsx`, deleting `ClearQueryCacheOnMount.tsx`](#scoping-queryprovider-to-appdashboardlayouttsx-deleting-clearquerycacheonmounttsx)
- [Read-side error interpretation is a distinct, narrower function than the write side](#read-side-error-interpretation-is-a-distinct-narrower-function-than-the-write-side)
- [Reverted: `TaskList`'s empty-result membership recheck](#reverted-tasklists-empty-result-membership-recheck)
- [Replacing --extra-headers with a persistent authenticated context](#replacing---extra-headers-with-a-persistent-authenticated-context)
- [Blanket `robots.txt` disallow, no per-route rules](#blanket-robotstxt-disallow-no-per-route-rules)
- [Security headers: `unsafe-inline` for `script-src`, no HSTS preload, strict COOP](#security-headers-unsafe-inline-for-script-src-no-hsts-preload-strict-coop)

---

## `EntityModal`/`TaskModal` compound vs. `ProjectModal` single-block

**Decision:** `TaskModal` is a compound component (`.Header`, `.Title`,
`.CloseButton`, `.Body`, `.Field`, `.Footer`, `.FooterActions`,
`.CancelButton`, `.SubmitButton`, composed via `Object.assign`).
`ProjectModal` is not. It is a single component taking fixed props
(`name`, `description`, `dueDate`, `status`, `editingProject`), with no
caller-driven composition at all.

**Why they're different on purpose:**

The compound pattern (the lineage this codebase draws from: Radix,
Reach UI, shadcn) exists to solve one specific problem: _unknown, variable
composition_, where a consumer might need to nest arbitrary content inside
a shared shell in ways the component author cannot fully predict up front.

`TaskModal` is compound because it predates the later `EntityModal`
extraction. Its existing call site in `ProjectSlideOver.tsx` already used
the compound shape, and preserving that public API meant the refactor
(extracting the generic shell into `EntityModal`) did not require touching
already-working, already-tested consumer code. It is **not** compound
because task editing genuinely requires that flexibility.

`ProjectModal` was built after `EntityModal` already existed, with no
equivalent legacy shape to preserve. Its fields are fixed and no caller
needs to compose it differently. Applying the compound pattern here anyway
would mean reaching for machinery designed to solve a problem that does not
exist in this case. That would demonstrate not understanding _why_ the
compound pattern exists, not consistency for its own sake.

**Takeaway for future modals:** default to a single-block component. Only
reach for the compound pattern when a component genuinely needs
caller-driven, variable composition, not because a similar-looking
component elsewhere happens to be compound.

---

## Status field availability at creation time (`CreateTaskInput`/`CreateProjectInput` vs. the live forms)

**Decision:** `lib/entityFactory.ts`'s `createTask`/`createProject`
functions deliberately exclude `status` from their input types. The
factory always defaults to `todo`/`active`, with status never settable at
call time. `TaskModal.StatusField` and `ProjectModal`'s status field, by
contrast, **do** let a user pick a status at creation time (still defaulting
to `todo`/`active`, but overridable before submit).

**Why these aren't in conflict, even though they look like it:**

These are two independent, separately-decided things that happen to share
a similar shape (task/project creation) but serve different purposes.

`entityFactory.ts` was built early, before real Supabase-backed forms
existed. It is a local/offline entity-construction utility (still used only
by its own test suite; not called anywhere in the live app's data flow as
of this writing). Its no-status-at-creation rule was a deliberate
simplification for that context.

The live `TaskModal`/`ProjectModal` forms were designed later, independently,
against what a real user of a project-management tool would actually expect,
and letting someone set a task's status at creation time (e.g. logging a
task that's already in progress) is standard, expected behavior in every
comparable tool.

**Takeaway:** don't treat `entityFactory.ts`'s input-type constraint as a
rule the live forms are violating. If these are ever intentionally unified
(e.g. by retiring `entityFactory.ts` or extending its input types), that is
a deliberate product decision to make explicitly, not a discovered bug to
silently "fix" by removing the status field from either surface.

---

## Clearing the React Query cache on `(auth)`/`(dashboard)` layout mount, not just on `onAuthStateChange`

**Decision:** `components/ClearQueryCacheOnMount.tsx`, a small Client
Component that calls `queryClient.clear()` once on mount and returns `null`,
is rendered inside both `app/(auth)/layout.tsx` and
`app/(dashboard)/layout.tsx`. This is the **primary** mechanism preventing
cross-user cache leaks (one user's cached `projects`/`tasks`/`members`/profile
data rendering for a different, newly-logged-in user in the same tab).
`providers/AuthListenerProvider.tsx`'s `onAuthStateChange`-based `clear()` is
kept as a secondary path, not removed, but is no longer the thing this
correctness property actually depends on, and per the second incident
below, is now deliberately narrower than it once was.

**Why `onAuthStateChange` wasn't sufficient. Incident: confirmed via manual
two-browser testing.** Atlas's login/signup/logout all run as Server
Actions against the _server_ Supabase client. The _browser_ client's
`onAuthStateChange`, which `AuthListenerProvider` listens on, is never
itself told a server-side sign-in/sign-out happened. This is a confirmed,
Supabase-team-acknowledged limitation (supabase-js#1618), not a bug in
Atlas's usage of it, and explains the intermittent behavior observed in
manual two-browser testing before this fix (logging out User A and
immediately logging in as User B, same tab, sometimes showed User A's stale
data and sometimes didn't, depending on incidental timing).

**Why layout mount is a reliable substitute:** Next.js fully remounts a
nested layout on every crossing between separate route groups, and does
_not_ remount it on navigation within the same group. Since `(auth)` and
`(dashboard)` are sibling nested layouts under the single root
`app/layout.tsx` (which is what makes this a client-side transition rather
than a hard page reload), mounting `ClearQueryCacheOnMount` in both is a
deterministic "a real transition just occurred" signal, independent of
whichever Supabase client happened to run the auth call.

**A second, separate incident narrowed `AuthListenerProvider` further, to
`SIGNED_OUT` only. Incident: confirmed via React Query Devtools.** An
earlier version of `AuthListenerProvider` also cleared on `SIGNED_IN`. This
caused a real, reproduced bug: `onAuthStateChange` fires `SIGNED_IN` on
_any_ fresh client initialization that finds an existing valid session,
including an ordinary page refresh by the same, still-logged-in user, not
just a genuine new login. Clearing on that event raced against every other
query mounting in the same commit, orphaning their in-flight fetches. This
produced a stuck-loading-skeleton bug specifically on hard refresh (not on
normal navigation), confirmed by React Query Devtools showing zero
registered queries at the exact moment the Network tab showed a real,
already-resolved `200` response for the same request. `SIGNED_IN` was
removed from the listener entirely rather than patched, since the false
positive is inherent to what the event means, not fixable by better timing.

**The assumption this correctness depends on. Read before adding any new
auth-adjacent feature:** this only works because, in Atlas's current
single-account auth model, _every_ path from one user's identity to a
different one necessarily crosses the `(auth)` route group boundary (you
cannot reach a different user's dashboard session without passing through
`/login` first). If a future feature ever allowed switching identity
_without_ crossing that boundary, for example an account-switcher or
impersonation feature that swaps the active user via an API call while
staying on a dashboard route, this mechanism would **not** fire, and the
cache leak this fix closes would reopen for that new code path. Any such
feature must either trigger `queryClient.clear()` directly itself, or be
designed to route through a layout boundary the same way login/logout
already do.

---

## Bypassing fetch caching in both Supabase clients (`cache: "no-store"`)

**Decision:** Both `lib/supabase/client.ts` and `lib/supabase/server.ts`
override the `fetch` implementation passed to their Supabase client with
`cache: "no-store"`.

**Why (browser client). Incident: confirmed via Network tab evidence.**
PostgREST responses carry `Cache-Control: public, max-age=600` with no
`Authorization` in `Vary`, so the browser's HTTP disk cache treats identical
request URLs as interchangeable regardless of which user's bearer token
made the request. Confirmed via manual two-user testing: after logging out
User A and logging in as User B, the same URL was served from disk cache
with User A's data, visible directly in the Network tab as `200 OK (from
disk cache)` for a request that should have carried User B's session.

**Why (server client). Preventive, not independently confirmed.** The
browser disk cache doesn't apply server-side, but Next.js patches the
global `fetch` to add its own Data Cache layer by default in Server
Components, a structurally similar leak risk. This specific risk was not
independently reproduced server-side; the fix was applied anyway for
consistency and defense-in-depth, since this was the second cross-user
caching leak found in one session and "not yet observed" wasn't treated as
sufficient grounds to leave the server client unfixed while the browser
client was fixed.

---

## `useCurrentUser()`'s finite `staleTime`, not `Infinity`

**Decision:** `useCurrentUser()` uses a five-minute `staleTime`, not
`Infinity`, even though `getClaims()` is cheap enough that cost isn't the
constraint.

**Why:** `getClaims()` verifies the JWT signature locally via WebCrypto/
JWKS against Atlas's asymmetric ECC P-256 setup, no network call, so a
short staleTime costs little. The actual reason against `Infinity` is
correctness, not cost: explicit invalidation is the primary mechanism
keeping this query current, but this project has already found one real,
confirmed bug where an invalidation call was missed entirely
(`taskCountsByProject` after a task edit). A finite staleTime is a
deliberate self-correction backstop against that same failure class,
human error in remembering to invalidate, not a substitute for
invalidation. Do not change this to `Infinity` without reopening the
decision, since doing so removes that backstop entirely.


---


## Triggering the success-banner side effect imperatively, not via `useEffect` on a boolean

**Decision:** `ProfileForm.tsx`'s `triggerSuccessBanner()` is called directly
from the save action's success branch, not from a `useEffect` watching
`state.success`.

**Why, caught during implementation/code review, not an incident.** This
was identified by reasoning through `useActionState`'s and `useEffect`'s
actual semantics before shipping, not by observing broken behavior in a
running app: `useActionState` returns a new state object on every dispatch,
but `state.success` itself can be `true` on two consecutive successful
saves. React's effect dependency comparison (`Object.is`) sees `true to
true` as no change, so an effect keyed on that boolean wouldn't re-fire on
the second save, and the dismiss timer wouldn't reset. Calling the trigger
imperatively, inside the action itself, fires on every dispatch regardless
of whether the resulting value changed. This is the correct behavior for
"react to an event having happened," which a value-comparison-based effect
can't reliably express.

---

## Keeping `avatars: anyone can view` despite Supabase's own "clients can list all files" warning

**Decision:** The Storage SELECT policy on the `avatars` bucket is kept as
originally written, despite Supabase's dashboard flagging that it allows
bucket-wide listing/enumeration.

**Why, confirmed by directly testing both configurations.** Confirmed (via
a Supabase maintainer's own answer, and by directly testing both with and
without the policy) that `list` and single-file access share the same RLS
SELECT policy. There is no way to grant one without the other. Removing
the policy was tested and found to break `upsert: true` re-uploads
(Postgres/the client needs read access to determine whether a row already
exists before deciding insert vs. overwrite), confirmed by attempting a
second upload with the policy removed and observing a `403`. The actual
exposure from keeping it is narrow: avatar storage paths are
`{userId}/avatar.ext`, so the only information enumerable is which user IDs
have uploaded a photo, not any other data. Accepted as a documented
tradeoff, same reasoning as `lookup_user_id_by_email`'s deliberate scope
decision.

---

## No memoization on `ProjectSlideOver`'s `openForEdit`/`openForCreate`

**Decision:** `openForEdit` and `openForCreate` are defined as plain inline
functions in `ProjectSlideOver`'s component body, not wrapped in
`useCallback`, even though this causes `TaskList` to re-render on every
modal open and close.

**Why, measured, not assumed.** Profiled with React DevTools Profiler
during a modal open and close cycle. `TaskList` re-renders twice per cycle,
once per state change, because `openForEdit`'s reference changes on every
render and `TaskList` receives it as `onTaskSelect`. Measured cost: roughly
0.8ms per extra commit. `openForCreate` also gets a new reference every
render but is never passed to a child component, so it causes no
downstream re-renders at all. `useCallback` would eliminate the two
`TaskList` re-renders, but at this render budget the memoization overhead
(maintaining a dependency array, the comparison cost itself) likely exceeds
the roughly 1.6ms saved per cycle. Revisit if `TaskList` grows to render
50 or more items, or if profiling in a future session reveals a real
regression. This finding predates the delete/add-member/remove-member
features later added to `ProjectSlideOver`; the reference-identity behavior
and its cost are structurally unchanged by that growth, since none of it
touches `openForEdit` itself.

---

## Placing `aria-busy` and the live region on the loading group, not on `Skeleton` itself

**Decision:** `Skeleton.tsx` carries `aria-busy={true}` on every instance,
but `role="status"`/`aria-live="polite"` are placed on the _container_
wrapping each group of skeletons, `ProjectList.tsx`'s loading grid,
`TaskList.tsx`'s loading list, and `Header.tsx`'s loading branch
specifically, not on `Skeleton` itself and not on `Header`'s loaded-content
branch.

**Why:** Putting the live region on `Skeleton` directly would cause
redundant, spammy announcements when several skeletons render together,
for example the project grid rendering six placeholder cards at once would
announce six times instead of once. Grouping the live region at the
container level means each loading state announces exactly once,
regardless of how many individual skeleton elements it contains. Scoping
it to `Header`'s loading branch only, not its loaded branch, avoids a
live region lingering in the DOM and causing a spurious announcement after
the real profile data has already loaded.

---

## Explicit `.focus()` on the remove-member Cancel button, not browser-default behavior

**Decision:** When a user clicks the trash icon on a project member row, it
is replaced in place by a Cancel and Confirm icon-button pair. A `useRef`
plus a `useEffect` keyed on `confirmingMemberId` explicitly calls `.focus()`
on the Cancel button whenever this confirm state opens, for any row.

**Why:** The initial version left this to browser-default focus-reversion
behavior. It happened to work, in testing, only because of an incidental
`document.body` fallback, not because any browser reliably guarantees that
behavior across implementations. Explicit management removes that
uncertainty entirely, and Cancel, not Confirm, is the button that receives
focus by design, since it is the safe, non-destructive action, matching
standard destructive-action UX conventions such as browser "leave page"
dialogs defaulting focus away from the destructive choice.

---

## Zinc over slate, and a separate accent color from the warning color

**Decision:** Atlas's design tokens use the Zinc gray scale, not Slate, and
define `--color-accent` (`#ea8c00`, golden-orange) as a distinct token from
`--color-warning` (`#f97316`), even though both are visually in the same
orange family.

**Why:** Zinc reads warmer than Slate, which avoids the sterile, overly
clinical feel common in productivity dashboards, and better complements a
warm accent color. Keeping the brand accent and the system warning color as
two separate tokens, despite their visual similarity, prevents a real
category of confusion: a warning-colored element should never be
mistakable for a branded, interactive one, and vice versa. A future
palette change to either color should preserve this separation rather than
consolidating them for token-count convenience.

---

## URL-derived project selection instead of `ProjectContext`

**Decision:** `ProjectList.tsx`'s slide-over selection is read directly from
`useSearchParams().get("project")` on `/projects?project=<id>`, not from a
Context provider. `providers/ProjectContext.tsx` was deleted, along with
`ProjectProvider` in `app/layout.tsx`, since selection was its only
responsibility. Opening a project from a card, and closing the slide-over,
both call `router.replace` (same-route selection change, not a new
destination — keeps one history entry for "being on /projects"). Navigating
to a project from the dashboard's Recent Projects section calls `router.push`
instead, since that's a real cross-route navigation and Back should return to
the dashboard, not skip past it.

**Why:** Context state and the URL were two independent sources of truth for
"which project is selected." Context persists across client-side navigation
and was cleared only by the slide-over's explicit close, so a user who opened
a project, navigated away without closing it, and later returned to
`/projects` would see that same project's slide-over silently reopen,
unrelated to anything on that visit. Making the URL the sole source of truth
removes the second copy of the state entirely rather than patching the
symptom, and as a side effect makes an open project genuinely shareable and
bookmarkable. `ProjectList` calling `useSearchParams()` makes it depend on
`/projects` at build time; per Next's docs, a statically-prerendered page
calling `useSearchParams` from a Client Component must be wrapped in
`<Suspense>` or the production build fails — `app/(dashboard)/projects/page.tsx`
wraps `<ProjectList />` in `<Suspense fallback={null}>` for this reason. The
`null` fallback is invisible in practice since all of `ProjectList`'s real
content is already fetched client-side via React Query with its own loading
skeletons, independent of prerendering.

---

## Velocity Status counts tasks due soon, not projects

**Decision:** `VelocityStatus` aggregates not-done tasks with a due date
in the next 7 days, across all projects, via a dedicated
`useDueSoonTaskCount` query, not a count of projects with a near due date.

**Why:** "Velocity" is an Agile/Scrum term for task/story throughput, not
project-level deadlines. A project-level count would be measuring
something the card's own title doesn't describe, and is also a blunter
signal: a project's own due date can be weeks out while it has tasks due
tomorrow, or the reverse. Task-level counting required a new query (no
existing hook returned cross-project task due dates), a deliberate scope
increase over the cheaper project-level alternative, accepted for domain
accuracy.

---

## Upcoming Tasks project-selection algorithm

**Decision:** The dashboard's Upcoming Tasks panel picks one project to
show tasks from: sort by soonest `dueDate` first (nulls last), tiebreak
by most-recently-updated among null-due-date projects, then walk that
order and select the first project with `taskCountsByProject[id].total > 0`.

**Why:** A project with the soonest due date but zero tasks has nothing
useful to show under a panel titled "Upcoming Tasks." Filtering by
existing `taskCountsByProject` (already fetched for `ProjectStats`, no
new query) before selection avoids that dead-end. Done-only tasks are
excluded from `useDueSoonTaskCount`'s count for the same honesty reason
`ProjectStats`'s Overdue figure excludes completed projects.

---

## Three-tier error boundary structure, not root-only or global-error

**Decision:** Atlas has three `error.tsx` files, not one: `app/(dashboard)/error.tsx`,
`app/(auth)/error.tsx`, and root `app/error.tsx`, plus `app/not-found.tsx`.
`app/global-error.tsx` is deliberately not built; see the separate entry below.

**Why three, not a single root-level boundary.** `error.js`'s documented
semantics: it wraps a route segment's nested children (nested layouts, pages)
but never the `layout.js` sitting in its own segment. A single root-only
`app/error.tsx` would sit above `(dashboard)/layout.tsx` and `(auth)/layout.tsx`
entirely, blanking out Sidebar/Header (or the auth wordmark/card) on every
error, leaving the user with no way to navigate elsewhere except "try again."
Atlas already has exactly two route groups with meaningfully different
persistent chrome worth preserving, so `(dashboard)/error.tsx` and
`(auth)/error.tsx` each catch errors in their own group's pages while their
own layout (and its Sidebar/Header, or wordmark/card) stays mounted.

**Why a third, root-level `app/error.tsx` is also needed, not just the two
per-group ones.** The same "doesn't wrap its own segment's layout" rule means
the two per-group boundaries cannot catch a throw inside `(dashboard)/layout.tsx`
or `(auth)/layout.tsx` themselves, for example a bug in `Sidebar.tsx` or
`Header.tsx`. Root `app/error.tsx` sits in the root segment alongside root
`app/layout.tsx`; by the identical rule applied one level up, it does not wrap
root `app/layout.tsx` itself (that stays global-error's territory), but it
does wrap `(dashboard)/layout.tsx` and `(auth)/layout.tsx` as nested children
of the root segment, so it catches exactly that gap. It renders no persistent
chrome of its own (not even a styled "safe" version) since it cannot assume
Sidebar/Header are safe to render, given they may be what's throwing.

**Headings:** `(dashboard)/error.tsx` uses `<h2>`, not `<h1>`, because
`Header.tsx` unconditionally renders an `<h1>{pageTitle}</h1>` in the
persistent chrome that stays mounted above it. `(auth)/error.tsx` and root
`app/error.tsx` use `<h1>`, since neither has a competing heading in their
persisting chrome (the auth wordmark is a `<span>`, and root `app/error.tsx`
renders no chrome at all).

**Why none of these catch Atlas's normal error paths.** Failed
mutations/fetches already surface through structured action state
(`useActionState`) or React Query error states, handled declaratively, not by
`throw`. These boundaries only fire for genuine unexpected render-time bugs,
so their copy says "Try again" without implying recovery from a data error it
can't actually resolve.

---

## Deferring `app/global-error.tsx`

**Decision:** `app/global-error.tsx` is not built. A throw inside root
`app/layout.tsx` itself (its font setup, theme-flash script, or the three
providers it mounts) currently falls through to Next's default, unstyled
error UI.

**Why.** `global-error.tsx` must define its own `<html>`/`<body>` and does not
inherit Atlas's global styles, fonts, or theme — building one properly means
hand-duplicating the Inter font setup and the theme-flash-prevention script,
real cost against a genuinely low-risk surface, especially now that root
`app/error.tsx` (see the entry above) already catches everything nested below
root layout, including a throw in `Sidebar.tsx`/`Header.tsx`. What's left
uncovered is narrowly root `app/layout.tsx`'s own minimal code. Tracked in
`docs/roadmap.md` rather than silently dropped.

---

## Scoped `console.error` exception in error boundaries

**Decision:** Every `error.tsx` calls `console.error(error)` inside a
`useEffect` keyed on `[error]`, despite root `CLAUDE.md`'s no-`console.log`
rule.

**Why.** Atlas has no error-reporting service (Sentry or similar) yet, and
Next's own documented convention for `error.tsx` is to log the caught error
for observability, normally the only signal available in production once the
fallback UI is showing. This is a narrow, explicitly-scoped exception:
`console.error` only, only inside `error.tsx` boundaries logging a genuinely
caught render exception, never `console.log`, and not a general carve-out
from the forbidden-patterns rule elsewhere in the codebase. Revisit if a real
error-reporting service is ever integrated.

---

## Branch workflow: PR-based merges from Production Readiness onward

**Why:** Earlier work merged branches to `develop` locally, a solo,
low-ceremony shortcut with no reviewer involved. From Production
Readiness onward, branches are pushed and merged via GitHub PRs
instead, still solo, no second reviewer. This is to display the 
ability to work in small, review-ready increments (real branch
boundaries, a written PR description explaining what and why)
Earlier history stays as local merges, not retrofitted; this is 
forward-only.

---

## Playwright for `scripts/get-auth-cookie.ts`, not Puppeteer or Lighthouse's User Flow API

**Decision:** `scripts/get-auth-cookie.ts` uses Playwright to log into Atlas
and capture a real cookie set for Lighthouse's `--extra-headers`, replacing
a manual DevTools copy-paste approach.

**Why. Incident: confirmed via a Lighthouse baseline run, then a real
login.** `--extra-headers` injects a raw header onto requests; it never
touches the browser's actual cookie store. SSR saw the session, client-side
code never did, producing a hydration error and REST 401s on every
authenticated route, both absent once logged in normally. `docs/testing.md`
already commits to Playwright for E2E, so it's used here too rather than
adding Puppeteer or the User Flow API for the same job. `context.cookies()`
reads the real post-login cookie jar, `HttpOnly` and any chunked
`sb-<ref>-auth-token.0/.1/.2` included.

**Not scope creep.** Close to, likely reusable as, the login fixture the
future `tests/e2e/` suite will need anyway.

---

## Moving `AuthListenerProvider` from root `app/layout.tsx` into `app/(dashboard)/layout.tsx`

**Decision:** `AuthListenerProvider` now mounts only in
`(dashboard)/layout.tsx`. `QueryProvider` (root) and
`ClearQueryCacheOnMount` (both layouts) are unchanged.

**Why:** Confirmed via the Turbopack bundle analyzer that this provider
was the only thing pulling `@supabase/*` into `(auth)`'s client bundle;
no `(auth)` component depends on it for anything else. Safe against both
incidents in the cache-clearing entry above: `ClearQueryCacheOnMount`,
not this listener, is the primary cache-leak defense, and every identity
change still crosses the `(auth)`/`(dashboard)` boundary regardless of
where this mounts. A stale tab idle on `/login` has nothing to leak,
`(auth)` routes render none of the cached data that entry protects.

---

## Distinguishing `sessionExpired` from `forbidden` on failed Postgrest writes

**Decision:** `lib/supabase/errors.ts`'s `interpretSupabaseWriteError` is the
only place client-direct mutations (`profileActions.ts`, `taskActions.ts`,
`projectActions.ts`) translate a failed write into user-facing state. Never
`error.message` directly.

**Why:** Incident: reproduced via Network tab, a stale/dead session (cleared
by sign-out in another tab) sent a write as `anon`; Postgres's raw `42501`
message reached the UI verbatim. `42501` (insufficient privilege) alone
doesn't distinguish that from a live, correctly-authenticated user
legitimately denied by RLS (e.g. a collaborator calling an owner-only
action) — only `PGRST301` (expired JWT) is unambiguous. For `42501`, the
helper calls `getClaims()` to tell the two apart: no session →
`sessionExpired`, live session → `forbidden`. A proactive `getClaims()`
check before the write (used in `createProjectAction`'s owner-id lookup) is
a fast-fail convenience only, per `useCurrentUser`'s finite-`staleTime`
entry above; the code-based check after the write is the actual fix.
`components/ActionErrorMessage.tsx` renders the result everywhere (a login
link only for `sessionExpired`), replacing several duplicated error-banner call sites​

---

## `isDirty` is sticky, not re-derived per keystroke, in TaskModal/ProjectModal's edit-mode Save disabling

**Decision:** `ProjectSlideOver.tsx`'s task fields and `ProjectModal.tsx`'s
own fields track a single `isDirty` boolean via per-field `onChange`, set to
`true` on the first mismatch against the original entity and never
re-checked against the other fields afterward — editing a field back to its
original value does not re-disable Save.

**Why:** A fully accurate version means either controlled state on every
field (against the project default of uncontrolled native inputs) or
re-deriving from a fresh `FormData` read on every keystroke. Both are more
complexity than a Save-button gate warrants.

---

## Stripping `configSettings.extraHeaders` from committed Lighthouse reports

**Decision:** `docs/lighthouse/baseline-2026-08-06/`'s six authenticated
`.report.json` files, and the same six `.report.html` viewer files (which
embed an identical inline JSON copy of the run data), have
`configSettings.extraHeaders` set to `null`, matching what unauthenticated
reports already show.

**Why:** Lighthouse embeds `--extra-headers` verbatim into every report it
writes, JSON and HTML alike; the `Cookie` value used to authenticate these
runs was a live Supabase session (rotated after discovery, dead at time of
fix). Any future authenticated Lighthouse run must strip
`configSettings.extraHeaders` from **both** output formats before
committing, not just the JSON.

---

## Scoping `QueryProvider` to `app/(dashboard)/layout.tsx`, deleting `ClearQueryCacheOnMount.tsx`

**Decision:** `QueryProvider` now mounts only in `app/(dashboard)/layout.tsx`,
wrapping `AuthListenerProvider`, not in root `app/layout.tsx`.
`components/ClearQueryCacheOnMount.tsx` is deleted; it is no longer
rendered in either layout.

**Supersedes the cache-clearing entry above ("Clearing the React Query
cache on `(auth)`/`(dashboard)` layout mount, not just on
`onAuthStateChange`"):** that entry's incident history remains accurate
and unchanged, both incidents happened exactly as recorded. Only the
prevention mechanism changes, from an explicit `ClearQueryCacheOnMount`
call in both layouts to the scoped provider's own mount/unmount lifecycle,
described below.

**Why:** `QueryProvider` was mounted at root even though only `(dashboard)`
routes ever call a React Query hook, confirmed by grepping every
`useQuery`/`useMutation`/`useQueryClient` call site in the codebase. That
gave `(auth)` routes a query client with no reason to exist there, which is
exactly why `ClearQueryCacheOnMount` had to run in both layouts, defending
a client `(auth)` never needed. Scoping the provider to where it's used
makes that defensive clearing unnecessary, not redundant: a route never
given a client can't leak stale data from one.

**Why this is a stronger cache-leak defense, not just a smaller one:**
`QueryProvider` builds its `QueryClient` with a `useState` lazy
initializer, one instance per mount, not a module-level singleton.
`(dashboard)/layout.tsx` fully unmounts on every crossing to `(auth)`, the
same route-group-crossing guarantee the cache-clearing entry above already
relies on, so each `(auth)` → `(dashboard)` crossing constructs a
genuinely new client. Unlike the `.clear()` call it replaces, which empties
an existing client while the same object and its subscribers keep living,
an unmounted client has no subscribers left, so a late-resolving fetch
from the previous session can't write a stale entry into it.

**Measured effect, secondary to the above:** real but partial improvement
to the LCP finding this targeted. See `docs/findings.md` for the full
before/after numbers.

---

## Read-side error interpretation is a distinct, narrower function than the write side

**Decision:** `lib/supabase/errors.ts`'s `interpretSupabaseReadError` only
distinguishes `sessionExpired` (`PGRST301`) from one generic message:
no `forbidden` category, and it never surfaces `error.message` raw.

**Why:** This schema's default-deny RLS denies reads by filtering rows out,
not by throwing, so a `42501` on a `SELECT` means a missing `GRANT`, never a
live user legitimately denied (the case `interpretSupabaseWriteError`'s
`forbidden` exists for). Reads can also fail with no Postgrest response at
all (network/timeout, no `.code`), a shape writes never hit. With no
actionable "forbidden" case and no safe specific message to show, the
function is synchronous (no `getClaims()` follow-up) and collapses
everything but session expiry into one message. `SupabaseReadError` (same
file) carries the result as a thrown `Error` subclass so hooks interpret
once, at the `queryFn`, not at every consuming component.

---

## Reverted: `TaskList`'s empty-result membership recheck

**Decision:** Built `hooks/useIsProjectMember.ts` and a distinct
"you no longer have access" state for `TaskList`'s empty-result branch,
to catch membership revoked in the gap after `useProjects()` last fetched
this project. Reconsidered and reverted; `TaskList` is back to one plain
"No tasks yet." message, and the hook is deleted, not left as dead code.

**Why:** `useTasks(projectId)` only ever runs for a project `useProjects()`
already returned, already RLS-filtered to the user's actual memberships as
of that fetch. An empty task result isn't ambiguous at read time: RLS
denies by filtering rows, membership or not, so there's no second case to
distinguish in that one query. The real, narrower situation is a timing
gap: membership can change between `useProjects()`'s fetch and this
render. Even so, the extra RPC fired on every genuinely empty project, for
every user: a permanent cost for a narrow, transient window.
`ProjectSlideOver`'s existing `selectedProject = projects.find(...) ?? null`
pattern already auto-closes the slide-over once a revoked user's next
`useProjects()` refetch filters the project out, and any mutation attempt
is independently blocked by the write-side forbidden handling already
shipped. Nothing was left unprotected by removing it.

---

## Replacing --extra-headers with a persistent authenticated context

**Decision:** scripts/authenticated-lighthouse.ts launches a persistent
Chromium context with a debug port, logs in, then runs
playwright-lighthouse's playAudit against that same instance, no
cookie hand-off to a separately launched process.

**Why:** --extra-headers never populated a browser's actual cookie
storage, so every prior authenticated measurement was unverified.
See docs/findings.md.

**Why playwright-lighthouse, not hand-rolled:** three prior incidents
this phase from underestimating browser-tooling glue code. A
maintained library tracking Lighthouse/Playwright's own churn is the
right call here, confirmed against the installed versions before
adopting it.

---

## Blanket `robots.txt` disallow, no per-route rules

**Decision:** `app/robots.ts` returns
`{ rules: { userAgent: "*", disallow: "/" } }`, no `sitemap` field.
`/robots.txt` is exempted from `proxy.ts`'s auth redirect through
`config.matcher`'s negative-lookahead pattern, alongside `favicon.ico`.

**Why blanket disallow, not a per-route allow/disallow list:** every
route in Atlas is either an auth page (`/login`, `/signup`) with nothing
meant for indexing, or auth-gated (`/`, `/projects`, `/profile`) with
nothing a crawler could render without a session anyway. A per-route
rules list would need upkeep on every future route addition for a
benefit that doesn't exist, no public marketing content is planned. No
`sitemap` field for the same reason, nothing to list.

---

## Security headers: `unsafe-inline` for `script-src`, no HSTS preload, strict COOP

**Decision:** `next.config.ts`'s CSP uses
`script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` in
development only), not a nonce or hash. `Strict-Transport-Security`
ships without `preload`. `Cross-Origin-Opener-Policy` is set to the
strict `same-origin`, not `same-origin-allow-popups`.

**Why `unsafe-inline`, not a nonce.** CSP's defense against injected
inline scripts is given up here deliberately. The
nonce alternative was rejected because Next.js requires dynamic
rendering on every nonced route (confirmed in Next's own CSP guide),
conflicting directly with `docs/findings.md`'s open LCP render-delay
finding. Partial Prerendering (Next 16's `cacheComponents` flag) was
investigated as a possible middle ground and confirmed incompatible
with nonce-based CSP, per Next's own docs: static shell scripts have
no nonce to carry regardless of what streams in dynamically.

**Why the current risk is narrow.** A full sink audit found exactly
one `dangerouslySetInnerHTML` in the codebase, `app/layout.tsx`'s
static, developer-authored theme-flash script: no other instance, no
raw `innerHTML` assignment, no `document.write`. Everything else
renders through React's default JSX escaping. `'unsafe-inline'`
widens what an XSS payload could do if one ever landed, but nothing
in the current codebase gives an attacker a way to get arbitrary
content into that script or elsewhere.

**Reopen this decision if:** a future feature ever renders
user-controlled content without React's normal escaping, for
example a `dangerouslySetInnerHTML` fed by request data, user input,
or an external API response. That is the point where
`'unsafe-inline'` stops being a narrow, audited exception and starts
being a real hole.

**Why HSTS omits preload:** browser preload-list submission is
effectively irreversible for a long time once accepted, sites stay
hard to remove even after disabling HSTS elsewhere. That deserves
its own deliberate decision, not a default bundled into the general
header rollout. Deferred, not rejected.

**Why COOP uses strict same-origin:** confirmed, by grepping the
entire codebase, that no cross-origin popup or window-based flow
exists anywhere, auth or otherwise: no `window.open`, no
`postMessage`, no `window.opener`, no OAuth popup sign-in. Atlas's
auth is entirely cookie-based via `@supabase/ssr`. Nothing depends
on `window.opener` access, so the strict value has no downside to
weigh against.