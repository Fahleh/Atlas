@AGENTS.md

# CLAUDE.md — Atlas Engineering Brief

This file defines how Claude Code operates within the Atlas project.
Read it fully before writing any code. Follow every rule without exception.
This is a living document — it is updated as new patterns are established.

---

## Project Context

**Atlas** is a production-grade Project Management Dashboard built as a senior-level portfolio project. It is not a prototype or a learning exercise. Every line of code must be production-ready, explainable, and defensible in a technical interview.

**Stack:**
- Next.js 15 (App Router) + TypeScript (strict mode)
- Tailwind CSS + CSS Modules (hybrid strategy)
- Supabase (PostgreSQL, auth, real-time subscriptions)
- TanStack React Query v5 (client-side data fetching)
- Jest (unit + integration tests)
- Playwright (E2E tests — Week 8)
- lucide-react (icons)
- Inter (font via next/font)

**Goal:** Demonstrate senior frontend engineering judgment across the full stack — not just working code, but correct, maintainable, well-documented, well-tested, and accessible code. Every file is a signal to a potential employer.

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
Before providing any how-to steps, walkthrough, or implementation guidance for any third-party tool, library, or platform (Supabase, Next.js, Vercel, Playwright, TanStack, or any other), always search the official documentation and leading community sources to confirm the current recommended approach. Never rely on training data for third-party implementation details.

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
- Named exports everywhere — default exports only where Next.js requires them (page and layout components)

### Functions
- Pure functions wherever possible — no side effects on external state
- Input objects over individual parameters for functions with 3 or more arguments
- Direct returns over unnecessary intermediate variable declarations for simple expressions
- JSDoc on all exported functions — include `@param`, `@returns`, and `@template` where applicable
- Inline comments only for non-obvious logic — never for self-explanatory code
- Static data (nav items, config arrays, status maps) defined outside the component — never inside render

### React Components
- Client Components (`"use client"`) only when the component uses hooks, browser APIs, or event handlers
- Server Components by default — never add `"use client"` unnecessarily
- Props typed with a dedicated `type ComponentNameProps` — never inline prop types
- Each `useEffect` handles one concern only — never combine unrelated side effects
- Every `useEffect` that performs async work or attaches listeners must return a cleanup function — no exceptions
- Never use `async` directly as a `useEffect` callback — use an inner async function
- State updates inside `useEffect` must be guarded with a `cancelled` flag for async operations

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
- **Inputs are uncontrolled by default** — use `name` + `defaultValue`, read via `formData.get("fieldName")` inside the action. Reserve controlled `useState` for custom widgets that don't map to native form elements (custom dropdowns, date pickers) — these participate via a hidden `<input type="hidden" name="..." value={...}>`.
- **Pending/loading state**: use `useFormStatus()` in a child component rendered inside the `<form>` — never prop-drill `isPending`. `useFormStatus` cannot be called in the component that renders the `<form>` element itself.
- **Validation**: HTML attributes (`required`, `type`, `minLength`, etc.) for instant client feedback; re-validate inside the action function before calling any mutation.
- **Optimistic UI**: use `useOptimistic` for instant feedback on mutations where the eventual server state is predictable (e.g. marking a task done).
- **Mutations**: the action function calls the React Query `mutateAsync` (Supabase create/update/delete) and returns `{ error: string | null }` (or similar) as the action state. On success, invalidate the relevant query key and close any modal.
- Before implementing any new form or mutation flow, confirm against the current React 19 docs (react.dev) that the pattern is still current — React's Actions APIs are actively evolving across minor versions.

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

## Architecture Decisions

These decisions are final unless explicitly reopened for discussion.

### Folder Structure
```
atlas/
├── app/
│   ├── (auth)/           — login, signup — standalone layout, no shell
│   └── (dashboard)/      — all authenticated pages — shell layout
├── components/           — globally reusable UI components (Sidebar, Header)
├── features/             — feature-specific components, styles, and utilities
│   └── projects/
│       ├── ProjectList.tsx
│       ├── ProjectList.module.css
│       ├── ProjectCard.tsx
│       ├── ProjectCard.module.css
│       ├── ProjectListTable.tsx
│       ├── ProjectListTable.module.css
│       ├── ProjectStats.tsx
│       ├── ProjectStats.module.css
│       ├── ProjectSlideOver.tsx
│       ├── ProjectSlideOver.module.css
│       ├── projectShared.module.css  — styles shared across feature components
│       └── projectUtils.ts           — display utilities scoped to this feature
├── hooks/                — custom React hooks
├── lib/                  — shared utilities
│   ├── asyncQueue.ts
│   ├── createCache.ts
│   ├── createCounter.ts
│   ├── createStore.ts
│   ├── entityFactory.ts
│   ├── errorHandler.ts
│   ├── fetcher.ts
│   ├── updateImmutable.ts
│   ├── utils.ts          — shared transformation utilities (toCamelCase etc.)
│   ├── supabase/
│   │   ├── client.ts     — browser client
│   │   └── server.ts     — server client
│   └── index.ts          — barrel file, explicit named exports only
├── providers/            — context providers and infrastructure wrappers
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx
│   └── ProjectContext.tsx
├── styles/
│   ├── tokens.css        — single source of truth for all design tokens
│   └── global.css        — reset, base styles, token import
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── types/
│   ├── atlas.types.ts    — camelCase domain types
│   └── database.types.ts — generated from Supabase schema
└── docs/
```

### Feature Folder Structure
- Feature-specific components live in `features/[feature]/` — not in `components/`
- `components/` is reserved for globally reusable UI with no feature coupling
- Each feature folder may contain a shared styles file (`featureShared.module.css`) and a shared utilities file (`featureUtils.ts`) when multiple components within the feature share styles or logic
- Extract shared styles to a shared module rather than duplicating across component modules within the same feature
- If a utility is needed across multiple features, move it to `lib/utils.ts`

### Utility Location Rules
- `lib/utils.ts` — transformation utilities used by hooks or multiple features (e.g. `toCamelCase`)
- `features/[feature]/[feature]Utils.ts` — display utilities scoped to one feature (e.g. `getInitials`, `getMemberAvatarColor`, `STATUS_LABELS`)
- If a feature-scoped utility is later needed by another feature, move it to `lib/utils.ts` at that point

### Route Groups
- `(auth)` — login, signup. No sidebar or header. Standalone layout.
- `(dashboard)` — all authenticated pages. Shell layout with Sidebar and Header.
- Route group folders use parentheses and do not appear in the URL.

### Exports
- Named exports on all utilities and components
- Default exports only for Next.js page and layout components
- Barrel file at `lib/index.ts` — only explicitly listed named exports, never `export *`

### State Management
- Closure-based stores (`lib/createStore.ts`) for auth/session state
- React Context for feature-scoped shared state
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
- All Supabase responses transformed from snake_case to camelCase at the hook level using `toCamelCase` from `lib/utils.ts`
- Independent async operations always run in parallel with `Promise.all` or `Promise.allSettled`
- Hooks use `enabled: !!param` to prevent queries firing with invalid or missing parameters
- Mock data used in hooks pending auth implementation — always marked `// TODO: remove mock data when auth is implemented`
- Default staleTime: 60 seconds globally in `QueryProvider`, overridden per hook where appropriate

### Type System
- Database types (`types/database.types.ts`) — snake_case, generated from Supabase, never manually edited
- Application domain types (`types/atlas.types.ts`) — camelCase, hand-authored, used throughout the app
- Transformation from snake_case → camelCase happens at the data fetching layer (hooks), never in components

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
var(--font-size-xs) through var(--font-size-3xl)
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

### Keyboard Interaction
- Every clickable element is reachable and operable by keyboard
- `onClick` and `onKeyDown` (Enter + Space) on all non-button interactive elements
- Prevent default on Space key to avoid page scroll: `e.preventDefault()`
- Escape key closes any open overlay, modal, dropdown, or slide-over

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

### Custom Select / Listbox (form fields)
For custom-styled select inputs (e.g. status dropdowns) that must participate in `useActionState`/`FormData` submission:
- Trigger button: `aria-haspopup="listbox"` and `aria-expanded={isOpen}`
- Options container: `role="listbox"`
- Each option: `role="option"` and `aria-selected={value === selected}`
- A `<input type="hidden" name="..." value={selected}>` carries the value into `FormData` — the visible trigger/options are presentational only
- Selected value and open/close state use local `useState`; this is the documented exception to "uncontrolled by default" for forms

### Overlay and Modal Components
- Sidebar container when open: `role="dialog"` + `aria-modal="true"` + `aria-label`
- On desktop where overlay is persistent: remove `role="dialog"` and `aria-modal`
- Apply `role` and `aria-modal` conditionally based on open state: `role={isOpen ? "dialog" : undefined}`
- Backdrop: `role="button"` + `aria-label="Close [component name]"` + `tabIndex={isOpen ? 0 : -1}`
- Never use `aria-hidden="true"` on a functional backdrop

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

---

## Testing Requirements

### Coverage Policy
- Every `lib/` utility gets a unit test file in `tests/unit/`
- Test files mirror the source path: `lib/fetcher.ts` → `tests/unit/fetcher.test.ts`
- Every new component gets tests where behaviour is non-trivial
- React Query hooks are technical debt for Week 8 — marked with `// TODO: add tests in Week 8`
- Integration tests live in `tests/integration/`
- E2E tests with Playwright live in `tests/e2e/`

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

### Docs Folder
- `docs/` contains architectural documentation — not tutorials or guides
- Each document explains decisions, tradeoffs, and patterns — not just what, but why
- Docs are living documents — update them when decisions change
- Current: `docs/js-execution.md`, `docs/performance.md`, `docs/styles.md`
- Planned: `docs/security.md`, `docs/a11y.md`, `docs/architecture.md`, `docs/decisions.md`

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

### Immutable Updates
- Never use `Object.assign` with the entity as the target
- Always spread: `{ ...entity, ...changes }`
- `getState()` on closure-based stores always returns a copy: `{ ...state }`
- `reset()` and `logout()` always spread from `initialState`: `{ ...initialState }`

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
- Always transform at the hook level — never in components or pages
- `truncateDescription(text, maxLength)` for JS-based text truncation in table cells — more reliable than CSS line-clamp in constrained layouts
- Feature-specific display utilities (`getInitials`, `getMemberAvatarColor`, `STATUS_LABELS`) live in `features/[feature]/[feature]Utils.ts`
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
```

---

## Final Reminder

Atlas is reviewed by potential employers as both a codebase and a portfolio artifact. Every file, every comment, every test, and every decision is a signal. Code quality, documentation, test coverage, accessibility, and architectural consistency are evaluated as a whole.

When in doubt, ask. Never ship code you cannot explain line by line.