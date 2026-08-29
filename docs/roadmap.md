# Atlas Roadmap

> Last updated: August 2026

This document tracks what's intentionally *not* built yet, split into two
genuinely different categories. Conflating them was an earlier mistake in
this file's drafting, worth naming so it doesn't happen again: "not built
yet" and "deferred to a future version" are not the same thing. Only put
something under "Deferred to v2" if it is truly out of scope for the
version currently being built, not just sequenced later in this version's
own plan.

---

## Current version, remaining work (in planned order)

1. **Screen reader testing.** No automated or manual screen reader testing
   (NVDA, VoiceOver, JAWS) has been performed against any part of the app.
   Every ARIA pattern in `docs/a11y.md` and `docs/frontend.md` has been
   built to the documented WAI-ARIA specification, but none of it has been
   verified against a real assistive-technology tool.

2. **Color contrast audit.** No formal WCAG contrast ratio check has been
   run against the token palette in either light or dark mode. The palette
   was chosen for aesthetic and brand reasons (see `docs/decisions.md`),
   not verified against AA contrast minimums.

3. **Production-build Trusted Types E2E coverage.** No test, unit or E2E,
   runs the production build with Trusted Types enforced and confirms a
   real script chunk load succeeds. The current E2E suite (`tests/e2e/`)
   runs against `npm run dev` via `playwright.config.ts`'s `webServer`,
   and Trusted Types enforcement is production-only (see
   `docs/decisions.md`), so the existing suite cannot catch a regression
   here without a separate production-build run. The validator is now one
   shared implementation covering both real chunk-path shapes (see
   `docs/decisions.md`), so a local `npm run build && npm run start` E2E
   run would exercise the real production code, just against the local
   shape, `/_next/static/chunks/`, not the Vercel `immutable/` shape.
   Confirming the `immutable/` branch actually validates against genuine
   Vercel-served HTML needs a real preview deployment, local build output
   never produces that shape. Proposed shape: a separate Playwright
   project or `webServer` config that builds and starts the production
   server locally, with a `securitypolicyviolation` listener attached,
   asserting zero violations during a real login, covering the shared
   mechanism and the local branch. A pre-merge smoke check against an
   actual Vercel preview deployment is the only way to confirm the
   Vercel-specific `immutable/` branch before this reaches production
   again, a separate check the local E2E run cannot provide. Not yet
   scheduled, sequencing relative to the items above still to be decided.

---

## Deferred to v2 (out of scope for the current version)

- **Ownership transfer.** Reassigning `projects.owner_id` and the
  corresponding `project_members` role from one user to another. Deferred
  because it needs its own design pass: who can initiate it, what
  confirmation flow is required, and what happens to the outgoing owner's
  access afterward. Not a small addition to the existing member-management
  flow.

- **Drag-and-drop.** Task reordering, or a Kanban-style status-column
  board. No design work done yet; would likely need its own state
  management approach distinct from the current form-action-based
  mutations.

- **Project pagination.** `useProjects()` fetches the complete, unpaginated
  project list for the current user. Fine at Atlas's current review scale;
  would need real pagination (or virtualization) at genuine scale. Deferred
  since building pagination UI now would solve a scale problem the app
  doesn't currently have.

- **Task assignment.** `tasks.assignee_id` exists in the schema but is
  never set by any UI. No task form has an assignee field. Needed before
  any "assigned to me" style view is meaningful, deferred because it
  needs its own design pass (assignee picker, likely sourced from
  `useMembersByProject`'s already-fetched project members).

---

Update this document whenever a deliberate scope decision is made, either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note, or simply remove it, once it's built, rather than
letting completed work linger here.