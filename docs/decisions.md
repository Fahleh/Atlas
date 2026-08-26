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
- [Zero-exception style-src-attr: class refactors, a generated hash allowlist, and native `<progress>`](#zero-exception-style-src-attr-class-refactors-a-generated-hash-allowlist-and-native-progress)
- [Trusted Types and style-src: production-only enforcement](#trusted-types-and-style-src-production-only-enforcement)
- [Splitting `--color-accent` into a background token and a text token, and fixing the two gray text tokens alongside it](#splitting-color-accent-into-a-background-token-and-a-text-token-and-fixing-the-two-gray-text-tokens-alongside-it)
- [`ProjectCard` moved from a `role="button"` div to a real `<Link>`](#projectcard-moved-from-a-rolebutton-div-to-a-real-link)
- [`npm test` runs with `--forceExit`: MSW leaves an open handle for any FormData request body](#npm-test-runs-with---forceexit-msw-leaves-an-open-handle-for-any-formdata-request-body)
- [Deriving SUPABASE_ORIGIN from env in dev only](#deriving-supabase_origin-from-env-in-dev-only)
- [Removing `.env.development.local`](#removing-envdevelopmentlocal)
- [Matching `supabase/config.toml`'s `site_url` to `localhost`, not `127.0.0.1`](#matching-supabaseconfigtomls-site_url-to-localhost-not-127001)
- [Separate Route Handlers for signup confirmation and password recovery](#separate-route-handlers-for-signup-confirmation-and-password-recovery)
- [Storage errors surface as-is, not through `interpretSupabaseWriteError`](#storage-errors-surface-as-is-not-through-interpretsupabasewriteerror)
- [Why `loginAction.test.ts`'s malformed-`redirectTo` test uses an unclosed IPv6-bracket host](#why-loginactiontestts-malformed-redirectto-test-uses-an-unclosed-ipv6-bracket-host)
- [CI performance gate: lab proxies, form-factor-split thresholds, and the file-count guard](#ci-performance-gate-lab-proxies-form-factor-split-thresholds-and-the-file-count-guard)
- [`EntityModal.SubmitButton`'s action-identity comparison against `useFormStatus`](#entitymodalsubmitbuttons-action-identity-comparison-against-useformstatus)
- [Using `ts-node`'s ESM loader instead of `tsx` for `authenticated-lighthouse.mts`](#using-ts-nodes-esm-loader-instead-of-tsx-for-authenticated-lighthousemts)

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
responsibility. Opening a project from a card uses the same-route replace
behavior (keeps one history entry for "being on /projects"); closing the
slide-over also calls `router.replace`. Navigating to a project from the
dashboard's Recent Projects section pushes instead, a real cross-route
navigation where Back should return to the dashboard, not skip past it. See
"ProjectCard moved from a role="button" div to a real <Link>" below for how
ProjectCard implements this distinction today.

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
rendered in either layout. This, not `providers/AuthListenerProvider.tsx`'s
`onAuthStateChange`-based `clear()`, is the mechanism preventing
cross-user cache leaks (one user's cached `projects`/`tasks`/`members`/
profile data rendering for a different, newly-logged-in user in the
same tab). `AuthListenerProvider` is kept as a secondary path, not
removed, and per the second incident below is deliberately narrower
than it once was.

**Why `onAuthStateChange` wasn't sufficient on its own. Incident:
confirmed via manual two-browser testing.** Atlas's login/signup/logout
all run as Server Actions against the _server_ Supabase client. The
_browser_ client's `onAuthStateChange`, which `AuthListenerProvider`
listens on, is never itself told a server-side sign-in/sign-out
happened. This is a confirmed, Supabase-team-acknowledged limitation
(supabase-js#1618), not a bug in Atlas's usage of it, and explains the
intermittent behavior observed in manual two-browser testing before
this fix (logging out User A and immediately logging in as User B,
same tab, sometimes showed User A's stale data and sometimes didn't,
depending on incidental timing).

The original fix for this was `components/ClearQueryCacheOnMount.tsx`,
a small Client Component that called `queryClient.clear()` once on
mount and rendered inside both `app/(auth)/layout.tsx` and
`app/(dashboard)/layout.tsx`, relying on Next.js fully remounting a
nested layout on every crossing between separate route groups. That
component is gone now; see below for what replaced it.

**A second, separate incident narrowed `AuthListenerProvider` further,
to `SIGNED_OUT` only. Incident: confirmed via React Query Devtools.**
An earlier version of `AuthListenerProvider` also cleared on
`SIGNED_IN`. This caused a real, reproduced bug: `onAuthStateChange`
fires `SIGNED_IN` on _any_ fresh client initialization that finds an
existing valid session, including an ordinary page refresh by the
same, still-logged-in user, not just a genuine new login. Clearing on
that event raced against every other query mounting in the same
commit, orphaning their in-flight fetches. This produced a
stuck-loading-skeleton bug specifically on hard refresh (not on normal
navigation), confirmed by React Query Devtools showing zero registered
queries at the exact moment the Network tab showed a real,
already-resolved `200` response for the same request. `SIGNED_IN` was
removed from the listener entirely rather than patched, since the
false positive is inherent to what the event means, not fixable by
better timing.

**Why the mechanism changed, not the incident history above; both
incidents happened exactly as recorded.** `QueryProvider` was mounted
at root even though only `(dashboard)` routes ever call a React Query
hook, confirmed by grepping every `useQuery`/`useMutation`/
`useQueryClient` call site in the codebase. That gave `(auth)` routes
a query client with no reason to exist there, which is exactly why
`ClearQueryCacheOnMount` had to run in both layouts, defending a
client `(auth)` never needed. Scoping the provider to where it's used
makes that defensive clearing unnecessary, not redundant: a route
never given a client can't leak stale data from one.

**Why this is a stronger cache-leak defense, not just a smaller one:**
`QueryProvider` builds its `QueryClient` with a `useState` lazy
initializer, one instance per mount, not a module-level singleton.
`(dashboard)/layout.tsx` fully unmounts on every crossing to `(auth)`,
the same route-group-crossing guarantee the deleted component relied
on, so each `(auth)` → `(dashboard)` crossing constructs a genuinely
new client. Unlike the `.clear()` call it replaces, which emptied an
existing client while the same object and its subscribers kept
living, an unmounted client has no subscribers left, so a
late-resolving fetch from the previous session can't write a stale
entry into it.

**Measured effect, secondary to the above:** real but partial
improvement to the LCP finding this targeted. See `docs/findings.md`
for the full before/after numbers.

**The assumption this correctness depends on. Read before adding any
new auth-adjacent feature:** this only works because, in Atlas's
current single-account auth model, _every_ path from one user's
identity to a different one necessarily crosses the `(auth)` route
group boundary (you cannot reach a different user's dashboard session
without passing through `/login` first). If a future feature ever
allowed switching identity _without_ crossing that boundary, for
example an account-switcher or impersonation feature that swaps the
active user via an API call while staying on a dashboard route, this
mechanism would **not** fire, and the cache leak this fix closes would
reopen for that new code path. Any such feature must either trigger
`queryClient.clear()` directly itself, or be designed to route through
a layout boundary the same way login/logout already do.

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

**Decision:** scripts/authenticated-lighthouse.mts launches a persistent
Chromium context with a debug port, logs in, then runs
playwright-lighthouse's playAudit against that same instance, no
cookie hand-off to a separately launched process.

**How it started.** The first version of this tooling,
scripts/get-auth-cookie.ts (since deleted), used Playwright to log
into Atlas and capture a real cookie set for Lighthouse's
--extra-headers, replacing a manual DevTools copy-paste approach.
Playwright was the choice there rather than Puppeteer or Lighthouse's
own User Flow API because docs/testing.md already commits to
Playwright for E2E, so there was no reason to bring in a second
browser-automation tool for the same job. context.cookies() reads the
real post-login cookie jar, HttpOnly and any chunked
sb-<ref>-auth-token.0/.1/.2 included.

**Why that turned out insufficient. Incident: confirmed via a
Lighthouse baseline run, then a real login.** --extra-headers injects
a raw header onto requests; it never touches the browser's actual
cookie store. SSR saw the session, client-side code never did,
producing a hydration error and REST 401s on every authenticated
route, both absent once logged in normally. Every prior authenticated
measurement made this way was unverified.

**Why:** the fix was to stop handing cookies to a separately launched
process at all. One continuous, persistent authenticated browser
context stays open for the whole run, with playwright-lighthouse
auditing directly against it. See docs/findings.md.

**Why playwright-lighthouse, not hand-rolled:** three prior incidents
this phase from underestimating browser-tooling glue code. A
maintained library tracking Lighthouse/Playwright's own churn is the
right call here, confirmed against the installed versions before
adopting it.

**Playwright itself didn't change.** Both the deleted script and its
replacement run on Playwright; what changed is the hand-off
mechanism, not the tool. Not scope creep either: close to, likely
reusable as, the login fixture the future tests/e2e/ suite will need
anyway.

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

## Zero-exception style-src-attr: class refactors, a generated hash allowlist, and native `<progress>`

**Decision:** `style-src-attr` ships with no `unsafe-inline`. Every
inline `style` write in the codebase was either converted to a fixed
CSS class (`Avatar`'s size/palette, `StatusBox`/`TaskItem`/the
dashboard's status dots), covered by a build-time-generated hash
allowlist (`Skeleton`, the only genuinely open-ended, developer-authored
set of literal values), or removed by switching to a native element
that doesn't use the `style` attribute at all (`ProjectCard`/
`ProjectListTable`'s progress fill, now `<progress>`).

**Why `unsafe-inline` was rejected here despite being cheaper, unlike
the `script-src` decision above.** Style attributes get added far more
casually than inline scripts, a `style={{}}` prop is ordinary,
unremarkable React, not a deliberate, rare choice the way
`dangerouslySetInnerHTML` is. A page-wide `style-src-attr
'unsafe-inline'` would be a standing invitation for the next inline
style anyone adds, anywhere, to silently reopen exactly the injection
surface this work closes, with no build-time signal. The `script-src`
exception stays narrow specifically because it's one static,
developer-authored script; `style-src-attr` had no equivalent narrow
story available without doing the refactor.

**Why native `<progress>`, not bucketing, for the one value that
couldn't become a fixed class.** The progress fill is a continuously
computed percentage (0-100), not a small closed set, so it could not
follow the class or hash path without a real precision loss against
`docs/architecture.md`'s "honest percentages" principle (never show
100% unless done === total, never 0% when done > 0, clamp to [1, 99]).
Switching to `<progress value={progressPercent} max={100}>` removes
the `style` attribute from that call site entirely, `value`/`max` are
plain DOM attributes, not CSS, so no CSP concern applies to them at
all, while also replacing the hand-rolled `role="progressbar"`/
`aria-valuenow`/`aria-valuemin`/`aria-valuemax` with real native
semantics, a net accessibility improvement, not just a CSP fix.

**Known, accepted gap: the fill's grow animation is Chromium-only.**
Confirmed via an isolated cross-browser test (forcing a value change
and sampling the fill's pixel position over time): Chromium honors
`transition: width 300ms ease` on `::-webkit-progress-value` with a
real, smooth animation; Firefox does not animate the equivalent
`::-moz-progress-bar` rule at all, the fill jumps instantly. The
previous `div`-based implementation animated identically in both
engines, since it was a plain CSS transition on a normal element, not
routed through a UA-shadow pseudo-element. This is a real, narrow
visual regression for Firefox users, accepted in exchange for removing
the sink entirely rather than exempting it. Revisit if Firefox's
`::-moz-progress-bar` transition support changes, or if this gap
proves worse in practice than accepted here.

**Why `Skeleton` gets a generated hash list instead of a class-based
refactor.** A dynamic-Tailwind-class version was built and live-tested
first: it compiled with zero errors and produced zero CSP violations,
while every skeleton silently rendered at `0px` height and either
`0px` or an incidental inherited width, confirmed via `getComputedStyle`
across all 51 live instances. Tailwind's JIT scanner requires a
complete class-name literal somewhere in scanned source; a
template-literal-interpolated class name never satisfies that, no
matter how reasonable the resulting code looks. A real Tailwind-based
fix exists (call sites passing complete literal classes directly,
not `Skeleton` building them from props), but changes `Skeleton`'s
API across all 30 call sites for a benefit, one fewer CSP relaxation
keyword, judged not worth that surface today. The hash list is
generated at build time from the actual call sites (verified: 18 of 18
independently-observed live violation hashes matched the generator's
output exactly), so it cannot drift from source the way a
hand-maintained list could.

**`next/image`'s injected `color: transparent` needs no hash entry,
confirmed, not assumed.** Repeated, decisive live testing (disabling
`next/image` entirely and diffing the resulting CSP violation set,
then re-enabling it and checking the underlying `<img>`'s computed
`color` directly) confirmed this style is not blocked by the current
CSP at all: it applies successfully, `getComputedStyle` reports
`rgba(0, 0, 0, 0)`, no `securitypolicyviolation` event ever fires for
it. **Reopen this decision if a future `next/image` version changes
how that style is applied** (a different internal write path, a
different `showAltText` default, or a change to which sink it goes
through). If that ever starts producing real CSP violations, it would
fail silently and app-wide: every avatar photo across the entire app
uses this same code path, so a change here wouldn't show up as one
broken component, it would show up as every user photo losing its
alt-text-hiding behavior at once, worth naming as the specific, narrow
risk this acceptance carries forward.

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

---

## Trusted Types and style-src: production-only enforcement

**Decision:** Trusted Types enforcement (require-trusted-types-for 'script'
and trusted-types default) and style-src's strict policy (no 'unsafe-inline')
both only apply in production, gated the same way script-src's 'unsafe-eval'
already is.

**Why. Incident: confirmed via a real `npm run dev` session, not
assumed from the production result.** Both had only ever been
verified against `npm run build && npm run start`. Running them under
`npm run dev` for the first time, with a real
`securitypolicyviolation` listener attached, surfaced four distinct
breakages, not three: React's own development-mode `eval()`, used for
reconstructing call stacks for debugging, blocked because
`createScript` is undefined. Turbopack's HMR client chunk,
`[turbopack]_browser_dev_hmr-client_hmr-client_ts_*.js`, failed
`createScriptURL`'s validation, its dev-mode naming includes
characters (`[`, `]`) the production chunk-path pattern was never
built to expect. Next's dev-mode error overlay writes CSS
(`:root {--next-error-bg: ...}`) into the page via `innerHTML`,
blocked because `createHTML` is undefined, a Trusted Types failure.
And, separately, Next's dev indicator UI inserts its own `<style>`
element for a `@font-face` rule (`__nextjs-Geist`), which is a plain
`style-src-elem` failure with nothing to do with Trusted Types at
all, `style-src 'self'` has never had a dev-mode exception the way
`script-src` does.

**Why none of the four got a narrower fix instead.** All four are
internal to React, Next, and Turbopack's own development-time
tooling, not Atlas application code, so there's no app-side call site
to wrap in a policy or a hash. Widening `createScript` or
`createHTML` to pass strings through would mean not enforcing those
sinks at all. Widening `createScriptURL`'s regex to accept
Turbopack's dev-mode chunk naming, or adding a hash for the Geist
`@font-face` rule, was considered and rejected for the same reason:
that naming and that rule are internal, undocumented dev-bundler
output, not a stable contract, and coupling production security
policy to it means a future Next/Turbopack upgrade can break
enforcement silently. None of this touches how Atlas is actually used
in production, so scoping to production is the correct fix, not a
workaround.

**Verification.** Re-run after the fix: a real `npm run dev` session
loads clean, `securitypolicyviolation`-free, with Fast Refresh
confirmed still working (an edited file hot-reloads without a full
page reload). A real `npm run build && npm run start` session
confirmed still clean across all three routes, the post-login
client-side redirect, and both `<Link>` navigations, matching the
result from before this bug was found.

---

## Splitting `--color-accent` into a background token and a text token, and fixing the two gray text tokens alongside it

**Decision:** `--color-accent` now does one job only: fills, badges, dots,
the progress bar, anywhere it's a background or a decorative color with
something else on top of it. A new token, `--color-text-accent`, covers
every place accent was being used as the text or icon color itself. Both
gray text tokens, `--color-text-muted` and `--color-text-secondary`, got
new values in both themes. `--color-text-on-accent` changed from a single
white value to a single dark one.

**Why split the token instead of picking one compromise value.**
`--color-accent`'s original hex (`#ea8c00` light, `#fbbf24` dark) was
tuned to look right as a button fill and a badge color. Checking it
against 4.5:1 as text turned up real failures everywhere it doubled as
link and label text too, light mode failed on every background it was
used against, dark mode failed only on the white button text. Darkening
the one token enough to pass as text would have muddied every button and
badge in the app for a problem that only exists on 22 lines. Two tokens
means the buttons stay exactly as bright as they were.

**Why `--color-text-on-accent` moved from white to `#18181b`, one value
for both themes.** White was never actually checked against `--color-
accent` when it was picked. It fails badly in dark mode, `1.67:1` on the
"Sign in" button, worse than either gray-text failure Lighthouse actually
flagged. `#18181b` (the same hex already used for `--color-text-primary`
in light mode) clears both themes' accent values comfortably, `6.96:1`
against light mode's `#ea8c00`, `10.61:1` against dark mode's `#fbbf24`.
One value doing the job for both themes means no new per-theme override,
and no reason to add one.

**The hue check against `--color-warning`.** `--color-text-accent`'s
light value, `#995c00`, was built by taking the original accent hue
(H35.9°) and saturation and just lowering the lightness until it cleared
4.5:1 against the tightest of the three backgrounds it's actually used
on (`--color-accent-subtle`, at `4.85:1`). Hue never moved, so the ~11°
gap from `--color-warning` (H24.6°) that the entry above this one
deliberately set up is untouched. The result reads as a darker amber, not
as red-orange, so a warning-colored element still won't get mistaken for
a branded one.

**`--color-text-muted` and `--color-text-secondary`, fixed together, not
one now and one later.** Computing `--color-text-muted`'s replacement
surfaced two things worth catching before shipping: light mode had the
same failure Lighthouse only caught in dark mode (Lighthouse's own pages
never happened to render `--color-text-muted` against every background it
actually sits on in light mode), and `--color-text-secondary`, which
wasn't part of the original finding at all, fails against `--color-
surface-raised` in both themes and against `--color-accent-subtle` too
(`VelocityStatus`'s narrative text renders on both). Since `text-muted`
is supposed to read as the more de-emphasized of the two grays, fixing
one without checking the other risked leaving muted text more readable
than secondary text, or the reverse, on at least one shared background.
Both got new values, computed together, and the ordering was checked
with real numbers rather than assumed:

| | light (darker = more prominent) | dark (lighter = more prominent) |
|---|---|---|
| `--color-text-secondary` | `#67676f` | `#b4b4bb` |
| `--color-text-muted` | `#6b6b76` | `#adadb3` |

Secondary is darker than muted in light mode and lighter than muted in
dark mode, in both cases the more prominent position, confirmed by
comparing relative luminance directly, not by eye. Every pairing clears
4.5:1 with real margin, nothing sits close enough to the line that
sub-pixel rendering differences could flip it. Full numbers are in
`docs/findings.md`.

---

## Theme toggle reads via `useSyncExternalStore`, not `ThemeContext`'s own state

**Decision:** `Sidebar.tsx`'s theme toggle (icon, label, `aria-label`)
reads from a new `providers/useDisplayedTheme.ts` hook, not from
`ThemeContext`'s `theme` value. The hook wraps `useSyncExternalStore`,
reading `data-theme` off `documentElement`, with `getServerSnapshot`
returning a neutral `"pending"` state rather than a guess.
`ThemeContext.theme` is unchanged and still drives `toggleTheme`.

**Root cause. Incident: reproduced in both dev and a production
build.** `ThemeContext`'s old `useState` initializer branched on
`typeof window`: always `"light"` on the server, but on the client's
first render (the hydration render) `window` already exists, so it
read `localStorage` immediately and returned whatever was actually
stored. Server HTML was built from the forced `"light"` branch; the
client's first render disagreed with it before React did anything
else. `Sidebar.tsx` was the only place this showed, the only
component branching render output on `theme`.

**Why it became a blank screen in production, not just a dev
warning.** On a hydration mismatch React discards and regenerates
the affected subtree client-side, and that recovery path writes
through a raw `innerHTML` call. `app/layout.tsx`'s Trusted Types
`default` policy only defines `createScriptURL`, not `createHTML`
(see the Trusted Types entry above), so that write throws once
enforcement is active in production. The policy did what it's for;
this wasn't a gap to widen.

**Why `useSyncExternalStore`, not a `mounted`-flag guard.** A
`mounted` flag hides the symptom but not the mismatch, React still
diffs a wrong first render against the server HTML.
`useSyncExternalStore` avoids the mismatch at the source: confirmed
in React 19.2.4's own source, during hydration it calls only
`getServerSnapshot`, never the real one, so the first client render
matches the server exactly and the `innerHTML` recovery path never
runs. The real value applies after mount through a normal effect, an
ordinary re-render, not error recovery. `getServerSnapshot` returns
`"pending"` rather than a guessed light/dark specifically so that one
render reads as loading, not as a wrong answer someone could act on.
Confirmed live: no hydration mismatch, no production crash, no
perceptible lag added to normal toggle clicks.

**Why the scoped-cookie alternative was rejected.** Reading the theme
cookie server-side, scoped to `(dashboard)/layout.tsx` since
`Sidebar` only mounts there, would give a true mismatch-free render
with no flash at all, and wouldn't touch `/login`/`/signup`. Rejected
anyway: `cookies()` unconditionally opts a route into dynamic
rendering, and `/`, `/projects`, and `/profile` are static today.
Giving that up permanently, plus restructuring `(dashboard)/layout.tsx`
out of being a single Client Component, to remove a sub-100ms loading
state isn't a proportionate trade. Revisit if `cacheComponents` is
ever adopted app-wide for other reasons.

---

## `ProjectCard` moved from a `role="button"` div to a real `<Link>`

**Decision:** `ProjectCard`'s outer element is a plain `div` again,
not `role="button"`. The click/keyboard target is a real `<Link
href="/projects?project=<id>">` wrapping the project name, stretched
to cover the whole card via a `::after` pseudo-element. `onSelect`
is gone; `ProjectCard` takes an optional `replaceHistory` prop
instead, matching the push/replace distinction the "URL-derived
project selection" entry above already documents, passed from
`ProjectList.tsx` only.

**Why.** `label-content-name-mismatch` failed on all 4 cards: the
old `aria-label="Open {name} details"` fully overrode the card's
real content, since an explicit `aria-label` replaces
name-from-content entirely, and a hand-maintained summary was always
going to drift out of sync with the card's actual fields. A real
link's accessible name comes from its own visible text by
construction, nothing to maintain.

**`:has()` gates hover/focus pass-through, Firefox needs a
fallback.** `.card:has(.cardLink:hover/:focus-visible)` lets the
whole card react to the link's state without JS. Chrome (105+) and
Safari (15.4+) are covered by this project's browser targets;
Firefox isn't until 121, a real gap for 111-120. Hover degrading
there is harmless. Focus isn't: the rule also strips the link's own
native outline, so without `:has()` a keyboard user would get no
focus indicator at all. Gated behind `@supports selector(:has(a))`
so a `:has()`-less browser keeps the link's ordinary native outline
instead of losing focus visibility.

**Found along the way: the member-avatars `aria-label` was never
actually announced.** Removing `role="button"` surfaced a new
`aria-prohibited-attr` violation on that `div`'s `aria-label`.
Confirmed against the pre-change code that this didn't fail there:
`role="button"` forces all descendants into ARIA's
presentational-children behavior, so the label was structurally
void the whole time, never live in the accessibility tree. Fixed
with `role="group"`, now valid and, for the first time, actually
announced.

---

## `npm test` runs with `--forceExit`: MSW leaves an open handle for any FormData request body

**Decision:** `package.json`'s `test` script is `jest --forceExit`, not
plain `jest`. `test:watch` is unchanged, since watch mode never exits
on its own anyway.

**Why. Incident: isolated with a minimal repro, no Supabase code
involved.** `profileActions.test.ts`'s avatar-upload tests hung
indefinitely after every assertion passed, confirmed with
`--forceExit` that each test genuinely completes in under a second,
this is Jest waiting on something that never releases, not a stuck
test.

Isolated to a bare `fetch()` sending a `multipart/form-data` body (a
`FormData` with even one plain string field, no `File` needed)
against an MSW-intercepted endpoint. `@mswjs/interceptors`'s Node
request interceptor doesn't fully release the socket for this
content type specifically, confirmed against every other request
shape in the Server Action suites at the time, `deleteProject`,
`addMember`, both `createProjectAction` branches, both
`createTaskAction` branches, `logout`, all plain JSON or urlencoded,
all exiting cleanly alone with no `--forceExit` needed.

**A second, distinct confirmed cause: React's `scheduler` package,
hook tests only.** `tests/integration/useTasks.test.tsx` (layer 3)
leaves one `MESSAGEPORT` handle open even alone, confirmed via
`--detectOpenHandles`, traced to `scheduler`'s `MessageChannel`-based
deferral for state updates that land outside a synchronous `act()`
call, e.g. a `waitFor`-observed state change after a real fetch
resolves. `ThemeContext.test.tsx` never triggers it (confirmed: zero
open handles), since its updates are all synchronous. Third-party,
by design, no app- or test-level hook to close it early, same
reasoning as the interceptor cause above. Not every request shape
still exits cleanly alone, any hook test doing a real async update
now needs `--forceExit` too.

**Why `--forceExit`, not a real fix, for both causes above.** Both
sit inside third-party code with no call site here to fix.
`--forceExit` is Jest's own documented answer to exactly this
situation. The usual risk, masking a genuine stuck test, is narrow
here: every test's assertions already complete well within the
default timeout; forcing exit only skips waiting on a handle nothing
in this codebase controls.

**Reopen this if:** a future `msw`/`@mswjs/interceptors` upgrade
fixes the underlying issue, or `--forceExit` ever starts hiding a
real hang, i.e. a test's own assertions stop completing quickly, not
just the process failing to exit afterward.

---

## Deriving SUPABASE_ORIGIN from env in dev only

**Decision:** `next.config.ts`'s `SUPABASE_ORIGIN` (used to build
`connect-src` in the CSP header) derives from `NEXT_PUBLIC_SUPABASE_URL`
only when `isDev` is true. In production it stays the hardcoded literal,
never read from env at build time.

**Why not always derive it from env, the simpler option.** Production CSP
never depending on a build-time env var is an existing invariant worth
keeping, not something this change should quietly break for convenience.
A hardcoded literal in production means the deployed CSP is exactly what
was reviewed and committed, with no chance of drifting from a
misconfigured or missing env var at build time, or from a build pipeline
that ends up pointed at the wrong project entirely. `isDev` gating the
derivation, instead of always deriving it, is the same pattern this file
already uses for `unsafe-eval` (dev-only addition) and Trusted Types
(dev-only exclusion), not a new mechanism introduced for this one case.

**Why it needed to change at all.** E2E tests (`tests/e2e/`) run against
a local Supabase stack at `http://127.0.0.1:54321`, not the production
project. With the literal fixed to the production origin, every
client-side Supabase fetch during a real `next dev` E2E run was silently
CSP-blocked, confirmed via a real browser console error
(`TypeError: Failed to fetch` from `fetchWithoutCache`) during the first
E2E flow's dev run.

**Parsed via `new URL(...).origin`, not string concatenation.** Confirmed
this produces the identical shape the literal already used for both the
local stack (`http://127.0.0.1:54321`) and the real production URL
(`https://hgyygkysbljijxmltbgt.supabase.co`), so `connect-src`'s syntax
never depends on `NEXT_PUBLIC_SUPABASE_URL` being pre-formatted correctly.

---

## Removing `.env.development.local`

**Decision:** `.env.development.local` is deleted. E2E's local-stack
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values now
live in `playwright.config.ts`'s `webServer.env`, scoped to the dev server
process Playwright itself spawns. Plain `npm run dev` reads only `.env.local`.

**Why. Incident: confirmed via the CSP header on a plain `npm run dev`
session, same method as "Deriving SUPABASE_ORIGIN from env in dev only"
above.** `.env.development.local` held the local stack's URL so E2E could
run `next dev` against it. Next's own documented env-loading order puts a
`.env.$(NODE_ENV).local` file above plain `.env.local`, unconditionally, for
every `next dev` invocation, not just ones Playwright starts. With the file
present, an ordinary developer running `npm run dev` by hand was silently
pointed at the local Supabase stack instead of the real dev project in
`.env.local`, confirmed via `connect-src` showing `http://127.0.0.1:54321`
instead of the real project origin.

**Why scoping into `webServer.env`, not a different recognized filename.**
Next.js has no mechanism to make a recognized env filename apply only when
a specific parent process (Playwright) is the one invoking `next dev`; the
loader only branches on `NODE_ENV`, which every `next dev` run shares
regardless of who started it. Playwright's `webServer.env` merges into the
spawned child process's `process.env` (confirmed in `playwright`'s own
source, `WebServerPlugin._startProcess`), and Next's env loader treats an
already-set `process.env` value as highest priority, above every `.env`
file. Setting the values there means only the process Playwright itself
starts ever sees the local stack's URL; a manually-run `npm run dev` never
does.

## Matching `supabase/config.toml`'s `site_url` to `localhost`, not `127.0.0.1`

**Decision:** `[auth].site_url` and `additional_redirect_urls` in
`supabase/config.toml` use `localhost:3000`, not `127.0.0.1:3000`. This is
what Supabase's local mailer uses to build the links in confirmation and
recovery emails.

**Why. Incident: found writing password-reset.spec.ts's real click-through
E2E test.** Every recovery/confirm link landed on `127.0.0.1:3000`, and the
Route Handlers that exchange them (`app/auth/confirm`, `app/auth/recovery-confirm`)
build their success redirect from `request.url`. Confirmed empirically, with
curl and three different `Host` headers (default, a bogus value, and the
literal correct `127.0.0.1:3000`): Next 16's dev server always normalizes
`request.url`'s origin to `localhost:3000`, ignoring the incoming `Host`
entirely. The session cookie GoTrue's exchange sets, though, is host-only
for whichever host the browser actually connected to. Following a
`127.0.0.1` email link meant the cookie lived on `127.0.0.1`, while the
route's own redirect always pointed at `localhost` — the browser arrived
signed out. Aligning `site_url` with `localhost:3000`, the host every other
part of this project's dev and E2E setup already uses, keeps both sides on
the same origin.

---

## Separate Route Handlers for signup confirmation and password recovery

**Decision:** `app/auth/confirm/route.ts` (signup) and
`app/auth/recovery-confirm/route.ts` (recovery) are separate handlers,
not one branching on `type`.

**Why:** Their failure redirects genuinely differ, a failed recovery
link has nothing useful to do on `/login`, unlike a failed signup
confirmation. Branching one handler on `type` would add indirection
for that single difference, not remove any real duplication.

---

## Storage errors surface as-is, not through `interpretSupabaseWriteError`

**Decision:** `profileActions.ts`'s avatar upload failure surfaces
`uploadError.message` directly, not through `interpretSupabaseWriteError`.

**Why:** `@supabase/storage-js` errors don't carry the `.code` shape
that helper depends on to tell `sessionExpired` from `forbidden`.
Running one through it would misfire, not simply skip a nice-to-have.

---

## Why `loginAction.test.ts`'s malformed-`redirectTo` test uses an unclosed IPv6-bracket host

**Decision:** The malformed-redirect test uses `"http://[invalid"`
specifically, not an arbitrary bad string.

**Why:** Confirmed via a standalone Node check: `new URL(str, base)`
resolves almost any string as a relative path rather than throwing
when a base is given. Only something shaped like a broken absolute
URL, like an unclosed IPv6-bracket host, actually triggers the
throw; most malformed strings never reach `login()`'s catch branch
at all.

---

## CI performance gate: lab proxies, form-factor-split thresholds, and the file-count guard

**Decision:** `.github/workflows/ci.yml` runs
`scripts/authenticated-lighthouse.mts` once in `lighthouse-generate`,
uploading the reports as a shared artifact. A single matrix job,
`lighthouse` (`form_factor: [desktop, mobile]`), downloads that
artifact, splits out its own form factor, and asserts against
`lighthouserc.desktop.json`/`lighthouserc.mobile.json` independently
per leg. GitHub reports each leg under its own `name:`, "Lighthouse
desktop performance budget" and "Lighthouse mobile performance
budget", both required.

**Why lab proxies, not real Core Web Vitals.** Official Core Web
Vitals are CrUX field data from real-user traffic. Atlas has no
meaningful production traffic to gate on, so the honest option is
Lighthouse's lab measurements: LCP and CLS directly, Total Blocking
Time standing in for INP-style responsiveness (Lighthouse cannot
measure INP at all in a lab run, it requires real interaction timing).

**Why TBT's threshold comes from Lighthouse's own scoring curve.**
LCP and CLS's assertion values aren't arbitrary, they're Lighthouse's
own `p10` control point (the value scoring ~0.9, "good") for each
metric, confirmed by reading
`node_modules/lighthouse/core/audits/metrics/*.js` directly, and for
LCP mobile that point happens to equal the official CWV "good"
cutoff. TBT has no outside standard to check against, so the same
method applies: its `p10` control point (mobile `200`, desktop `150`)
is the threshold, desktop TBT still uses it directly. Mobile TBT is
the one deliberate exception, see "Mobile TBT" below for why it's set
from measured data instead. This is also why LCP and TBT are split by
form factor (mobile `p10: 2500`/`200`, desktop `p10: 1200`/`150`)
while CLS isn't, Lighthouse's own source defines separate mobile/desktop
control points for LCP and
TBT, but only one shared `p10: 0.1` for CLS.

**Why two configs and two `assert` passes, not one.**
`authenticated-lighthouse.mts` audits each route under both mobile and
desktop, against the identical URL. `lhci assert` groups results by
URL for reporting, so a single pass over both report sets can't apply
different thresholds by form factor, everything in one `assert` call
gets the same numbers. Reports are split into two directories first,
one `assert` invocation per form factor, one per matrix leg.

**Why the file-count guard exists.** `lhci assert`'s `loadSavedLHRs`
only recognizes files matching `lhr-<n>.json`. Confirmed and
reproduced this session: pointing it at a directory with real reports
under a different naming pattern makes it report `0 URL(s), 0 total
run(s)` and exit `0`, a merge gate silently passing having checked
nothing. The workflow counts renamed files per bucket and hard-fails
before calling `assert` if either count isn't exactly 9 (3 routes x
3 runs each, see the multi-run entry below).

**Why this audits the live Supabase project, not the local Docker
stack.** The live project reflects real production network
conditions, the correct default for a gate measuring what an actual
user experiences, not a same-machine round trip. A live-vs-local
comparison was considered but not run: the mobile TBT root cause
(below) already shows the dominant cost is React/React-DOM's own
hydration and scheduler runtime, not network latency, so the
comparison would not change anything material. Running it would also
require patching `next.config.ts`'s deliberately locked-down CSP
`connect-src`, confirmed this session: a production build pointed at
the local stack has every client-side Supabase fetch CSP-blocked,
`SUPABASE_ORIGIN` only derives from env when `isDev` is true, real
console errors observed, not inferred, for a question the TBT finding
had already answered. Not a cost worth paying to double check a
secondary variable.

**Why each route/form-factor combination runs 3 times, median
aggregated.** A single lab run is not a valid sample: verified this
session, mobile TBT for the same route swung from roughly 300ms to
750ms across otherwise-identical runs, pure lab variance. `RUNS_PER_ROUTE`
in `authenticated-lighthouse.mts` runs each combination 3 times; the
averaging happens in `lhci assert` itself via `aggregationMethod:
"median"` in both configs, not in the script, `assert` already groups
multiple LHR files by URL and aggregates them natively once given real
samples under that URL.

**Mobile TBT: a real, enforced regression floor at today's measured
value, not an unenforced gap.** Root-caused via `mainthread-work-breakdown`
and `bootup-time`: the dominant cost on every route is the same chunk,
React/React-DOM's own framework runtime (`createRoot`, `hydrateRoot`,
`unstable_scheduleCallback`, `useSyncExternalStore`), not a specific
unnecessary script or a third-party dependency. Cost is roughly
proportional to how much component tree each route hydrates, `/` and
`/projects` hydrate more than `/profile`.

`lighthouserc.mobile.json`'s `total-blocking-time` threshold is set
from real measured medians (3 runs per route, real production build):
`/` 305ms, `/profile` 213ms, `/projects` 356ms. The threshold is the
worst route's median plus roughly 12% margin for observed
session-to-session lab variance, rounded to **400ms**, not Lighthouse's
`p10` "good" curve point (200ms) the other thresholds use. This is a
regression floor, not an aspirational target: the gate exists to catch
mobile TBT getting worse than today, not to assert the app is
currently fast. The underlying hydration-cost problem is real,
structural, and not fixed in this branch, that stays separate future
work. When it lands, the fix is to lower this ceiling back toward the
`p10` value, not to remove or loosen the gate. Both desktop and
mobile are required checks.

**Why E2E isn't a required check yet.** The suite has never run under
real CI conditions, only locally. Promote it once it clears **10
non-blocking CI runs spanning at least one week, zero failures
attributable to infrastructure** (Docker cold-start timing, or
anything tied to the suite's `workers: 1`/`retries: 0` design under
real CI load) rather than a genuinely caught bug. A run where E2E
correctly catches a real regression doesn't count against this. An
infrastructure-caused failure resets the count to zero.

---

## `EntityModal.SubmitButton`'s action-identity comparison against `useFormStatus`

**Decision:** `SubmitButton` computes `isNonPrimaryActionPending` by
comparing `useFormStatus().action` against the form's own primary
`formAction` (from context), not just checking `status.pending` alone.
When pending is true but the action differs, `pendingLabel` is
suppressed and `children` renders instead.

**Why:** `useFormStatus()` is scoped to the whole enclosing `<form>`,
not to whichever button was actually clicked. `TaskModal`'s delete
confirm button sets its own `formAction={capturedAction}` on a
`type="submit"` button inside the same form as the primary Save
button. Without the action-identity check, clicking delete would make
`status.pending` true for the entire form, and the unrelated Save
button would incorrectly show its own `pendingLabel` ("Saving…") while
a delete was actually in flight, since both buttons share one
`useFormStatus()` call scoped to the same `<form>`.

---

## Using `ts-node`'s ESM loader instead of `tsx` for `authenticated-lighthouse.mts`

**Decision:** `authenticated-lighthouse.mts` runs via `node --loader
ts-node/esm`, not `tsx`.

**Why, stated at the confidence this actually has.** When this script
was first written, running it through `tsx` produced a real failure,
a `ReferenceError` for `__name` during Playwright's in-page
evaluation, believed at the time to match `privatenumber/tsx#113`.
`ts-node`'s ESM loader doesn't use `esbuild` the way `tsx` does, and
switched to it, which worked.

Re-tested this session, not assumed: three separate repros against a
real running server (a plain typed `page.evaluate`, a full
`playAudit()` call with all four categories, and the same call with
`desktopConfig`) all completed cleanly under a freshly-installed
`tsx`, no `__name` error, no crash. The original failure could not be
reproduced against current `tsx`/`esbuild`/`playwright-lighthouse`
versions. This doesn't mean the original failure didn't happen,
dependency versions have moved since, only that it's no longer
independently confirmed.

**Why keep `ts-node` anyway.** It works, is already in place, and
nothing about the current setup motivates switching back to `tsx` to
chase a bug that may no longer exist. Revisit if `ts-node`'s ESM
loader itself ever becomes the source of a real problem.