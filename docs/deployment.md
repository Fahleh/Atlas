# Atlas Deployment

This file is reserved for CI/CD pipelines, hosting configuration,
preview-environment policy, environment-variable inventories, and rollback
procedures.

None of this exists in Atlas yet. Do not invent content here to fill the
file. Write this document when Atlas actually adopts a deployment process,
describing what was actually set up, not a generic template.

Server-side auth transport, `proxy.ts`, and session handling live in
`docs/auth.md`, not here, even though authentication is deployment-adjacent.
