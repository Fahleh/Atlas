# Atlas Roadmap

> Last updated: July 2026

This document tracks what's intentionally _not_ built yet, split into two
genuinely different categories — conflating them was an earlier mistake in
this file's drafting, worth naming so it doesn't happen again: "not built
yet" and "deferred to a future version" are not the same thing. Only put
something under "Deferred to v2" if it is truly out of scope for the
version currently being built, not just sequenced later in this version's
own plan.

---

## Current version — remaining work (in planned order)

1. **Distinguish "no tasks" from "access revoked" after a project membership change** —
   confirmed via manual two-browser testing (owner removes a collaborator; the collaborator's
   client still has the project cached and open). Two related gaps, not one:
   - The collaborator's stale client-side cache continues showing a removed project until the 
   next refetch trigger (React Query's default `staleTime`/`refetchOnMount` behavior — not a bug,
   standard client-cache eventual consistency without a realtime invalidation mechanism; Atlas has
   no Supabase Realtime subscriptions wired up).
   - **The actual UX gap**: once the cache does refetch, `TaskList`'s "No tasks yet" empty state is
   visually identical whether a project genuinely has zero tasks or whether the viewer just lost access
   to it (RLS silently filters rather than erroring, which is the correct security posture — the ambiguity
   is a UI problem, not a security one). A removed collaborator with a stale slide-over open sees a task list
   quietly go empty with no explanation.
   - Scoped as a small fix to already-shipped behavior, not a new feature — first item to pick up on 
   `feature/task-progress-tracking`, before the actual task-progress work.
   - Possible directions to evaluate when picked up: detect the project's own disappearance from `useProjects`'s
   result set (already happens, via the existing `.find() ?? null` derivation) and show an explicit "You no longer
   have access to this project" message before the slide-over closes, rather than a silent
   task-list-goes-empty-then-panel-closes sequence with no explanation in between.

2. **Task progress / completion percentage** — `ProjectCard` and
   `ProjectListTable` currently show a hardcoded `0%` / `0 tasks`. Needs a
   tasks-completed query. Given the N+1 concern already solved once for
   member data (`useMembersByProject`), this should follow the same batched
   pattern rather than a per-card fetch — decide the exact aggregate shape
   when this is designed, not defaulted into.

3. **Profile page** — new route. Includes:
   - Edit display name
   - Avatar upload — `profiles.avatar_url` and `Avatar.tsx`'s photo-render
     branch already exist and are wired correctly; only the upload UI,
     storage bucket, and `next.config.ts` `remotePatterns` (for the real
     storage domain) are missing.
   - Email change — not yet decided whether in scope for this pass.
     Supabase Auth's email-change flow has its own confirmation step and
     adds real complexity; decide when this page is actually designed,
     not before.

4. **Dashboard design** — `/` (formerly conflated with a non-existent
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

_Update this document whenever a deliberate scope decision is made — either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note (or simply remove it) once it's built, rather than
letting completed work linger here._
