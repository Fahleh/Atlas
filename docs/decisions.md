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
