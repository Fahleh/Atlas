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

3. **Singular/plural copy convention.** No consistent handling of
   count-based copy exists app-wide: `ProjectCard`'s task count is
   hardcoded plural, while the new `VelocityStatus` card has a real
   singular guard. Worth reconciling into one convention later.

4. **`app/global-error.tsx`.** Deferred; a throw inside root `app/layout.tsx`
   itself currently falls through to Next's default unstyled error UI. See
   `docs/decisions.md`.

5. **`scripts/get-auth-cookie.ts` hardening.** Error handling collapses
   every failure inside the login flow into a single "login timeout"
   message; only `waitForURL` should be wrapped that way, other failures
   need their own real error surfaced. The captured cookie file must be
   deleted after each batch of Lighthouse runs, not left on disk between
   sessions, since it holds a full Supabase session including a refresh
   token. Revisit when this script is reused as the Testing phase's
   Playwright E2E login fixture.

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

- **Activity/audit log.** A real event feed ("Priya moved X to Review",
  "Jonas opened a PR") needs a new `activity_log` table, instrumentation
  on every mutation site across `projectActions.ts`/`taskActions.ts`, and
  its own RLS scoping. Deferred in favor of the dashboard's lighter
  `updated_at`-based "Recent Projects"/"Upcoming Tasks" substitutes,
  which needed no new schema.

---

Update this document whenever a deliberate scope decision is made, either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note, or simply remove it, once it's built, rather than
letting completed work linger here.