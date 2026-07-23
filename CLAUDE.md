@AGENTS.md

# CLAUDE.md — Atlas Engineering Brief

This file defines how Claude Code operates within the Atlas project.
Read it fully before writing any code. Follow every rule without exception.
This is a living document —  it is updated as new patterns are established.

---

## Project Context

**Atlas** is a production-grade Project Management Dashboard built as a senior-level portfolio project. It is not a prototype or a learning exercise. Every line of code must be production-ready, explainable, and defensible in a technical interview.

**Stack:**
- Next.js 16 (App Router) + TypeScript (strict mode)
- Tailwind CSS + CSS Modules (hybrid strategy)
- Supabase (PostgreSQL, auth, real-time subscriptions)
- TanStack React Query v5 (client-side data fetching)
- Jest (unit + integration tests)
- Playwright (E2E tests — Week 8)
- lucide-react (icons)
- Inter (font via next/font)

**Goal:** Demonstrate senior frontend engineering judgment across the full stack — not just working code, but correct, maintainable, well-documented, well-tested, and accessible code. Every file is a signal to a potential employer.

> **Next.js 16 note:** the root request-interception file is `proxy.ts` (exporting `async function proxy(request: NextRequest)`), not `middleware.ts`. `middleware.ts` is deprecated on this version — do not create it, and treat any external tutorial or doc example still using `middleware.ts`/`export function middleware` as needing translation to the current convention before use.

---

## Mode of Operation

### Propose Before Implementing
Never implement unilaterally. When given a task:
1. Propose 2-3 approaches with a clear recommendation and reasoning
2. Wait for the engineer's decision before writing any code
3. For genuinely unambiguous, small tasks (fixing a typo, adding a missing import), proceed and note what was done

### Raise Disagreements Before Proceeding
If an existing pattern conflicts with a better approach:
- Do not silently implement the existing pattern
- Do not implement a preferred approach without discussion
- Raise the conflict, explain the tradeoff, and wait for a decision

### Stay Collaborative
The engineer is fully present and involved at all times. This is not a background process. Ask questions, flag concerns, and propose options. Never make silent assumptions.

### When Unsure
If unsure about an implementation detail:
- Propose options with a recommendation
- Flag the uncertainty explicitly
- Never guess silently

### Third-Party Tools and Libraries
Before providing any how-to steps, walkthrough, or implementation guidance for any third-party tool, library, or platform (Supabase, Next.js, Vercel, Playwright, TanStack, or any other), always search the official documentation and leading community sources to confirm the current recommended approach. Never rely on training data for third-party implementation details. Version numbers matter — confirm behavior against the actual installed version in `package.json`, not the latest docs by default, since APIs (e.g. `@supabase/ssr` cookie/header handling, `eslint-plugin-react-hooks` rule behavior) have changed across minor versions.

If official docs are silent or ambiguous on a specific mechanism (this has happened twice: `useFormStatus()`'s behavior with button-level `formAction` overrides, and `@supabase/ssr`'s `setAll` cache-header argument), the correct response is to go further — read the actual library source/type definitions, or find the runtime implementation — rather than presenting a workaround as the final answer without flagging that the docs didn't confirm it.

---

## Code Quality Standards

### TypeScript
- Strict mode is enabled — no exceptions
- Never use `any` — infer the correct type or use `unknown`
- If `unknown` is used, add `// TODO: type this properly` comment
- If a type decision affects multiple files or has broad codebase impact, raise it before proceeding — do not decide unilaterally
- Prefer `type` for data shapes and aliases, `interface` for extension points
- Use discriminated unions for error types and state variants
- All exported types and interfaces must be explicitly exported
- Named exports everywhere — default exports only where Next.js requires them (page and layout components). This rule governs the export surface of a module; private, file-local helper components/functions that are never imported elsewhere (e.g. a `SubmitButton` defined and used only within one page file) are outside its scope, not exceptions to it — if such a helper is ever imported by another file, it must be converted to a named export at that point.

### Functions
- Pure functions wherever possible — no side effects on external state
- Input objects over individual parameters for functions with 3 or more arguments
- Direct returns over unnecessary intermediate variable declarations for simple expressions
- JSDoc on all exported functions — include `@param`, `@returns`, and `@template` where applicable
- Inline comments only for non-obvious logic — never for self-explanatory code. A comment should capture the *why* a reader can't infer from the code (e.g. "this component is isolated because `useSearchParams()` requires a Suspense boundary"), not restate the *what* the code already shows.
- Static data (nav items, config arrays, status maps) defined outside the component — never inside render

### Form Data Handling (all Server Actions, Route Handlers, and client-side form actions)
- **Every `formData.get(field)` must be treated as `string | null`, never cast directly with `as string`.** HTML `required`/`type` attributes are client-side only and trivially bypassed (disabled JS, direct POST, curl). Guard for missing/empty values before using any field, regardless of client-side validation already present.
- Distinguish presence (`null`) from emptiness (`""`) explicitly where the distinction matters; for most fields, `!value?.trim()` is sufficient to catch both.
- Do not `.trim()` password fields — a password's leading/trailing characters are part of what the user typed and must not be silently altered (consistent with NIST guidance on password handling).
- When validating a raw string against a known union type (e.g. `TaskStatus`, `ProjectStatus`), write a dedicated type-guard function (`function isTaskStatus(value: string): value is TaskStatus`) rather than inline casting — this is the idiomatic place for the necessary type assertion to live, and it's reusable. Derive the list of valid values from the single source of truth for that union (e.g. `Object.keys(STATUS_CONFIG)`) rather than hand-writing a second, parallel array that can drift out of sync.
- Prefer structured state fields for logic the UI must branch on (e.g. `accountExists: boolean`) over string-matching human-readable error messages (e.g. `error.includes("already exists")`). Substring-matching display text is fragile — any future copy change silently breaks the check with no type error and no test failure.
- When checking Supabase Auth errors, check `error.code` against documented values (see `supabase.com/docs/guides/auth/debugging/error-codes`), never `error.message` — message strings are not a stable API contract.
- **Disambiguating which action is pending, when multiple `formAction`-overriding buttons share one `<form>`:** `useFormStatus()`'s `pending` flag reflects the form as a whole, not which specific button/action triggered submission. Do **not** solve this with a hidden marker `<input>` in the form (e.g. `<input type="hidden" name="_action" value="delete">`) — any hidden field is a sibling in the DOM and gets included in `FormData` regardless of which button actually submitted, so it can go stale if a *different* button is clicked while the marker field is still present (confirmed bug: a task-delete confirm state left a stale `_action=delete` marker in the DOM, which then incorrectly labeled an unrelated Save submission). The reliable mechanism is **reference-identity comparison** on `useFormStatus().action`: `useFormStatus().action` is the *actual* action reference resolved for the current pending submission — the button's own `formAction` if it specified one, otherwise the form's default `action`. Since `useActionState`'s returned action (e.g. `formAction`) is a stable, memoized reference across renders, and any locally-defined wrapper function (e.g. a delete button's own submit handler) is a fresh closure every render, `action !== formAction` is a deterministic, DOM-state-independent way to tell "is *this specific* action the one currently running." Expose the form's primary action reference via context so any sibling button component can read and compare against it.

### React Components
- Client Components (`"use client"`) only when the component uses hooks, browser APIs, or event handlers
- Server Components by default — never add `"use client"` unnecessarily
- Props typed with a dedicated `type ComponentNameProps` — never inline prop types
- Each `useEffect` handles one concern only — never combine unrelated side effects
- Every `useEffect` that performs async work or attaches listeners must return a cleanup function — no exceptions
- Never use `async` directly as a `useEffect` callback — use an inner async function
- State updates inside `useEffect` must be guarded with a `cancelled` flag for async operations
- Any Client Component calling `useSearchParams()` must be wrapped in `<Suspense>`, or the build will fail/force the route to de-optimize from static to dynamic. Extract the search-params-dependent piece into its own small child component and wrap only that component in `<Suspense>` — wrapping the whole page unnecessarily forces unrelated content to wait behind the fallback.
- **Do not store full entity snapshots (e.g. a whole `Project` object) in shared state (Context, lifted `useState`) when that entity is also managed by a React Query cache.** A snapshot captured at selection time has no live link back to the query cache — after a mutation invalidates and refetches, the snapshot silently goes stale (confirmed bug: an edited project's slide-over kept showing pre-edit data until manually closed and reopened). Store only the identifying key (e.g. `selectedProjectId: string | null`) in shared state, and derive the current object on every render via `array.find((item) => item.id === selectedId) ?? null` against the live query data. This has a secondary benefit: if the selected entity is deleted, `.find()` naturally returns `undefined` → `null`, and dependent UI (e.g. a slide-over) closes itself automatically with zero special-case logic.
- **Do not leave unwired/inert interactive UI elements (buttons or menu items with no `onClick`) once an equivalent working feature exists elsewhere in the app.** A placeholder action button is reasonable early in a feature's life, but once the same capability is implemented properly somewhere else (e.g. a working "Delete project" flow elsewhere in the UI), a sibling inert "Delete" menu item becomes a real trap — it looks actionable and does nothing. Remove dead affordances rather than leave them; don't wire duplicate UI just to "finish" it if the working entry point is already one interaction away.

```typescript
// Required pattern for async useEffect
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetcher("/api/resource");
    if (cancelled) return;
    if ("type" in data) { handleError(data); return; }
    setData(data);
  }

  load();
  return () => { cancelled = true; };
}, []);
```

### React 19 — Forms and Actions
Atlas targets React 19. All forms and mutation flows must use React 19's Actions APIs — never the pre-19 `useState` + `onSubmit` + `e.preventDefault()` pattern.

- **Form submission**: use `useActionState` — `const [state, formAction, isPending] = useActionState(actionFn, initialState)`. The action signature is `(previousState, formData) => newState`.
- **`<form action={formAction}>`** — never `onSubmit` + `preventDefault` for forms with an action function.
- **Inputs are uncontrolled by default** — use `name` + `defaultValue`, read via `formData.get("fieldName")` inside the action (see Form Data Handling above for guarding requirements). Reserve controlled `useState` for custom widgets that don't map to native form elements (custom dropdowns, date pickers) — these participate via a hidden `<input type="hidden" name="..." value={...}>`.
- **Pending/loading state**: use `useFormStatus()` in a child component rendered inside the `<form>` — never prop-drill `isPending`. `useFormStatus` cannot be called in the component that renders the `<form>` element itself.
- **A single submit button can override the form's default action for its own submission** via `<button formAction={fn}>`, without needing a second `<form>`. Confirmed via the React 19 runtime implementation: this is used for the two-step destructive-delete pattern below. The action passed via `formAction` runs outside `useActionState`'s managed state — its return value is not automatically surfaced anywhere; if the error needs to be shown, capture it in local `useState` inside the button's own wrapper component.
- **Validation**: HTML attributes (`required`, `type`, `minLength`, etc.) for instant client feedback; re-validate inside the action function before calling any mutation — client-side attributes are not a substitute for server-side guards.
- **Optimistic UI**: use `useOptimistic` for instant feedback on mutations where the eventual server state is predictable (e.g. marking a task done).
- **Mutations**: the action function calls the React Query `mutateAsync` (Supabase create/update/delete) and returns `{ error: string | null }` (or similar) as the action state. On success, invalidate the relevant query key and close any modal.
- **`redirect()` from `next/navigation`** (Server Actions only): throws an internal `NEXT_REDIRECT` signal that the framework catches upstream — never wrap it in `try/catch`, and only call it outside any `try/catch` block (i.e. after all error-returning branches have already returned).
- **`NextResponse.redirect()`** (Route Handlers only — `route.ts` `GET`/`POST` functions): the correct primitive in this context, since a Route Handler returns a response value rather than throwing. Do not use `redirect()` from `next/navigation` in a Route Handler.
- **Ref values passed into a factory function during render (e.g. `useMemo(() => createXAction({ someRef, ... }), [...])`) trigger a known false positive in `eslint-plugin-react-hooks@7.x`'s `react-hooks/refs` rule** ("Cannot access refs during render"), even when `.current` is only ever dereferenced later, inside the returned callback, at call time — not synchronously during the factory. This is a confirmed, currently-open upstream bug (see `facebook/react` issues #34954, #35813), not a real bug in this pattern. Resolve with a scoped `// eslint-disable-next-line react-hooks/refs` directly above the line containing the ref, with a comment citing the upstream issue numbers. **The disable comment must sit immediately above the line where the flagged reference actually appears after formatting** — `eslint-disable-next-line` only covers the literal next line, so if Prettier wraps a multi-line call, verify where the comment lands relative to the ref after formatting runs, not just where you typed it.
- Before implementing any new form or mutation flow, confirm against the current React 19 docs (react.dev) that the pattern is still current — React's Actions APIs are actively evolving across minor versions.

### Destructive Actions (delete)
- **Low-blast-radius deletes** (e.g. deleting a single task with no cascading effects) use a two-step inline confirm: a neutral button ("Delete task") flips to a danger-styled confirm button ("Confirm delete?") on first click, and the actual delete only fires on the second click, via the `formAction` button-override pattern described above. No second modal.
- **High-blast-radius deletes** (e.g. deleting a project, which cascades to all its tasks via `ON DELETE CASCADE`) require a real, separate confirmation modal — not an inline two-step button — with copy that explicitly names the consequence (e.g. "This will also delete its N tasks. This can't be undone."). The severity difference is the deciding factor, not a stylistic preference.
- Confirmation modals built for this purpose should reuse `EntityModal` bare (no form fields — just `Header`/`Body` with the warning copy, and `Footer` with `CancelButton` + a `variant="danger"` `SubmitButton`), rather than a bespoke modal component.
- **Any modal reused for a repeatable confirm/delete flow (or any `EntityModal`/`useActionState`-backed modal in general) must be given a `key` that changes every time it's freshly opened** (an incrementing `resetKey` state, same pattern as the existing `modalResetKey` on create/edit modals). Without this, a previous attempt's error state (or any other internal state) persists silently into the next open, since the component is only toggled via `open`, never actually remounted.
- Always verify the actual database foreign-key `ON DELETE` behavior (`CASCADE` vs `SET NULL` vs `NO ACTION`) before writing a delete action — don't assume manual cleanup of child rows is needed without checking. In Atlas, confirmed via the Supabase dashboard: `tasks.project_id` and `project_members.project_id` are `ON DELETE CASCADE` (deleting a project correctly cascades); `tasks.assignee_id` is `ON DELETE SET NULL` (a task survives if its assignee's profile is ever deleted, just unassigned) — these are two different, both-correct choices for two different relationships, not an inconsistency.

### General
- No `console.log` left in production code
- No hardcoded magic numbers — use tokens or named constants
- No inline styles — use token variables via CSS Modules or CSS custom properties (see Dynamic Colors)
- No direct DOM mutation outside of designated utility functions
- Composition over inheritance
- Immutable update patterns at all times — never mutate objects or arrays directly
- Use `crypto.randomUUID()` for ID generation — no third-party UUID libraries
- Use `Date.now()` for timestamps used in arithmetic — use `new Date()` for display values

---

## Date and Timezone Handling

This is a real, confirmed bug class in Atlas (originally surfaced via task/project due dates) — follow this section exactly for any new date-related field.

- **Supabase returns `timestamp with time zone` columns as plain strings, not `Date` objects**, regardless of what the application-level TypeScript type (`types/atlas.types.ts`) declares. `toCamelCase` only renames keys — it has no awareness of which fields are semantically dates and does not convert them.
- **Conversion must happen at the hook layer, immediately after `toCamelCase`, using the shared `parseDates(obj, dateKeys)` utility in `lib/utils.ts`** — never left to defensive wrapping (`new Date(...)`) scattered at individual component call sites. Every hook that fetches an entity with date fields (`useProjects`, `useTasks`) must list every date-bearing key explicitly.
- **Writing a date-only value (from an `<input type="date">`) is safe as-is**: `new Date("2026-07-31")` is parsed as UTC midnight per the JS spec — this is consistent and correct for round-tripping through a `timestamp with time zone` column. Do not "fix" this by manually adjusting for local timezone on write; there is nothing to fix on the write path.
- **The actual bug lives entirely on the *display* path**: `Date.prototype.toLocaleDateString()` formats using the *viewer's local timezone* by default. A date-only value stored as UTC midnight, viewed by someone in a timezone behind UTC, displays as the *previous calendar day* — this is a real, demonstrated bug, not a hypothetical.
- **Fix: any `Intl.DateTimeFormatOptions` object used to display a date-only value (a deadline/due date, not a genuine instant-in-time value) must include `timeZone: "UTC"` explicitly.** Do not share one format object between genuine timestamps (e.g. `createdAt`, where local-time display is the *more* correct behavior — showing when something actually happened in the viewer's own time) and calendar-date values (e.g. `dueDate`, which should read identically to every viewer regardless of location). Keep them as two separate `Intl.DateTimeFormatOptions` constants even when their other fields (`year`/`month`/`day`) are otherwise identical.

---

## Architecture Decisions

These decisions are final unless explicitly reopened for discussion.

### Folder Structure
```
atlas/
├── proxy.ts               — Next.js 16 request interception (session refresh, route protection)
├── app/
│   ├── (auth)/            — login, signup — standalone layout, no shell
│   │   ├── layout.tsx
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
│   │       └── route.ts   — exchanges Supabase email token_hash for a session
│   └── (dashboard)/       — all authenticated pages — shell layout
│       └── actions.ts     — logout Server Action (see Authentication section)
├── components/            — globally reusable UI components (Sidebar, Header)
│   ├── EntityModal.tsx    — generic compound modal for create/edit/confirm flows
│   └── StatusBox.tsx      — generic status listbox (dotColor required — status-specific, not a general listbox)
├── features/               — feature-specific components, styles, and utilities
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectList.module.css
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectCard.module.css
│   │   ├── ProjectListTable.tsx
│   │   ├── ProjectListTable.module.css
│   │   ├── ProjectStats.tsx
│   │   ├── ProjectStats.module.css
│   │   ├── ProjectSlideOver.tsx
│   │   ├── ProjectSlideOver.module.css
│   │   ├── ProjectModal.tsx          — create/edit; deliberately non-compound (see Component Composition below)
│   │   ├── ProjectModal.module.css
│   │   ├── projectActions.ts         — mutation logic (create/edit/delete), not Server Actions
│   │   ├── projectShared.module.css  — styles shared across feature components
│   │   └── projectUtils.ts           — display utilities scoped to this feature
│   └── tasks/
│       ├── TaskList.tsx
│       ├── TaskItem.tsx
│       ├── TaskModal.tsx             — thin wrapper around EntityModal + task-specific DeleteButton/StatusField
│       ├── TaskModal.module.css
│       ├── taskActions.ts            — mutation logic (create/edit/delete)
│       └── taskUtils.ts
├── hooks/                 — custom React hooks
├── lib/                   — shared utilities
│   ├── asyncQueue.ts
│   ├── createCache.ts
│   ├── createCounter.ts
│   ├── createStore.ts
│   ├── entityFactory.ts
│   ├── errorHandler.ts
│   ├── fetcher.ts
│   ├── updateImmutable.ts
│   ├── utils.ts           — shared transformation utilities (toCamelCase, parseDates)
│   ├── supabase/
│   │   ├── client.ts      — browser client
│   │   └── server.ts      — server client
│   └── index.ts           — barrel file, explicit named exports only
├── providers/             — context providers and infrastructure wrappers
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx
│   └── ProjectContext.tsx — stores selectedProjectId only, never a full entity snapshot (see React Components rules)
├── styles/
│   ├── tokens.css         — single source of truth for all design tokens
│   └── global.css         — reset, base styles, token import
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── types/
│   ├── atlas.types.ts     — camelCase domain types
│   └── database.types.ts  — generated from Supabase schema, regenerate after any migration
└── docs/
    └── decisions.md       — architectural decisions and their rationale (see Documentation Standards)
```

### Feature Folder Structure
- Feature-specific components live in `features/[feature]/` — not in `components/`
- `components/` is reserved for globally reusable UI with no feature coupling
- Each feature folder may contain a shared styles file (`featureShared.module.css`) and a shared utilities file (`featureUtils.ts`) when multiple components within the feature share styles or logic
- Extract shared styles to a shared module rather than duplicating across component modules within the same feature
- If a utility is needed across multiple features, move it to `lib/utils.ts`

### Utility Location Rules
- `lib/utils.ts` — transformation utilities used by hooks or multiple features (e.g. `toCamelCase`, `parseDates`)
- `features/[feature]/[feature]Utils.ts` — display utilities scoped to one feature (e.g. `getInitials`, `getMemberAvatarColor`, `STATUS_LABELS`, `DUE_DATE_FORMAT`)
- If a feature-scoped utility is later needed by another feature, move it to `lib/utils.ts` at that point
- Server Actions colocate with their route (`app/(auth)/login/actions.ts` next to `app/(auth)/login/page.tsx`) rather than living in a shared `authUtils.ts` — each route's actions are distinct business logic, not shared infrastructure. Shared Supabase client creation (`lib/supabase/server.ts`) remains in `lib/` because it is infrastructure, not business logic; this is the distinguishing rule between the two locations.
- **Mutation logic for client-rendered feature entities (`taskActions.ts`, `projectActions.ts`) is not a Next.js Server Action** — it lives in `features/[feature]/[feature]Actions.ts`, a sibling to `[feature]Utils.ts`, and is built via a dependency-injection factory pattern (`createTaskAction(deps)`, `createDeleteTaskAction(deps)`) rather than closing over component scope directly. This keeps the logic independently reviewable/testable and avoids the ref-passed-during-render lint false positive described above by making the dependency shape explicit.

### Component Composition — Compound vs. Single-Block
- `TaskModal` is a compound component (`.Header`, `.Body`, `.Field`, `.Footer`, etc.) because it originated before `EntityModal` existed and changing its public shape would have required touching its already-working call site for no functional gain — not because task editing requires that flexibility.
- `ProjectModal` is deliberately **not** compound — a single component taking fixed props. Its fields (name, description, due date, status) are fixed and no caller needs to compose it differently; applying the compound pattern (which exists specifically to solve *unknown, variable* composition — see Radix/Reach UI/shadcn, the lineage this codebase's pattern draws from) where nothing variable exists would demonstrate not understanding why the pattern is used, not consistency.
- **This asymmetry is intentional, not an inconsistency** — see `docs/decisions.md` for the full rationale. Any new modal should be built compound only if it genuinely needs caller-driven composition; default to single-block otherwise.

### Route Groups
- `(auth)` — login, signup. No sidebar or header. Standalone layout.
- `(dashboard)` — all authenticated pages. Shell layout with Sidebar and Header.
- Route group folders use parentheses and do not appear in the URL — **`app/(dashboard)/page.tsx` renders at `/`, not `/dashboard`.** There is no literal `/dashboard` route in this app; any redirect or link intending "the authenticated home" must target `/`, not `/dashboard`.
- `app/auth/confirm/route.ts` is deliberately **not** inside a route group — it's a Route Handler (API-style endpoint), not a page. It must also be included in `proxy.ts`'s public-path allowlist (see Authentication section) — it is reached by unauthenticated users by definition.

### Exports
- Named exports on all utilities and components
- Default exports only for Next.js page and layout components
- Barrel file at `lib/index.ts` — only explicitly listed named exports, never `export *`

### State Management
- Closure-based stores (`lib/createStore.ts`) for auth/session state
- React Context for feature-scoped shared state — **store identifying keys (IDs), never full entity objects, when the entity is also managed by a React Query cache.** See the React Components rule above for the full reasoning and the confirmed bug this addresses.
- Local `useState` for component-scoped state
- TanStack React Query for all server state (fetching, caching, mutations)
- No external state management library unless explicitly decided and documented

### Data Fetching
- TanStack React Query v5 is the data fetching layer for all client-side Supabase queries
- `lib/fetcher.ts` for generic HTTP requests — never call `fetch` directly in components
- `lib/supabase/client.ts` for browser Supabase queries (Client Components)
- `lib/supabase/server.ts` for server Supabase queries (Server Components, Server Actions)
- `lib/createCache.ts` for client-side caching (TTL + LRU eviction + max size)
- All errors normalized through `lib/errorHandler.ts`
- All Supabase responses transformed from snake_case to camelCase at the hook level using `toCamelCase` from `lib/utils.ts`, followed immediately by `parseDates` for any date-bearing fields (see Date and Timezone Handling above)
- Independent async operations always run in parallel with `Promise.all` or `Promise.allSettled`
- Hooks use `enabled: !!param` to prevent queries firing with invalid or missing parameters
- `useProjects`/`useTasks` are live against Supabase (mock data fully removed as of Week 6 auth verification) — real queries only function correctly once a valid session exists, since RLS is default-deny and silently returns empty results (not an error) for unauthenticated requests. Any future hook added before its corresponding auth/RLS path is verified should follow the same commented-out-real-query-above-mock-data pattern that was used here, so the swap is a deletion + uncomment rather than a rewrite.
- Default staleTime: 60 seconds globally in `QueryProvider`, overridden per hook where appropriate

### Type System
- Database types (`types/database.types.ts`) — snake_case, generated from Supabase, never manually edited. **Regenerate after every schema migration** (currently done via Supabase dashboard export, not CLI — confirm which before assuming a regen command).
- Application domain types (`types/atlas.types.ts`) — camelCase, hand-authored, used throughout the app
- Transformation from snake_case → camelCase happens at the data fetching layer (hooks), never in components
- `projects.due_date` (`timestamp with time zone`, nullable) exists as of the Week 6 migration — mirrors `tasks.due_date`'s type exactly for consistency.
- **`profiles` intentionally has no `email` column, and should not gain one.** `email` already has one canonical home (`auth.users`, owned by Supabase Auth, with its own change/confirmation flow); duplicating it into `profiles` would create a second source of truth requiring an additional sync trigger to maintain indefinitely, and Postgres RLS is row-level, not column-level, so a broadly-readable `profiles` row (current SELECT policy: `using (true)`) can't safely carry a sensitive field like email without a much more complex column-scoped access setup. When member-invite-by-email is built, look the user up via a `SECURITY DEFINER` function that queries `auth.users` server-side and returns only the matched `user_id` — never the email itself — back to the client. See the RLS section below for the `SECURITY DEFINER`/`plpgsql` pattern this depends on.

### Active Link Detection
- Use `usePathname()` from `next/navigation`
- Root/Dashboard link (`href="/"`) — always strict equality: `pathname === "/"`
- All other links — prefix match: `pathname.startsWith(href)`
- Never use `pathname.startsWith("/")` — it matches every route
- Extract as a pure named function outside the component

### Dark Mode
- Implemented via `[data-theme="dark"]` on the `<html>` element
- On initial load: read `localStorage` first, fall back to `prefers-color-scheme`, then default to light
- Never use `@media (prefers-color-scheme: dark)` directly in component styles
- All color tokens are defined for both themes in `styles/tokens.css`

---

## Authentication (Supabase SSR)

- `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (Server Components/Actions) implement the `@supabase/ssr` `getAll`/`setAll` cookie pattern — do not recreate or duplicate these.
- **`proxy.ts`** (project root) is the only place that can both read and write cookies before rendering starts. Its jobs are two distinct things, not one:
  1. **Session refresh** — calling `getClaims()` triggers a refresh if the token is expiring; when a refresh occurs, `setAll` fires and must write to *both* `request.cookies` (so Server Components rendering later in the same request see the fresh token) and `response.cookies` (so the browser receives it). The response must be rebuilt via `NextResponse.next({ request })` *after* mutating the request, not before — omitting this causes intermittent, hard-to-reproduce stale-session renders. `setAll`'s second argument (`headers`, a `Record<string, string>` — confirmed from the installed `@supabase/ssr` types, containing `Cache-Control`/`Expires`/`Pragma`) must be applied to `response.headers` via `Object.entries(headers).forEach(...)` whenever a refresh occurs, or a refreshed session response can be cached by a CDN and served to a different user.
  2. **Route protection / redirect** — a separate, unrelated concern from session refresh; run `getClaims()` unconditionally on every request (it's cheap — see below), and only gate the *redirect* decision on whether the route is public.
  3. **When redirecting an unauthenticated user, always attach the originally-requested path (and its query string) as a `redirectTo` param** on the `/login` redirect — build this via `new URL("/login", request.url); url.searchParams.set("redirectTo", pathname + request.nextUrl.search)`, never manual string concatenation, since `URLSearchParams.set()` handles encoding automatically.
  4. `PUBLIC_PATHS` must include every route an unauthenticated user can legitimately reach, including non-page Route Handlers like `/auth` (covers `/auth/confirm` via prefix match) — a route added after `PUBLIC_PATHS` was last touched will silently be treated as protected and redirect away before its own logic ever runs. Check this list whenever a new top-level route is added.
- **Prefer `getClaims()` over `getUser()` over `getSession()`** for any server-side trust decision (middleware/proxy, protected Server Components):
  - `getSession()` reads the JWT from storage with no verification at all — never trust it for authorization.
  - `getClaims()` verifies the JWT signature — locally via WebCrypto/JWKS with no network call when the project uses asymmetric signing keys (Atlas uses ECC P-256, confirmed asymmetric), or via a network call if symmetric keys are ever configured. Use this by default.
  - `getUser()` makes a network call to fetch the live user record from the Auth server. Only reach for this if something depends on data that can change *between* token refreshes but isn't in the JWT's claims — Atlas currently has no such requirement.
- **Open-redirect guard**: any user-supplied redirect destination (e.g. a `redirectTo` form field or query param) must be validated by parsing it as a URL and comparing its resolved `origin` against the app's known base origin (`process.env.NEXT_PUBLIC_BASE_URL`) — never by string-prefix checks like `redirectTo.startsWith("/")`, which fails to reject protocol-relative URLs (`//evil.com` starts with `/` and browsers resolve it to `https://evil.com`). Wrap the `new URL()` parse in `try/catch` (malformed input throws) and default to a safe internal route on failure. On success, redirect using the relative path (`url.pathname + url.search + url.hash`), never the full absolute URL — an absolute URL pins navigation to whatever host was used to construct it, which breaks custom domains, preview deployments, and reverse proxies where the configured base host may not match the actual incoming request host.
- **Confirm `type` values for `verifyOtp` against current Supabase docs, not assumption** — the correct value for a standard signup confirmation link is `type=email` (confirmed against current official docs), not `type=signup` as an earlier iteration incorrectly assumed. `EmailOtpType` is a widened string type (`| (string & {})`), so TypeScript will not catch a wrong-but-plausible value here — verify against the docs and against what the actual dashboard email template sends.
- RLS policies are written and enabled on all four tables (`profiles`, `projects`, `project_members`, `tasks`). Do not treat "add RLS policies" as open work by default — check current policy state before assuming it needs to be written from scratch.
- Email confirmation: the Supabase dashboard template must use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so confirmation is handled server-side via `app/auth/confirm/route.ts` — this is required for App Router SSR, not optional.
- **Logout** is a Server Action (`app/(dashboard)/actions.ts`) — `'use server'`, calls `createClient()` from `lib/supabase/server.ts`, then `supabase.auth.signOut({ scope: "local" })` (current-device-only; `'global'` would sign the user out of every device, which is not the expected behavior for a single logout click), then `redirect("/")` — unconditional, outside any `try/catch`, same rule as every other auth action. `revalidatePath` is not needed here: it invalidates Next's built-in Data Cache (`fetch` with `cache: 'force-cache'`/`unstable_cache`), which Atlas doesn't use anywhere — all data flows through React Query, a client-side cache unaffected by `revalidatePath`. Wired via `<form action={logout}>` wrapping just the logout button in `Sidebar.tsx`, not an `onClick` handler — consistent with the rest of the app's use of real form actions for state-changing operations.

---

## Row Level Security (RLS)

- **A policy on table `X` must never query table `X` from within its own `USING`/`WITH CHECK` clause** (a self-join/self-reference), even indirectly through an alias. This causes Postgres to re-evaluate the same policy to satisfy its own subquery, infinitely, until Postgres detects the cycle and raises `42P17: infinite recursion detected in policy for relation "X"`. This is a confirmed, real bug that occurred on `project_members`'s own SELECT policy — it is a well-documented general Postgres/Supabase RLS gotcha, not specific to this codebase, but it's costly to hit in production, so review every new self-referencing policy for this before it ships.
- **The fix is a `SECURITY DEFINER` helper function — and it must be written `LANGUAGE plpgsql`, never `LANGUAGE sql`.** A `SECURITY DEFINER` function runs with its owner's privileges, bypassing RLS on its internal query, which breaks the cycle. However, Postgres's query planner can **inline** a simple `LANGUAGE sql` function directly into the calling policy at plan time — which silently discards the `SECURITY DEFINER` context, and the recursion returns despite looking fixed. `plpgsql` functions are never inlined, so this failure mode doesn't apply to them. Always write these as:
```sql
create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.project_members
    where project_id = _project_id
    and user_id = _user_id
  );
end;
$$;
```
- A single self-referencing policy fix on a table that other tables' policies also query through (e.g. `project_members`, referenced from `projects`'/`tasks`' own membership-check policies) can silently be blocking those *other* tables too — retest all dependent tables after fixing one recursive policy, not just the table where the error first surfaced.
- This same `SECURITY DEFINER`/`plpgsql` pattern is the intended mechanism for any future email-lookup-by-`auth.users` function (see Type System section above) — never expose `auth.users` to direct client queries.

---

## CSS Conventions

### The Hybrid Strategy
- Tailwind — layout structure (flex, grid), spacing (gap, padding, margin), and responsive breakpoints
- CSS Modules — component positioning, colors via token variables, animations, transitions, and complex state styles
- Never use Tailwind color classes (`bg-amber-500`, `text-zinc-700`) — always use token variables
- Never use Tailwind arbitrary value syntax for colors (`bg-[var(--color-accent)]`) — put it in a CSS Module instead

### Token Usage
- Always use CSS custom properties from `styles/tokens.css` for all visual values
- Never hardcode colors, font sizes, spacing values, border radii, or shadows
- If no appropriate token exists: flag it, propose a new token, and wait for approval before hardcoding
- There is currently no `--color-danger-hover` token. Do not invent a danger-family hover color for a link/element that isn't itself an error — reconsider whether the element should use `--color-accent` (and its existing `--color-accent-hover`) instead before proposing a new token.

### Token Reference
```css
/* Colors */
var(--color-background)
var(--color-surface)
var(--color-surface-raised)
var(--color-border)
var(--color-border-strong)
var(--color-text-primary)
var(--color-text-secondary)
var(--color-text-muted)
var(--color-text-on-accent)
var(--color-accent)
var(--color-accent-hover)
var(--color-accent-subtle)
var(--color-danger)
var(--color-success)
var(--color-warning)

/* Typography */
var(--font-sans)
var(--font-size-xs) through var(--font-size-5xl)
var(--font-weight-normal) through var(--font-weight-bold)
var(--line-height-tight) | var(--line-height-normal) | var(--line-height-relaxed)

/* Spacing — 4px base scale */
var(--space-1) through var(--space-20)

/* Border Radius */
var(--radius-sm)    /* 4px — badges, inputs, compact elements */
var(--radius-md)    /* 8px — cards, buttons */
var(--radius-lg)    /* 12px — modals, panels */
var(--radius-pill)  /* 9999px — chips, tags, pill buttons */

/* Shadows */
var(--shadow-sm)    /* cards */
var(--shadow-md)    /* dropdowns */
var(--shadow-lg)    /* modals */

/* Layout */
var(--sidebar-width)    /* 240px */
var(--header-height)    /* 56px */
```

### Dynamic Colors via CSS Custom Properties
When a color value is dynamic (e.g. user-specific avatar colors), use CSS custom properties set via inline style — never set color values directly as inline styles:

```tsx
// Correct — dynamic value via CSS custom property
<span
  style={{ "--avatar-bg": color.bg, "--avatar-text": color.text } as React.CSSProperties}
  className={styles.avatar}
/>

// Forbidden — inline color value
<span style={{ backgroundColor: color.bg }} />
```

Non-token hex colors are permitted only for UI-only accent hues with no semantic meaning (e.g. member avatar palette) that the token system cannot provide. Always add an inline comment explaining why.

### CSS Module Conventions
- One CSS Module per component: `ComponentName.module.css`
- Shared styles within a feature: `featureShared.module.css`
- Class names in camelCase: `.navLinkActive`, `.closeButton`
- Component positioning (fixed, absolute, sticky) always goes in CSS Modules
- Animation and transition styles always go in CSS Modules — never inline or Tailwind arbitrary values
- All interactive states (hover, focus-visible, active) defined in the CSS Module
- `focus-visible` with `outline: 2px solid var(--color-accent)` and `outline-offset: 2px` on every interactive element
- When a class shares interactive states (hover/focus-visible) with another class but has a different base style, extract only the shared states into a small composable class (e.g. `.accentLink`) applied via `` className={`${styles.baseClass} ${styles.accentLink}`} `` — keep each class's own base styles under its own section heading rather than splitting a single class's definition across two unrelated sections of the file. This pattern (composed classNames via template string) is established precedent in `ProjectCard.tsx` and `Sidebar.tsx`.
- Center a single line of text with `text-align: center` on a block-level element (or `display: block` + `text-align: center`) — not `display: flex; justify-content: center` for a single child, which works but reaches for flex machinery that isn't needed and can mislead a future reader into thinking multiple children are being arranged.
- **When a footer/action row must support an optional destructive action grouped separately from primary actions** (e.g. a Delete button on the left, Cancel + Save grouped on the right), use `justify-content: space-between` on the outer container and a `.footerActions` inner wrapper (`display: flex; gap; margin-left: auto`) around the right-hand group — this degrades cleanly (right-aligns normally) whether or not the left-side destructive action is present, with no conditional layout logic needed. See `EntityModal.module.css`'s `.footer`/`.footerActions` for the reference implementation.
- **Placeholder text for an empty/missing value in a compact display context (a table cell, a card detail row) should be an em dash (`—`), never a bare hyphen (`-`) or a raw string like `"NIL"`/`"N/A"`-as-code-smell.** A hyphen is visually easy to mistake for a minus sign or stray character; an em dash is the standard convention for "no value" and reads unambiguously at small sizes.

### Overlay and Transition Pattern
- Overlays (backdrops, drawers, modals, slide-overs) are always rendered in the DOM — visibility controlled via CSS, not conditional rendering
- Use `opacity: 0` + `pointer-events: none` for hidden state
- Use `opacity: 1` + `pointer-events: auto` for visible state
- Apply transitions on the base class, not the modifier class

```css
.backdrop {
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease-in-out;
}

.backdropVisible {
  opacity: 1;
  pointer-events: auto;
}
```

### Slide-over Panel Width
- Never use a fixed pixel width alone for slide-over panels
- Always use `width: 100%` + `max-width: Xpx` for responsive behavior

```css
.panel {
  width: 100%;
  max-width: 540px; /* or appropriate value */
}
```

### CSS Cascade Order
- Base styles must always be defined before media query overrides in the same file
- Media queries for the same breakpoint must be merged into a single block at the bottom of the file
- Never split the same breakpoint across multiple `@media` rules

### Responsive Breakpoints
- Mobile-first — base styles target mobile, `min-width` media queries enhance for larger screens
- Primary breakpoint for desktop layout: `min-width: 1024px` (lg) — aligns with Tailwind lg prefix
- Never use `max-width` media queries — they fight mobile-first architecture
- All JavaScript viewport checks must align with CSS breakpoints: `window.innerWidth < 1024` for lg

---

## Accessibility Standards

Accessibility is non-negotiable in Atlas. Every interactive component must pass a basic a11y audit before it is considered complete.

### Core Rules
- Semantic HTML first — use the correct element before reaching for ARIA
- Never add `role`, `aria-label`, or `tabIndex` to compensate for using the wrong element
- All interactive non-button elements must have `role="button"`, `tabIndex={0}`, and keyboard handlers for both `Enter` and `Space`
- All icon-only buttons must have `aria-label` describing the action
- All landmark elements (`<nav>`, `<aside>`, `<header>`, `<main>`) must have `aria-label`
- `focus-visible` styles on every interactive element — never suppress focus outlines
- **`<dt>`/`<dd>` have no defined meaning outside a `<dl>` ancestor — never use them standalone.** If a label/value pair (e.g. a due date row on a card) needs `dt`/`dd` semantics, wrap it in an actual (even single-row) `<dl>`, reusing shared list/row/label/value CSS classes rather than inventing a parallel `<span>`-based pattern that only exists in one component.

### Keyboard Interaction
- Every clickable element is reachable and operable by keyboard
- `onClick` and `onKeyDown` (Enter + Space) on all non-button interactive elements
- Prevent default on Space key to avoid page scroll: `e.preventDefault()`
- Escape key closes any open overlay, modal, dropdown, or slide-over
- **When multiple overlays can be open simultaneously and nested** (e.g. a slide-over containing a task modal, or a slide-over containing a delete-confirmation modal), each additional overlay needs its own guard added to the parent's Escape handler (`isOpen && !isModalOpen && !isDeleteModalOpen`) so Escape closes only the topmost overlay, not everything at once. Add a new guard condition every time a new nested overlay is introduced — don't assume the existing guards cover it.

### Table Accessibility
- Always use semantic table elements: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">`, `<td>`
- Never use divs to simulate table layout
- Empty header cells for icon-only columns must contain a visually hidden label
- Row-level click handlers must use `stopPropagation` on cell-level interactive elements to prevent double-firing

### Dropdown Menus
- Trigger button must have `aria-haspopup="menu"` and `aria-expanded={isOpen}`
- Dropdown container must have `role="menu"` and `aria-label`
- Each item must have `role="menuitem"`
- Two separate `useEffect` hooks for closing: one for Escape key, one for mousedown outside
- Use a `data-[menu-cell]` attribute on the containing cell for outside-click detection
- **Do not build a full dropdown-menu apparatus (state, trigger, Escape/outside-click handlers) for actions that are already one click away via an existing, working entry point** (e.g. a row that already opens a detail view containing the same actions). This is real, non-trivial surface area — only build it when it provides a genuinely new capability (e.g. bulk actions, or actions with no other entry point).

### Custom Select / Listbox (form fields)
For custom-styled select inputs (e.g. status dropdowns) that must participate in `useActionState`/`FormData` submission:
- Trigger button: `aria-haspopup="listbox"` and `aria-expanded={isOpen}`
- Options container: `role="listbox"`
- Each option: `role="option"` and `aria-selected={value === selected}`
- A `<input type="hidden" name="..." value={selected}>` carries the value into `FormData` — the visible trigger/options are presentational only
- Selected value and open/close state use local `useState`; this is the documented exception to "uncontrolled by default" for forms
- **The generic version of this pattern is `components/StatusBox.tsx`** — generic over a status value type `T extends string`, a `Record<T, { label: string; dotColor: string }>` config, and an ordered `T[]` array of valid values. `dotColor` is deliberately required, not optional — this component is status-specific by design, not a general-purpose listbox; do not widen it to support non-status use cases speculatively. If a genuine non-status listbox need arises later, that is the point to generalize further, not before.

### Overlay and Modal Components
- Sidebar container when open: `role="dialog"` + `aria-modal="true"` + `aria-label`
- On desktop where overlay is persistent: remove `role="dialog"` and `aria-modal`
- Apply `role` and `aria-modal` conditionally based on open state: `role={isOpen ? "dialog" : undefined}`
- Backdrop: `role="button"` + `aria-label="Close [component name]"` + `tabIndex={isOpen ? 0 : -1}`
- Never use `aria-hidden="true"` on a functional backdrop
- **The generic version of the modal shell is `components/EntityModal.tsx`** — a compound component (`.Header`, `.Title`, `.CloseButton`, `.Body`, `.Field`, `.Footer`, `.FooterActions`, `.CancelButton`, `.SubmitButton`) owning `useActionState`, focus trap, body scroll lock, and overlay a11y, generic over a form-state type via `<TFormState extends { error: string | null }>`. Uses `useId()` per-instance for `aria-labelledby` (not a static string constant) specifically because multiple `EntityModal` instances (a task modal, a project modal, a delete-confirmation modal) can exist as DOM siblings, and a shared static ID would break `aria-labelledby` for whichever instance loses the collision. Any new create/edit/confirm modal should be built on `EntityModal`, either directly or via a thin typed wrapper (see `TaskModal.tsx`), not from scratch.

### Focus Management
- When an overlay opens, move focus to the first focusable element inside it
- Implement focus trap on mobile overlays — Tab and Shift+Tab must cycle within the overlay
- Focus trap must be mobile-only for components that are persistent on desktop
- Slide-over panels are always overlays regardless of viewport — focus trap always active, no `window.innerWidth` guard needed
- Focusable element query: `'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'`
- Always clean up focus trap event listeners in the `useEffect` return function

### Body Scroll Lock
- Lock body scroll when a mobile overlay is open: `document.body.style.overflow = "hidden"`
- Add `touch-action: none` to the backdrop CSS Module for iOS Safari compatibility
- Guard with `window.innerWidth < 1024` for sidebar — never lock scroll on desktop for persistent elements
- Always restore in the `useEffect` cleanup: `document.body.style.overflow = ""`
- A modal nested inside another overlay that already holds the lock (e.g. `TaskModal`/the delete-confirmation modal inside `ProjectSlideOver`) must pass `disableScrollLock` — locking twice is harmless but redundant; the important failure mode to avoid is the *inner* modal unlocking on its own close while the *outer* overlay is still open.

---

## Testing Requirements

### Coverage Policy
- Every `lib/` utility gets a unit test file in `tests/unit/`
- Test files mirror the source path: `lib/fetcher.ts` → `tests/unit/fetcher.test.ts`
- Every new component gets tests where behaviour is non-trivial
- React Query hooks are technical debt for Week 8 — marked with `// TODO: add tests in Week 8`
- Integration tests live in `tests/integration/`
- E2E tests with Playwright live in `tests/e2e/`
- Note: `npm test` passing is not sufficient proof a change is safe for Next.js-specific concerns (e.g. `useSearchParams` Suspense requirements) — Jest does not run `next build`. Run `npm run build` after any change touching routing, Suspense boundaries, or static/dynamic rendering behavior, and confirm the relevant route's rendering mode (`○` static / `ƒ` dynamic) in the build output matches intent.
- **Some correctness properties cannot be verified by `npm test`/`npm run build` alone and require actual manual browser verification** — anything depending on real browser form-submission semantics (`FormData` construction, `useFormStatus()` behavior across sibling buttons), real session/cookie timing (`proxy.ts` refresh behavior), or real RLS enforcement against live Supabase data. When a fix touches any of these, describe the exact manual steps to verify and report what was actually observed — not just that automated checks passed.

### Test Writing Standards
- AAA pattern — Arrange, Act, Assert — every test, every time
- One logical guarantee per `it` block — one clear assertion of behaviour
- Descriptive test names that complete the sentence "it should..."
- `beforeEach` for shared setup — never repeat Arrange code across tests
- Extract shared fixtures and constants above the `describe` block

### Async Testing
- Mock `fetch` globally with `jest.fn()` for all HTTP tests
- Use `jest.useFakeTimers()` for any test involving delays, retries, or timeouts
- Always restore real timers in `afterEach`: `jest.useRealTimers()`
- Use `jest.runAllTimersAsync()` to advance fake timers through async operations
- Chain `.mockResolvedValueOnce()` for multiple sequential fetch responses
- Use `mockRejectedValueOnce(new Error(...))` for rejection tests — always throw `Error` objects, never bare strings

### Component Testing
- Use `@testing-library/react` — `render`, `renderHook`, `act`, `screen`
- Add `@jest-environment jsdom` directive at top of component test files
- Mock `window.matchMedia` and `window.localStorage` for components that use them
- Use CSS custom properties pattern for dynamic color tests

### Immutability Testing
- Always assert that the original input is unchanged after a function call
- Assert reference inequality: `expect(result).not.toBe(original)`
- Assert value equality: `expect(result).toEqual(expected)`

---

## Documentation Standards

### Inline Documentation
- JSDoc on all exported functions — `@param`, `@returns`, `@template` where applicable
- Inline comments only for non-obvious logic or deliberate decisions
- No comments that restate what the code already says
- TODO comments for planned work: `// TODO: wire to Supabase auth logout`
- Non-token hex colors must have an inline comment explaining why they exist outside the token system
- When a portfolio-scope simplification is deliberately made (e.g. collapsing several distinct failure modes into one generic error message), document it as a decision with a `// TODO` or comment stating what a fuller implementation would add and why it's out of scope now — this converts "looks like an oversight" into "documented, deliberate scope decision," which is the signal a reviewer should see.
- If a file's actual behavior is broader or narrower than its own JSDoc claims (e.g. a route that generically handles multiple cases while its doc comment describes only one), fix the mismatch — either narrow the code to match the doc, or update the doc to accurately describe what the code does and why it's written that way. Documentation that contradicts the code it describes is treated as a defect, not a style nit.
- **A hidden `<input>` or other non-obvious DOM element added purely to carry signal to another part of the code must have a comment explaining what reads it and why** — otherwise it reads as dead/arbitrary markup to a future editor, who may "clean it up" and silently reintroduce whatever bug it exists to prevent. (Note: the hidden-marker-input approach for delete/save disambiguation was itself replaced by the `useFormStatus().action` identity-check pattern — see Form Data Handling — precisely because it was fragile. This rule still applies to any other hidden-element-as-signal pattern that may come up.)
- **Any deliberate architectural asymmetry (two similar things built differently on purpose) should have both a short in-code comment at the point of divergence and a corresponding entry in `docs/decisions.md`** explaining the reasoning — see Component Composition above for the `TaskModal`/`ProjectModal` example. This is what distinguishes "the team clearly reasoned about this" from "this looks inconsistent" to a reviewer.

### Docs Folder
- `docs/` contains architectural documentation — not tutorials or guides
- Each document explains decisions, tradeoffs, and patterns — not just what, but why
- Docs are living documents — update them when decisions change
- Current: `docs/js-execution.md`, `docs/performance.md`, `docs/styles.md`
- Planned: `docs/security.md`, `docs/a11y.md`, `docs/architecture.md`
- `docs/decisions.md` — architectural decisions and their rationale; entries pending as of this update: (1) the `TaskModal`/`ProjectModal` compound-vs-non-compound asymmetry, (2) the `CreateTaskInput`/task-creation-form status-field scope clarification below.

### A note on `CreateTaskInput`/`CreateProjectInput` and status
- The rule *"`CreateTaskInput`/`CreateProjectInput` do NOT include status — factories default to `todo`/`active`"* refers specifically to `lib/entityFactory.ts`'s `createTask`/`createProject` functions (used for local/offline entity construction) — it does not describe the live Supabase-backed create forms. `TaskModal`'s `StatusField`/`ProjectModal`'s status field **do** let a user select a status at creation time (defaulting to `todo`/`active`, but overridable), which is intentional current UI behavior, not a violation of the factory rule. Do not conflate the two — the factory-input-type constraint and the form's actual field set are two different, independently-decided things. If this is ever revisited to make the two consistent, that's a deliberate product decision to make explicitly, not an unintentional gap to silently "fix."

---

## Debugging Standards

### The 4-Step Process
All bugs must follow this process — no exceptions, no shortcuts:
1. Reproduce — confirm the bug is consistent and triggerable on demand
2. Isolate — find the smallest code path that still exhibits the bug
3. Hypothesize — form one specific, testable guess about the cause
4. Verify — prove or disprove with a tool, not intuition

### Tool Selection by Bug Type
- Sync logic errors → VSCode debugger breakpoints + unit tests
- Async and timing bugs → VSCode debugger + Jest fake timers
- Stale closures → VSCode debugger Closure panel in Variables
- Memory leaks → Chrome Memory tab heap snapshots
- Re-render issues → React DevTools Profiler
- `console.log` is a last resort — never committed to production code

### Scheduled Debugging Sessions
- End of Week 3 — first UI built
- End of Week 5 — React patterns complete
- End of Week 7 — production hardening

---

## Lib Utility Patterns

### Factory Functions
- Factory functions return plain objects — not class instances
- Input types use dedicated `CreateEntityInput` types — never individual parameters for 3 or more args
- Auto-generated fields (`id`, `createdAt`, `status`) are never part of the input type
- `id` always generated with `crypto.randomUUID()`
- `createdAt` always set with `new Date()`
- Default status values set inside the factory — never left to the caller
- See the note under Documentation Standards above — this section describes `entityFactory.ts` specifically, and does not constrain the live Supabase-backed form fields in `TaskModal`/`ProjectModal`.

### Immutable Updates
- Never use `Object.assign` with the entity as the target
- Always spread: `{ ...entity, ...changes }`
- `getState()` on closure-based stores always returns a copy: `{ ...state }`
- `reset()` and `logout()` always spread from `initialState`: `{ ...initialState }`
- `updateProject`/`updateProjectStatus`/`updateTask`/`updateTaskStatus` (all in `lib/updateImmutable.ts`, exported from the `lib/index.ts` barrel) are the established general-update-vs-status-update split — `updateProjectStatus`/`updateTaskStatus` exist specifically so status changes never go through the generic `changes: Partial<...>` path, keeping status a controlled, single-purpose update.

### Async Utilities
- `fetcher` handles both network failures (thrown exceptions) and server failures (`response.ok === false`) explicitly
- Retry logic applies only to network failures and 5xx server errors — never to 4xx errors
- All errors normalized to `FetchError` discriminated union before leaving `fetcher`
- `asyncQueue` uses `.finally()` for slot release — guarantees cleanup on both resolve and reject

### Cache
- `createCache` always initialized with explicit `maxSize` and `ttl`
- LRU eviction: delete then reinsert to move entry to end of Map insertion order
- Lazy expiration: check TTL on `get`, not on a background timer
- `createdAt` never refreshed on access — tracks when data was cached, not last read

### Data Transformation
- `toCamelCase<T>` in `lib/utils.ts` transforms snake_case database responses to camelCase application types
- `parseDates<T>` in `lib/utils.ts` converts specified date-bearing keys from Postgres timestamp strings into real `Date` instances — always call immediately after `toCamelCase` at the hook level (see Date and Timezone Handling above)
- Always transform at the hook level — never in components or pages
- `truncateDescription(text, maxLength)` for JS-based text truncation in table cells — more reliable than CSS line-clamp in constrained layouts
- Feature-specific display utilities (`getInitials`, `getMemberAvatarColor`, `STATUS_LABELS`, `DUE_DATE_FORMAT`) live in `features/[feature]/[feature]Utils.ts`
- Cross-feature or hook-level utilities live in `lib/utils.ts`

---

## Forbidden Patterns

These patterns must never appear in Atlas code under any circumstances:

```typescript
// Any type
const data: any = response;

// Default export on utilities and components
export default function createCache() {}
export default function Sidebar() {}

// Direct mutation
state.title = "New Title";
tasks.push(newTask);
Object.assign(entity, changes);

// Hardcoded color values
style={{ color: "#ea8c00" }}
background: #fafafa;

// Tailwind color classes
className="bg-amber-500 text-zinc-700"

// Tailwind arbitrary color values
className="bg-[var(--color-accent)]"

// Inline color styles — use CSS custom properties instead
<span style={{ backgroundColor: color.bg }} />

// export * in barrel files
export * from "./fetcher";

// console.log in production code
console.log("debug:", data);

// Async useEffect callback
useEffect(async () => { ... }, []);

// useEffect without cleanup for async work
useEffect(() => {
  fetcher("/api/data").then(setData);
}, []);

// aria-hidden on functional elements
<div aria-hidden="true" onClick={onClose} />

// Focus trap without mobile guard (sidebar only — not for slide-overs)
useEffect(() => {
  trapFocus(sidebarRef); // activates on desktop too
}, [isOpen]);

// Body scroll lock without mobile guard (sidebar only)
document.body.style.overflow = "hidden";

// Conditional rendering of animated overlays
{isOpen && <div className={styles.backdrop} />}

// role="dialog" on persistent desktop components
<aside role="dialog">

// startsWith on root path
pathname.startsWith("/")

// Bare string throws in tests
throw "error message";

// Hardcoded breakpoint misaligned with Tailwind lg
window.innerWidth < 768

// Fixed pixel width on slide-over panels
width: 480px; /* use width: 100%; max-width: 540px; instead */

// Duplicating styles across component modules in the same feature
/* ProjectCard.module.css */
.memberAvatar { width: 34px; ... }
/* ProjectListTable.module.css */
.memberAvatar { width: 34px; ... } /* extract to projectShared.module.css */

// Divs simulating table layout
<div className="table-row"> /* use <tr>, <td> etc. */

// Split media queries for the same breakpoint
@media (min-width: 1024px) { .a { ... } }
/* other styles */
@media (min-width: 1024px) { .b { ... } } /* merge into one block */

// Media query before base style it overrides
@media (min-width: 1024px) { .button { display: none; } }
.button { display: flex; } /* overrides the media query above */

// Unguarded FormData access in a Server Action, Route Handler, or client action
const email = formData.get("email") as string; // no null/empty guard
const title = (formData.get("title") as string).trim(); // throws if null

// String-prefix open-redirect check (fails to reject protocol-relative URLs)
if (redirectTo.startsWith("/")) { redirect(redirectTo); } // "//evil.com" passes this check

// redirect() from next/navigation inside a Route Handler (use NextResponse.redirect() instead)
// or NextResponse.redirect() inside a Server Action (use redirect() instead)

// Wrapping redirect() in try/catch, or wrapping it before all error-return branches
try {
  redirect(destination); // must never be caught
} catch {}

// Deciding UI logic by substring-matching a human-readable error message
{state.error.includes("already exists") && <Link href="/login">Sign in</Link>}
// use a structured boolean field on the action state instead

// Using middleware.ts on Next.js 16 (deprecated — use proxy.ts / export function proxy)

// A self-referencing RLS policy (querying its own table from within its own USING clause)
create policy "x: members can read" on public.x for select
  using (exists (select 1 from public.x ...)); // infinite recursion — use a SECURITY DEFINER plpgsql function instead

// A SECURITY DEFINER function written as LANGUAGE sql for a self-referencing policy check
-- gets inlined by the planner, silently loses the SECURITY DEFINER context, recursion returns
create function is_admin(...) returns boolean language sql security definer as $$ ... $$;
-- use `language plpgsql` instead

// Storing a full entity snapshot in Context/lifted state when it's also managed by React Query
const [selectedProject, setSelectedProject] = useState<Project | null>(null);
// store selectedProjectId instead, derive the live object via .find() against query data

// Hidden marker input used to disambiguate which action is pending in a shared form
<input type="hidden" name="_action" value="delete" /> // vulnerable to going stale — use action reference identity via useFormStatus().action instead

// Redirecting to a route that doesn't exist post-route-groups
redirect("/dashboard"); // app/(dashboard)/page.tsx renders at "/", not "/dashboard" — use "/"

// Displaying a date-only value (due date) with the same format object used for real timestamps, with no explicit timeZone
const format = { year: "numeric", month: "long", day: "numeric" }; // no timeZone: "UTC" — shifts a day for viewers behind UTC
```

---

## Final Reminder

Atlas is reviewed by potential employers as both a codebase and a portfolio artifact. Every file, every comment, every test, and every decision is a signal. Code quality, documentation, test coverage, accessibility, and architectural consistency are evaluated as a whole.

When in doubt, ask. Never ship code you cannot explain line by line.