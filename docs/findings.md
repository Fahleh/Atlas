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
**Evidence:** Confirmed render-delay-dominant across three separate
measurements (`baseline-2026-08-06`, `baseline-2026-08-11`,
`recheck-2026-08-13`), consistently 78-86% depending on preset and
run. Current (5-run median, post `QueryProvider` fix): mobile
2622.4ms total / 82% Render Delay, desktop 588.8ms / 78%. Full
numeric history in the respective `docs/lighthouse/` folders.
**Status:** Open. The LCP element is the "Atlas" wordmark span; the delay
is in client-side rendering time, not asset loading. The `QueryProvider`
scoping contributed a real, modest improvement, not a fix: mobile's median
stayed above the 2,500ms Good threshold. The remaining cost is framework
baseline plus Next's polyfill chunk, see the entry below, now Tracked and
not being pursued (upstream Next.js behavior, not an Atlas
misconfiguration). No further active work is planned on this finding.

### Framework baseline and Next's polyfill chunk dominate `/login`'s remaining JS
**Evidence:** Of roughly 627KB minified shipped to `/login` before the
`QueryProvider` fix, React/React-DOM/Next App Router runtime accounted for
393.153KB (164309 + 228844 bytes) and a Next-owned `core-js` polyfill
chunk (confirmed by its license banner, not declared in `package.json`, no
app code references it) accounted for another 112.6KB, roughly 505KB
total, about 80% of the route's JS. None of it moved when `QueryProvider`
was scoped down.
**Status:** Tracked, not an Atlas misconfiguration. No `.browserslistrc`
exists, but Next.js 16 already defaults to a modern browser target
(chrome 111+ and equivalents). An open upstream issue,
vercel/next.js#86785, confirms polyfills still ship regardless. No
config-level fix is currently available. Not being pursued.

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
**Status:** Resolved. CSP, HSTS, COOP, and clickjacking mitigation
(`X-Frame-Options` plus `frame-ancestors`) are configured in
`next.config.ts`. Reasoning for the non-default choices (`script-src`'s
`unsafe-inline`, no HSTS `preload`, strict COOP) is in
`docs/decisions.md`. `trusted-types-xss` is deliberately not part of
this fix; it needs its own manual-verification pass and is tracked
separately.

### `robots.txt` is broken, not just unoptimized
**Evidence:** `robots-txt` audit fails; Lighthouse captured the login
page's full HTML where a valid `robots.txt` should be.
**Status:** Resolved. No robots mechanism existed, and `proxy.ts`'s
matcher didn't exclude `/robots.txt`, redirecting requests into
login. Both fixed together: `app/robots.ts` added, matcher updated
alongside `favicon.ico`. Verified: direct `curl`, no redirect, `200`
with the intended body. See `docs/decisions.md`.