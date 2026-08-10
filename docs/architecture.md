# Atlas Architecture

This document defines Atlas's system structure, dependency boundaries, data
flow, state-management rules, and established utility patterns.

---

## Folder Structure

```text
atlas/
├── proxy.ts
├── app/
│   ├── error.tsx
│   ├── error.module.css
│   ├── not-found.tsx
│   ├── not-found.module.css
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   ├── error.module.css
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   ├── login.module.css
│   │   │   └── actions.ts
│   │   └── signup/
│   │       ├── page.tsx
│   │       ├── signup.module.css
│   │       └── actions.ts
│   ├── auth/
│   │   └── confirm/
│   │       └── route.ts
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── layout.module.css
│       ├── error.tsx
│       ├── error.module.css
│       ├── actions.ts
│       ├── page.tsx
│       ├── page.module.css
│       ├── profile/
│       │   ├── page.tsx
│       │   └── page.module.css
│       └── projects/
│           └── page.tsx
├── components/
│   ├── EntityModal.tsx
│   ├── StatusBox.tsx
│   ├── Avatar.tsx
│   ├── Skeleton.tsx
│   ├── ClearQueryCacheOnMount.tsx
│   ├── ActionErrorMessage.tsx
│   └── ActionErrorMessage.module.css
├── features/
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectList.module.css
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectCard.module.css
│   │   ├── ProjectListTable.tsx
│   │   ├── ProjectListTable.module.css
│   │   ├── ProjectStats.tsx
│   │   ├── ProjectStats.module.css
│   │   ├── VelocityStatus.tsx
│   │   ├── VelocityStatus.module.css
│   │   ├── ProjectSlideOver.tsx
│   │   ├── ProjectSlideOver.module.css
│   │   ├── ProjectModal.tsx
│   │   ├── ProjectModal.module.css
│   │   ├── projectActions.ts
│   │   ├── projectShared.module.css
│   │   └── projectUtils.ts
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskList.module.css
│   │   ├── TaskItem.tsx
│   │   ├── TaskModal.tsx
│   │   ├── TaskModal.module.css
│   │   ├── taskActions.ts
│   │   └── taskUtils.ts
│   └── profile/
│       ├── ProfileForm.tsx
│       ├── ProfileForm.module.css
│       └── profileActions.ts
├── hooks/
│   ├── useCurrentUser.ts
│   ├── useCurrentUserProfile.ts
│   ├── useProjects.ts
│   ├── useTasks.ts
│   ├── useMembersByProject.ts
│   ├── useTaskCountsByProject.ts
│   └── useDueSoonTaskCount.ts
├── lib/
│   ├── asyncQueue.ts
│   ├── createCache.ts
│   ├── createCounter.ts
│   ├── createStore.ts
│   ├── entityFactory.ts
│   ├── errorHandler.ts
│   ├── fetcher.ts
│   ├── updateImmutable.ts
│   ├── utils.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── errors.ts
│   └── index.ts
├── providers/
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx
│   └── AuthListenerProvider.tsx
├── styles/
│   ├── tokens.css
│   ├── global.css
│   └── layout.module.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── types/
│   ├── atlas.types.ts
│   └── database.types.ts
├── supabase/
│   └── migrations/
├── scripts/
│   └── get-auth-cookie.ts
└── docs/
    ├── architecture.md
    ├── testing.md
    ├── database.md
    ├── frontend.md
    ├── auth.md
    ├── deployment.md
    ├── decisions.md
    ├── roadmap.md
    └── a11y.md
```

The tree shows location, not full responsibility. A file's detailed role should
be documented once in the relevant topic section.

---

## Dependency Boundaries

### Feature folders

- Feature-specific components belong in `features/[feature]/`.
- `components/` is for globally reusable UI with no feature coupling.
- A feature may contain:
  - `[feature]Shared.module.css` for shared feature styles;
  - `[feature]Utils.ts` for feature-scoped display logic; and
  - `[feature]Actions.ts` for client-rendered entity mutation logic.
- Extract duplicated feature styles into the shared feature module.
- Move utilities to `lib/utils.ts` once they are needed by:
  - multiple features; or
  - a global component.

A file in `components/` must never import from `features/`. Move the shared
utility downward to `lib/` instead of inverting the dependency direction.

Confirmed example: `getInitials` and `getMemberAvatarColor` moved from
`features/projects/projectUtils.ts` to `lib/utils.ts` when `Avatar.tsx` needed
them.

### Utility locations

Use `lib/utils.ts` for general transformations and utilities used by hooks,
multiple features, or global components:

- `toCamelCase`
- `parseDates`
- `getInitials`
- `getMemberAvatarColor`
- `isValidEmail`

Use `features/[feature]/[feature]Utils.ts` for display logic scoped to one
feature:

- `STATUS_LABELS`
- `DUE_DATE_FORMAT`
- `calculateProgressPercent`

Do not promote query-shape-specific grouping functions into `lib/utils.ts`.
Keep them module-local until a genuinely reusable second case exists.

### Route actions and feature actions

Server Actions colocate with their route:

```text
app/(auth)/login/actions.ts
app/(auth)/signup/actions.ts
app/(dashboard)/actions.ts
```

Shared Supabase client creation stays in `lib/supabase/` because it is
infrastructure, not business logic.

Client-rendered task/project mutation logic is not a Next.js Server Action.
Keep it in feature action files:

```text
features/tasks/taskActions.ts
features/projects/projectActions.ts
```

Use dependency-injection factories for form actions:

```typescript
createTaskAction(deps)
createDeleteTaskAction(deps)
```

Use plain async functions for direct non-form interactions:

```typescript
addMember(projectId, email, queryClient)
removeMember(projectId, userId, queryClient)
```

---

## Component Composition

Default to a single-block component.

Use a compound component composed with `Object.assign` only when callers need
genuinely variable composition. Do not make a component compound merely because
a visually similar component is compound.

`TaskModal` and `ProjectModal` intentionally differ. See
`docs/decisions.md`.

---

## Route Groups

- `(auth)` contains login and signup with a standalone layout.
- `(dashboard)` contains authenticated pages with Sidebar and Header.
- Parenthesized route groups do not appear in URLs.
- `app/(dashboard)/page.tsx` renders at `/`, not `/dashboard`.
- Never redirect or link to `/dashboard` as the authenticated home.
- `app/auth/confirm/route.ts` is a Route Handler outside route groups.
- The auth-confirm route must remain publicly reachable through `proxy.ts`.

---

## Exports

- Named exports for utilities and components.
- Default exports only where Next.js requires them for pages and layouts.
- `lib/index.ts` is an explicit named-export barrel.
- Never use `export *`.

---

## State Management

- React Context for feature-scoped shared UI state.
- Local `useState` for component-scoped state.
- TanStack React Query v5 for all server state, including current identity.
- Do not add an external state-management library without an explicit decision.

### Store IDs, not cached entity snapshots

When React Query owns an entity, Context, lifted state, or the URL must store
only its identifier:

```typescript
const searchParams = useSearchParams();
const selectedProjectId = searchParams.get("project");

const selectedProject =
  projects.find((project) => project.id === selectedProjectId) ?? null;
```

Do not store a full `Project` snapshot. A selected object has no live link to
the cache and becomes stale after invalidation/refetch.

This also makes deletion safe: `.find()` naturally returns `undefined`, which
normalizes to `null`.

`ProjectList.tsx`'s slide-over selection is URL-derived (`/projects?project=<id>`)
rather than Context-derived, specifically so the URL is the single source of
truth for "which project is open." providers/ProjectContext.tsx was deleted entirely,
selection was its only responsibility. See docs/decisions.md.

### Reference-only store

`lib/createStore.ts` is not part of the live state architecture. It has no
reactive subscription mechanism and is retained as a reference implementation.

---

## Data Fetching

- React Query is the client-side Supabase data layer.
- Use `lib/supabase/client.ts` in Client Components.
- Use `lib/supabase/server.ts` in Server Components and Server Actions.
- Handle Supabase action errors inline and return structured action state.
- Render action errors with `role="alert"`.
- Transform snake_case responses at the hook layer with `toCamelCase`.
- Immediately call `parseDates` for date-bearing fields.
- Use `enabled: !!param` for queries that require a valid parameter.
- Default global `staleTime` is 60 seconds unless a hook documents a different
  choice.
- Real project/task hooks require a valid session because RLS is default-deny
  and may return empty arrays rather than explicit errors.
- Client-direct mutation writes (`profileActions.ts`, `taskActions.ts`,
  `projectActions.ts`) interpret failed Postgrest writes through
  `lib/supabase/errors.ts`'s `interpretSupabaseWriteError`, never
  `error.message` directly, and render the result via
  `components/ActionErrorMessage.tsx`. See `docs/decisions.md`.

Do not reintroduce mock data after live Supabase queries have replaced it.

---

## Batched Fetching and N+1 Prevention

When each parent entity needs related child data, fetch all child data in one
query keyed by all parent IDs. Never issue one query per card or row.

### Established pattern

`useMembersByProject(projectIds: string[])`:

1. Sort IDs before using them in the query key.
2. Query once with `.in("project_id", sortedIds)`.
3. Group in the hook using React Query's `select`.
4. Return `Record<projectId, Member[]>`.
5. Call once in the parent list.
6. Pass grouped results to children as props.

Sort keys:

```typescript
const sortedIds = [...projectIds].sort();
```

Pass the complete entity ID set, not a search- or status-filtered visible
subset. Client filters must not trigger unnecessary child-data refetches.

### Task counts

`useTaskCountsByProject` follows the same pattern against the
`project_task_stats` view. Aggregation occurs in PostgreSQL, not in the browser.

The generated view type marks `project_id` nullable despite the underlying
column being non-null. The grouping implementation intentionally asserts
non-null rather than silently dropping an impossible row. Silent omission would
produce incorrect progress numbers.

### Aggregate ownership

Components that display aggregates should compute them from raw props rather
than requiring every caller to duplicate the calculation.

`ProjectStats` receives raw projects/task counts and calculates its displayed
figures internally.

### Honest percentages

Never show:

- `100%` unless `done === total`;
- `0%` when `done > 0`.

Round the true percentage and clamp intermediate values to `[1, 99]`.
Use `calculateProgressPercent` in `projectUtils.ts`.

### Coupled invalidations

Invalidations that must always happen together belong in one helper.

Task mutations must invalidate both:

- `["tasks", projectId]`;
- `["taskCountsByProject"]`.

Use the module-private `invalidateTaskQueries(...)` helper and run independent
invalidations with `Promise.all`.

---

## Current User Identity

### `useCurrentUser()`

Returns `{ id: string } | null` from `supabase.auth.getClaims()`.

Use it for cheap ownership checks. Its `staleTime` is five minutes:

- `getClaims()` is cheap for Atlas's asymmetric ECC P-256 signing setup;
- explicit invalidation remains the primary correctness path;
- a finite stale time provides a self-correction safety net.

Do not change it to `Infinity` without reopening the decision.

### `useCurrentUserProfile()`

Fetches the full `profiles` row for display data such as name and avatar.

Its query key includes `currentUser?.id`:

```typescript
["currentUserProfile", currentUser?.id]
```

It does not require separate manual cross-invalidation. A changed user ID
creates a new query key and fetches fresh data.

### `AuthListenerProvider`

The auth-state listener handles `SIGNED_OUT` only. Do not re-add `SIGNED_IN`
without reading `docs/decisions.md`.

Mounted in `app/(dashboard)/layout.tsx` only, not in root `app/layout.tsx`.
This keeps `@supabase/*` out of `(auth)`'s client bundle (`/login`, `/signup`),
since `AuthListenerProvider` is the only thing that pulled the browser
Supabase client above the `(auth)`/`(dashboard)` split. See
`docs/decisions.md` for why this placement doesn't weaken the cross-user
cache-leak defense.

### `ClearQueryCacheOnMount`

Rendered inside both auth and dashboard layouts. It is the primary cross-user
cache-leak defense under Atlas's current auth model.

Read the full decision before implementing account switching or another feature
that changes the current model's assumptions.

---

## Type System

### Database types

`types/database.types.ts`:

- snake_case;
- generated from Supabase;
- never manually edited;
- regenerated after every migration.

Generation is currently based on Supabase dashboard export, not assumed CLI
commands. Confirm the current workflow before giving instructions.

### Application types

`types/atlas.types.ts`:

- camelCase;
- hand-authored;
- used throughout the application.

Transform database shapes at the hook layer, never in pages or components.

### Established schema-derived types

- `projects.due_date` mirrors `tasks.due_date`: nullable
  `timestamp with time zone`.
- `projects.updated_at` and `tasks.updated_at` exist (added via a
  `set_updated_at()` trigger, see `docs/database.md`), used for
  recency-based sorting.
- `project_members` uses composite primary key `(project_id, user_id)`.
- Member roles are constrained to `'owner' | 'collaborator'`.
- Project owners receive an owner member row through
  `handle_new_project`.
- `project_task_stats` is a PostgreSQL view with:
  - `project_id`;
  - `total_tasks`;
  - `done_tasks`.

### Profiles and email

`profiles` intentionally has no `email` column.

Email belongs to `auth.users`. Duplicating it would create a second source of
truth and a sync requirement. Since RLS is row-level, a broadly readable
profile row is also the wrong place for sensitive email data.

Invite-by-email uses `lookup_user_id_by_email`, which returns only a matched
user ID.

Database security details live in `docs/database.md`.

---

## Live and Reference-Only Libraries

### Live

`lib/updateImmutable.ts` is used by project and task action logic.

Established immutable update split:

- `updateProject`
- `updateProjectStatus`
- `updateTask`
- `updateTaskStatus`

Status-specific updates stay out of generic `Partial<...>` update paths.

### Reference-only

The following are not called by the live application and are retained as
reference implementations:

- `lib/entityFactory.ts`
- `lib/createStore.ts`
- `lib/fetcher.ts`
- `lib/createCache.ts`
- `lib/asyncQueue.ts`
- `lib/errorHandler.ts`
- `lib/createCounter.ts`

Do not propose wiring them into production without discussion.

#### `fetcher.ts`

- Retries network failures and 5xx responses.
- Never retries 4xx responses.
- Linear backoff: `500 * attempt`.
- Normalizes failures into a `FetchError` discriminated union.

#### `createCache.ts`

- TTL cache.
- Maximum-size LRU eviction.
- Delete-and-reinsert `Map` entries to update recency.
- Lazy expiration on access.
- `createdAt` represents write time, not last-read time.

#### `asyncQueue.ts`

- Plain array-backed queue.
- Controlled concurrency.
- `.finally()` guarantees slot release.

#### `errorHandler.ts`

Deliberately rejected for live Supabase flows:

- It expects HTTP-status-shaped `FetchError`.
- Supabase uses `PostgrestError` with PostgreSQL/PostgREST codes.
- Its imperative toast/log design conflicts with declarative action state.

Design future background-error UI around Supabase's real error model rather
than resurrecting this file.

#### `createCounter.ts`

Not exported by `lib/index.ts` and more disconnected than its siblings.

---

## Factory Functions

For `entityFactory.ts` reference implementations:

- Return plain objects, not class instances.
- Use dedicated `CreateEntityInput` types.
- Use an input object for three or more fields.
- Exclude generated `id`, `createdAt`, and default `status` from inputs.
- Generate IDs with `crypto.randomUUID()`.
- Set `createdAt` with `new Date()`.
- Set default status inside the factory.

This does not constrain live Supabase-backed create forms. See
`docs/decisions.md`.

---

## Data Transformation

- `toCamelCase<T>` renames database keys.
- `parseDates<T>` converts explicitly listed timestamp strings to `Date`.
- `isValidEmail` is format-only UX validation, not a deliverability or security
  guarantee.
- `truncateDescription` handles JS-based table-cell truncation.
- Transform at the hook layer only.
- Do not duplicate the email regex.

Date and timezone rules live in `docs/database.md`.
