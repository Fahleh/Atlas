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
in client-side rendering time, not asset loading.

### Mobile dashboard and mobile projects are the lowest scores in the baseline
**Evidence:** `dashboard.report.json` (mobile): 71. `projects.report.json`
(mobile): 70. Lowest Performance scores across every route and preset
measured, public or authenticated. Desktop scores for the same two routes
are 97 and 99.
**Status:** Open. Both are card/list-heavy authenticated pages; the gap is
specific to mobile throttling.

### Unused preload warning
**Evidence:** Console warning on every authenticated route: a CSS chunk
"preloaded using link preload but not used within a few seconds."
**Status:** Tracked, not an Atlas bug. Confirmed as a known, still-open
Next.js App Router limitation (route-prefetch CSS preload/consumption
mismatch), reproduced across Next 13 through current versions. Low
priority.

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

### Light-mode contrast is entirely unverified
**Evidence:** Every captured report shows `data-theme="dark"` in the
rendered HTML. Light mode's `--color-accent` (`#ea8c00`) contrast against
white text has never been measured in this baseline.
**Status:** Open. Scope the color-contrast audit to both themes
explicitly, don't assume light mode inherits whatever fix dark mode gets.

### No `<main>` landmark on `/login`
**Evidence:** `landmark-one-main` audit fails on `login.report.json`.
**Status:** Open. Could be a deliberate choice for a chromeless auth page,
needs an actual decision, not a silent gap.

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
being redirected into the login flow.

---

## Resolved during baseline measurement (no phase work needed)

### Authenticated-route console errors (React #418, REST 401s)
**Evidence:** Every authenticated route showed a React hydration error and
401s from Supabase REST calls when measured via a manually-copied session
cookie.
**Resolution:** Confirmed as a testing-methodology artifact.
`--extra-headers` injects a raw request header; it never populates the
browser's actual cookie store, so client-side code had no session even
though SSR did. Confirmed absent in a real, normal login.
`scripts/get-auth-cookie.ts` now captures a real session for this purpose.
See `docs/decisions.md`.

### Authenticated Performance numbers were provisional, now corrected
**Evidence:** Initial dashboard/profile/projects scores were measured
against pages where real data never loaded client-side, per the above.
**Resolution:** Re-measured with a real session. Current numbers in
`docs/lighthouse/baseline-2026-08-06/` are the ones referenced elsewhere
in this document.