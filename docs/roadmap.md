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

1. **Dashboard design.** `/` (formerly conflated with a non-existent
   `/dashboard` route, see `docs/auth.md`'s routing section) is currently
   a bare placeholder. Likely candidates: move `ProjectStats` cards here
   from `/projects`, decide what else belongs (recent activity, upcoming
   due dates). Undesigned as of this entry, no layout decisions made yet.

2. **Screen reader testing.** No automated or manual screen reader testing
   (NVDA, VoiceOver, JAWS) has been performed against any part of the app.
   Every ARIA pattern in `docs/a11y.md` and `docs/frontend.md` has been
   built to the documented WAI-ARIA specification, but none of it has been
   verified against a real assistive-technology tool.

3. **Color contrast audit.** No formal WCAG contrast ratio check has been
   run against the token palette in either light or dark mode. The palette
   was chosen for aesthetic and brand reasons (see `docs/decisions.md`),
   not verified against AA contrast minimums.

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

---

Update this document whenever a deliberate scope decision is made, either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note, or simply remove it, once it's built, rather than
letting completed work linger here.