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

- **Project pagination.** `useProjects()` fetches the complete, unpaginated
  project list for the current user. Fine at Atlas's current review scale;
  would need real pagination (or virtualization) at genuine scale. Deferred
  since building pagination UI now would solve a scale problem the app
  doesn't currently have.

---

Update this document whenever a deliberate scope decision is made, either
moving an item between the two sections above, or adding a new one. Move an
item to a "Shipped" note, or simply remove it, once it's built, rather than
letting completed work linger here.