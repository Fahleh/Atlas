# Atlas Roadmap

> Last updated: September 2026

This document tracks what's intentionally *not* built yet, split into two
genuinely different categories. Conflating them was an earlier mistake in
this file's drafting, worth naming so it doesn't happen again: "not built
yet" and "deferred to a future version" are not the same thing. Only put
something under "Deferred to v2" if it is truly out of scope for the
version currently being built, not just sequenced later in this version's
own plan.

---

## Current version, remaining work

1. **Screen reader testing.** No automated or manual screen reader testing
   (NVDA, VoiceOver, JAWS) has been performed against any part of the app.
   Every ARIA pattern in `docs/a11y.md` and `docs/frontend.md` has been
   built to the documented WAI-ARIA specification, but none of it has been
   verified against a real assistive-technology tool.

2. **Color contrast audit.** Token-level fixes for the contrast failures
   Lighthouse actually flagged are done, see `docs/decisions.md`'s
   "Splitting `--color-accent` into a background token and a text token,
   and fixing the two gray text tokens alongside it" entry for the real
   4.5:1 numbers behind that fix. A full manual audit of every color
   combination in the app, not just the ones Lighthouse's own pages
   happened to render, has not been performed.

---

## Deferred to v2 (out of scope for the current version)

- **Drag-and-drop.** Task reordering, or a Kanban-style status-column
  board. No design work done yet; would likely need its own state
  management approach distinct from the current form-action-based
  mutations.


## Deferred until required (not tied to a version)

Items here are not scheduled for any specific version. They get built
only if a real, measured need shows up, not by default as the app's
version number increases.

- **Project pagination.** `useProjects()` fetches the complete,
  unpaginated project list. Reviewed during v2 planning and
  deliberately not built: at the project counts this app's real usage
  produces, a plain scrollbar handles the list fine in both views,
  building pagination now would be complexity ahead of an actual
  need.

  If it's ever built, keyset pagination, not offset (`.range()`), is
  the right mechanism. `projects.updated_at` reorders on every edit
  (`012_add_updated_at.sql`'s `set_updated_at()` trigger), exactly
  the condition offset pagination handles worst: editing a project
  while on a later page shifts every row below it, producing
  duplicated or skipped rows on the next fetch. Keyset pagination,
  comparing `(updated_at, id) < (last_updated_at, last_id)`, defines
  each page relative to the last row actually seen, not a row count,
  so a reorder above the cursor can't corrupt what's below it. The
  `id` tiebreaker matters for a real reason, not just defensively:
  the trigger uses `now()`, confirmed directly, not
  `clock_timestamp()`, and `now()` is transaction-stable, so a single
  transaction touching more than one project row produces identical
  `updated_at` values across them, a real source of ties the moment a
  bulk update is ever added, not a theoretical one.

---

Update this document whenever a deliberate scope decision is made, either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note, or simply remove it, once it's built, rather than
letting completed work linger here.