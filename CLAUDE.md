@AGENTS.md

# CLAUDE.md — Atlas Engineering Brief

This file defines the essential project-wide rules for Claude Code within
Atlas. Read it fully before writing code.

## Task-Specific Documentation Routing

Read only the documents relevant to the current task before proposing or
implementing changes:

- `docs/architecture.md` — folder boundaries, state management, data fetching,
  query batching, types, utilities, and system structure.
- `docs/frontend.md` — React, React 19 forms/actions, CSS, responsive behavior,
  accessibility, overlays, modals, and frontend UI patterns.
- `docs/database.md` — Supabase schema, RLS, grants, migrations, Storage,
  foreign keys, and date/time handling.
- `docs/testing.md` — coverage policy, tests, build verification, browser
  verification, and debugging.
- `docs/auth.md` — Next.js request interception, `proxy.ts`, Supabase SSR
  cookies, session refresh, redirects, route protection, and cross-user
  cache isolation.

`docs/deployment.md` is reserved for CI/CD, hosting, and environment
configuration once Atlas has any; it holds no real content yet. `docs/security.md`
is reserved for security topics broader than authentication and is not yet
written.

Read multiple documents for cross-cutting tasks. Do not load every document by
default merely because it exists.

Atlas documentation is living documentation. Update the relevant document when
a pattern, implementation, or architectural decision changes. Do not leave
documentation describing behavior that no longer exists.

---

## Project Context

**Atlas** is a production-grade Project Management Dashboard built as a
senior-level portfolio project. It is not a prototype or learning exercise.
Every line of code must be production-ready, explainable, maintainable,
accessible, testable where appropriate, and defensible in a technical interview.

### Stack

- Next.js 16, App Router
- React 19
- TypeScript, strict mode
- Tailwind CSS + CSS Modules
- Supabase: PostgreSQL, Auth, Storage, realtime
- TanStack React Query v5
- Jest
- Playwright, deferred and not yet started
- lucide-react
- Inter via `next/font`

### Version-sensitive rule

The root request-interception file is `proxy.ts`, exporting
`async function proxy(request: NextRequest)`. Do not create `middleware.ts`.
Translate older tutorials and examples to the installed Next.js 16 convention.

---

## Mode of Operation

### Propose before implementing

For any non-trivial task:

1. Propose two or three viable approaches.
2. Recommend one and explain why.
3. Wait for the engineer's decision before writing code.

Proceed without waiting only for genuinely unambiguous, small changes such as a
typo or missing import. State what was changed.

### Raise disagreements

When an existing pattern conflicts with a better approach:

- Do not silently follow the existing pattern.
- Do not silently replace it.
- Explain the conflict and tradeoffs.
- Wait for a decision.

### Stay collaborative

The engineer is present and involved. Ask questions, flag uncertainty, and
surface assumptions. Never make a consequential silent assumption.

### Verify third-party behavior

Before giving implementation guidance for Next.js, React, Supabase, Vercel,
Playwright, TanStack Query, or another third-party tool:

1. Check the installed version in `package.json`.
2. Read current official documentation for that version.
3. Use leading community sources only as supporting material.
4. When documentation is silent or ambiguous, inspect source code, runtime
   implementation, or installed type definitions.
5. Clearly separate confirmed behavior from inference.

Do not present a workaround as the definitive answer when the underlying
behavior has not been confirmed.

### Verify claims before stating them

Do not claim a file's contents, a tool call's result, a fix's behavior, a
passing command, a route's rendering mode, or an observed browser behavior
unless it was actually observed in this session or supplied directly by the
engineer.

An empty or unusable fetch is a failed fetch. Say so.

### Fix root causes

Every implementation must reflect senior-level, industry-standard practice.
Address the underlying cause rather than masking the visible symptom.

Examples:

- Add a missing database `GRANT`; do not loosen RLS.
- Close a race condition at its source; do not add timing hacks.
- Fix stale `useActionState` by keying the component to force a genuine
  remount when the real cause is a parent that never unmounts; do not paper
  over it with a manual reset workaround.

---

## Global Code Standards

### TypeScript

- Strict mode, no exceptions.
- Never use `any`.
- Use `unknown` only when necessary. Add
  `// TODO: type this properly` when it is a temporary compromise.
- Raise type decisions with broad codebase impact before implementing them.
- Prefer `type` for data shapes and aliases.
- Prefer `interface` for extension points.
- Use discriminated unions for error types and state variants.
- Explicitly export all public types and interfaces.
- Use dedicated prop types: `type ComponentNameProps`.
- Named exports everywhere except Next.js page and layout components.
- File-local helpers that are never imported are not part of the module's export
  surface. Convert them to named exports if another file imports them.

### Functions and comments

- Prefer pure functions.
- Use an input object for functions with three or more arguments.
- Prefer direct returns for simple expressions.
- Put static data outside component render functions.
- Add JSDoc to exported functions, including `@param`, `@returns`, and
  `@template` where applicable.
- Comments explain the non-obvious **why**, never the obvious **what**.
- Inline comments (`//` or CSS `/* */`) are 1-2 lines maximum. Incident
  history, rejected alternatives, upstream issue references, and other long
  rationale belong in `docs/decisions.md` instead, with a short pointer left
  in the code, not the full explanation inline.
- Exception: derivation math for a computed value (e.g. token-arithmetic
  pixel heights) may exceed 2 lines if it must stay next to the value to
  remain useful. Rationale and incidents still go to `docs/decisions.md`
  regardless of length.
- Fix documentation that contradicts the code.
- A deliberate architectural asymmetry needs:
  - a short comment at the divergence point; and
  - an entry in `docs/decisions.md`.

### General implementation rules

- No `console.log` in production code.
- No hardcoded magic numbers; use tokens or named constants.
- No direct DOM mutation outside designated utilities.
- Composition over inheritance.
- Immutable updates only.
- Use `crypto.randomUUID()` for generated IDs.
- Use `Date.now()` for timestamp arithmetic.
- Use `new Date()` for display values.
- Run independent asynchronous operations in parallel with `Promise.all` or
  `Promise.allSettled`.
- Do not leave inert buttons or menu items once an equivalent working feature
  exists elsewhere. Remove dead affordances rather than preserving traps.

---

## Form Data Safety

These rules apply to Server Actions, Route Handlers, and client-side form
actions.

- Treat every `formData.get(field)` as `string | null`.
- Never cast directly with `as string`.
- Guard missing and empty values before use.
- Use `!value?.trim()` when null and empty can be treated the same.
- Do not trim passwords.
- Re-validate server-side even when HTML validation attributes exist.
- Validate raw strings against union types with dedicated type guards.
- Derive valid values from the union's single source of truth.
- Prefer structured state such as `accountExists: boolean` over matching text in
  human-readable error messages.
- Match Supabase Auth failures using documented `error.code` values, never
  `error.message`.

Detailed React 19 form and action patterns live in `docs/frontend.md`.

---

## Documentation Standards

### Inline documentation

- JSDoc on exported functions.
- Inline comments only for non-obvious logic or deliberate decisions.
- TODO format: `// TODO: describe the planned work`.
- Explain any non-token hex color inline.
- Document deliberate portfolio-scope simplifications and what a fuller
  implementation would add.
- Hidden inputs or non-obvious DOM signals must explain what reads them and why.

### Documentation locations

- `docs/` contains architectural documentation, not tutorials.
- Documents explain decisions, tradeoffs, and patterns.
- Update docs in the same work session as the code they describe.
- Read each document directly; do not rely on summaries in another file.
- `docs/decisions.md` owns architectural decision records.
- `docs/roadmap.md` owns intentional deferrals and remaining work.

---

## High-Signal Forbidden Patterns

Never introduce these patterns:

```typescript
const data: any = response;

export default function Utility() {}

export * from "./fetcher";

state.title = "New Title";
tasks.push(newTask);
Object.assign(entity, changes);

console.log("debug", data);

useEffect(async () => {}, []);

const email = formData.get("email") as string;

if (redirectTo.startsWith("/")) redirect(redirectTo);

pathname.startsWith("/");

throw "error";

redirect("/dashboard");
```

Every domain-specific forbidden pattern (CSS/Tailwind, RLS, redirect primitives,
React state, accessibility) is documented, with reasoning and correct
alternatives, in its own topic document. Read the relevant document rather
than expecting this file to restate it.

---

## Final Reminder

Atlas is reviewed as both a codebase and a portfolio artifact. Code,
documentation, testing, accessibility, security, and architectural consistency
are evaluated together.

When in doubt, ask. Never ship code you cannot explain line by line.
