# Findings — Production Readiness Baseline

> Captured: August 2026

This document turns the raw Lighthouse baseline (`docs/lighthouse/baseline-2026-08-06/`)
into a concrete checklist for the phases that follow. It is not a summary of
every audit line, only the findings worth acting on. Each entry names the
phase it belongs to and its current status. Resolved entries are kept, not
deleted, as a record of what the baseline surfaced and how it was settled.

Status legend: **Open** — not yet addressed. **Resolved** — settled during
baseline measurement itself, no phase work needed. **Tracked** — logged
elsewhere, referenced here for completeness.

---

## Performance (Phase 2)

### LCP is render-delay-bound, not network-bound
**Evidence:** `login.report.json` (mobile): 86% of LCP is "Render Delay."
`login-desktop.report.json`: 80%, despite the absolute time dropping from
3.2s to 660ms. Same shape at both throttling tiers.
**Status:** Open. The LCP element is the "Atlas" wordmark span; the delay is
in client-side rendering time, not asset loading. Reconfirmed in
`docs/lighthouse/baseline-2026-08-11/`: 83% mobile, 80% desktop, same shape.

### Mobile dashboard and mobile projects are the lowest scores in the baseline
**Evidence:** `dashboard.report.json` (mobile): 71. `projects.report.json`
(mobile): 70. Lowest Performance scores across every route and preset
measured, public or authenticated. Desktop scores for the same two routes
are 97 and 99.
**Status:** Resolved. Re-measured in `docs/lighthouse/baseline-2026-08-11/`
with `scripts/authenticated-lighthouse.mts`: dashboard mobile 96, projects
mobile 97. The original low scores were the same broken-measurement
artifact as the two entries below, not a real mobile-specific gap.

### Unused preload warning
**Evidence:** Console warning on every authenticated route: a CSS chunk
"preloaded using link preload but not used within a few seconds."
**Status:** Tracked, not an Atlas bug. Confirmed as a known, still-open
Next.js App Router limitation (route-prefetch CSS preload/consumption
mismatch), reproduced across Next 13 through current versions. Low
priority.

### Authenticated-route console errors (React #418, REST 401s)
**Evidence:** Every authenticated route showed a React hydration error and
401s from Supabase REST calls when measured via `lighthouse --extra-headers`.
**Status:** Resolved. Re-measured in `docs/lighthouse/baseline-2026-08-11/`
with `scripts/authenticated-lighthouse.mts`, a persistent authenticated
browser context instead of a cookie header. Confirmed clean: no known
failure strings in any report, and `dashboard.report.json`'s LCP element
manually inspected as real content. See `docs/decisions.md`.

### Authenticated Performance numbers were provisional, now corrected
**Evidence:** Dashboard/profile/projects scores in
`docs/lighthouse/baseline-2026-08-06/` were measured against pages where
real data never loaded client-side, per the entry above.
**Status:** Resolved. Current numbers are in
`docs/lighthouse/baseline-2026-08-11/`, measured with
`scripts/authenticated-lighthouse.mts` and confirmed clean per the same
entry.

---

## Accessibility (Phase 4)

### Dark-mode color contrast fails on two token pairs, systemically
**Evidence:** `--color-accent` (dark: `#fbbf24`) with white text, `1.66:1`,
on every primary button measured (`/login`, `/signup`, `/projects`).
`--color-text-muted` (dark: `#71717a`) on `--color-surface` (`#27272a`),
`3.08:1`, on every muted secondary-text instance measured. Both need
`4.5:1`.
**Status:** Open. Token-level, not component-level. Fixing
`--color-accent` and `--color-text-muted`'s dark values should resolve
every instance across the app in one pass. `/projects`' filter-tab
(`4.07:1`) and "New" button failures are the same two root causes, not a
separate fix.

### Light-mode contrast is confirmed affected, not just unmeasured
**Evidence:** `docs/lighthouse/baseline-2026-08-11/dashboard.report.json`'s
`color-contrast` audit fails `#ea8c00` (light mode's `--color-accent`)
against several backgrounds, e.g. `2.43:1` on `#fafafa`. Inferred from the
color value matching light mode's documented token; no `data-theme`
attribute was captured directly in this report's snippets either.
**Status:** Open. Same fix as the dark-mode entry above should be verified
against both themes explicitly, not assumed to carry over.

### No `<main>` landmark on `/login`
**Evidence:** `landmark-one-main` audit fails on `login.report.json`.
**Status:** Open. Could be a deliberate choice for a chromeless auth page,
needs an actual decision, not a silent gap.

### `ProjectStats`' progressbar role is invalid on its `<dl>` structure
**Evidence:** `docs/lighthouse/baseline-2026-08-11/dashboard.report.json`:
`aria-allowed-role` and `definition-list` both fail on the same node, the
Tasks Done `<dd role="progressbar">` inside `ProjectStats`' `<dl>`. ARIA
`progressbar` is not an allowed role there, and it makes the `<dl>`'s
direct children invalid.
**Status:** Open. First observed in this run.

### `ProjectCard`'s accessible name does not include its visible text
**Evidence:** `docs/lighthouse/baseline-2026-08-11/dashboard.report.json`:
`label-content-name-mismatch` fails on all 4 `ProjectCard`s in the Recent
Projects grid; visible card text is not included in the accessible name.
**Status:** Open. First observed in this run.

---

## Security (Phase 3)

### No security headers configured
**Evidence:** `csp-xss`, `has-hsts`, `origin-isolation`,
`clickjacking-mitigation`, `trusted-types-xss` all flagged "High severity"
across every route measured. None affect the Best Practices score in this
Lighthouse version (informative-only audits), which is why this was easy
to miss without the baseline.
**Status:** Open. Direct input for `next.config.ts` headers work.

### `robots.txt` is broken, not just unoptimized
**Evidence:** `robots-txt` audit fails; Lighthouse captured the login
page's full HTML where a valid `robots.txt` should be.
**Status:** Open. Two live hypotheses, neither confirmed: no `app/robots.ts`
exists, or `proxy.ts`'s `PUBLIC_PATHS` doesn't cover `/robots.txt` and it's
being redirected into the login flow. Reconfirmed in
`docs/lighthouse/baseline-2026-08-11/` under a completely different
measurement method, ruling out the old methodology as the cause.