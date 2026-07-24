# Atlas Roadmap

This document tracks what's intentionally *not* built yet, split into two
genuinely different categories — conflating them was an earlier mistake in
this file's drafting, worth naming so it doesn't happen again: "not built
yet" and "deferred to a future version" are not the same thing. Only put
something under "Deferred to v2" if it is truly out of scope for the
version currently being built, not just sequenced later in this version's
own plan.

---

## Current version — remaining work (in planned order)

1. **Task progress / completion percentage** — `ProjectCard` and
   `ProjectListTable` currently show a hardcoded `0%` / `0 tasks`. Needs a
   tasks-completed query. Given the N+1 concern already solved once for
   member data (`useMembersByProject`), this should follow the same batched
   pattern rather than a per-card fetch — decide the exact aggregate shape
   when this is designed, not defaulted into.

2. **Profile page** — new route. Includes:
   - Edit display name
   - Avatar upload — `profiles.avatar_url` and `Avatar.tsx`'s photo-render
     branch already exist and are wired correctly; only the upload UI,
     storage bucket, and `next.config.ts` `remotePatterns` (for the real
     storage domain) are missing.
   - Email change — not yet decided whether in scope for this pass.
     Supabase Auth's email-change flow has its own confirmation step and
     adds real complexity; decide when this page is actually designed,
     not before.

3. **Dashboard design** — `/` (formerly conflated with a non-existent
   `/dashboard` route — see CLAUDE.md's Route Groups section) is currently
   a bare placeholder. Likely candidates: move `ProjectStats` cards here
   from `/projects`, decide what else belongs (recent activity, upcoming
   due dates). Undesigned as of this entry — no layout decisions made yet.

---

## Deferred to v2 (out of scope for the current version)

- **Ownership transfer** — reassigning `projects.owner_id` and the
  corresponding `project_members` role from one user to another. Deferred
  because it needs its own design pass: who can initiate it, what
  confirmation flow is required, and what happens to the outgoing owner's
  access afterward. Not a small addition to the existing member-management
  flow.

- **Drag-and-drop** — task reordering, or a Kanban-style status-column
  board. No design work done yet; would likely need its own state
  management approach distinct from the current form-action-based
  mutations.

---

*Update this document whenever a deliberate scope decision is made — either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note (or simply remove it) once it's built, rather than
letting completed work linger here.*