# Atlas Deployment

This file is reserved for CI/CD pipelines, hosting configuration,
preview-environment policy, environment-variable inventories, and rollback
procedures.

Most of this doesn't exist in Atlas yet. Do not invent content here to fill
the file. Write a section when Atlas actually adopts that part of a
deployment process, describing what was actually set up, not a generic
template.

Server-side auth transport, `proxy.ts`, and session handling live in
`docs/auth.md`, not here, even though authentication is deployment-adjacent.

---

## Fluid Compute and per-route `maxDuration`

Atlas's Vercel project has Fluid Compute active. Its default function
duration is 300 seconds, not the classic (non-Fluid) 10 second default, and
`after()` runs inside that same duration budget, it does not get its own
separate allowance.

`app/api/member-added-email/route.ts` sets `export const maxDuration = 30`.
This is a deliberate cap, not a workaround for a too-short default: 300
seconds is generous enough that a genuinely hung SMTP connection could
otherwise sit consuming most of it before Vercel kills the invocation. 30
seconds comfortably covers the route's 3-attempt bounded retry (1s and 3s
backoff, plus real connect/TLS/AUTH round trips against Office 365) while
still failing fast if something is actually stuck.

Any future route doing a real network call inside `after()` should set its
own explicit `maxDuration` for the same reason, rather than relying on the
300 second Fluid Compute default.
