# Atlas Database and Supabase Rules

This document defines Atlas's database contracts, RLS patterns, migration
workflow, date handling, storage rules, and schema-specific security decisions.

---

## Data Contract

Supabase returns PostgreSQL `timestamp with time zone` values as strings.
Application-level TypeScript declarations do not change runtime values.

`toCamelCase` only renames keys. It does not parse dates.

Every data hook that fetches date-bearing entities must:

1. call `toCamelCase`;
2. immediately call `parseDates(obj, dateKeys)`;
3. list every date-bearing key explicitly.

Confirmed hooks include:

- `useProjects`;
- `useTasks`;
- `useMembersByProject` for `joined_at`.

Do not scatter defensive `new Date(...)` calls across components.

---

## Date and Timezone Handling

### Writing date-only values

A value from `<input type="date">`, such as `"2026-07-31"`, can be passed to
`new Date(...)`. JavaScript parses this form as UTC midnight.

Do not manually shift date-only values for local timezone during writes.

### Displaying date-only values

The bug is on display:

```typescript
date.toLocaleDateString();
```

Without an explicit timezone, a UTC-midnight date can appear as the previous day
for viewers west of UTC.

Every format used for a calendar date such as a due date must include:

```typescript
timeZone: "UTC"
```

Keep separate format constants for:

- calendar dates, displayed in UTC;
- real instants such as `createdAt`, displayed in the viewer's local timezone.

Do not reuse one format object for both concepts.

---

## Database Types

`types/database.types.ts` is generated, snake_case, and never manually edited.

Regenerate it after every migration. The current project uses Supabase dashboard
export rather than an assumed CLI workflow. Confirm before giving commands.

`types/atlas.types.ts` contains hand-authored camelCase domain types.

---

## Established Schema

### `project_members`

- Composite primary key: `(project_id, user_id)`.
- `role` constrained to `'owner' | 'collaborator'`.
- Every project owner receives an `'owner'` row automatically through the
  `handle_new_project` trigger.

### `project_task_stats`

A PostgreSQL view, not a `SECURITY DEFINER` function.

It returns:

- `project_id`;
- `total_tasks`;
- `done_tasks`.

Aggregation uses `count(*)`, filtered counts, and `GROUP BY` on the server. The
view sets `security_invoker = true`. That setting, not anything automatic
about views, is what makes it respect the querying user's RLS on the
underlying tables. Confirmed by direct testing, not assumed, see
017_fix_view_rls_and_search_path.sql.

Supabase-generated view types may mark non-null columns as nullable. Consumers
must handle this deliberately rather than silently discarding rows.

### `profiles`

Do not add an `email` column.

Email's source of truth is `auth.users`. Duplicating it would require permanent
synchronization and would place sensitive data into a broadly readable row.
Member lookup by email uses a controlled function that returns only user ID.

`deleted_at timestamptz`, nullable, null means active. Account deletion is a
soft delete, the row and the `auth.users` entry are never removed, matching
the "no service role key" constraint and keeping every existing foreign key
to `profiles.id` intact. `updated_at` (migration 012, a timestamp with a
`set_updated_at` trigger) was the precedent for choosing a timestamp over a
boolean flag here, this schema has no boolean status columns to match
instead. See "Soft account deletion" under Row Level Security for how this
column is actually enforced.

---

## Foreign-Key Delete Behavior

Verify actual constraints before implementing deletes.

Current confirmed behavior:

- `tasks.project_id`: `ON DELETE CASCADE`;
- `project_members.project_id`: `ON DELETE CASCADE`;
- `tasks.assignee_id`: `ON DELETE SET NULL`.

Do not manually delete children when the database already owns the cascade.
Do not assume all relationships should use the same delete action.

UI confirmation severity rules live in `docs/frontend.md`.

---

## Row Level Security

RLS is enabled and policies exist on:

- `profiles`;
- `projects`;
- `project_members`;
- `tasks`.
- `activity_log`.

Check current policy state before treating policy creation as open work.

### Never self-reference an RLS policy

A policy on table `X` must not query table `X` inside its own `USING` or
`WITH CHECK` expression, directly or indirectly.

This causes:

```text
42P17: infinite recursion detected in policy for relation "X"
```

### Correct recursion escape

Use a `SECURITY DEFINER` helper written in `plpgsql`:

```sql
create or replace function public.is_project_member(
  _user_id uuid,
  _project_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.project_members
    where project_id = _project_id
      and user_id = _user_id
  );
end;
$$;
```

Do not write the helper as `LANGUAGE sql`. PostgreSQL may inline simple SQL
functions, defeating the security-definer boundary and reintroducing recursion.
`plpgsql` functions are not inlined this way.

After fixing one recursive policy, retest every table whose policies depend on
that table. A failure in `project_members` can block `projects` and `tasks`
indirectly.

**Not every same-table subquery actually recurses.** The rule above is stated
as unconditional, and is worth following as a blanket rule regardless, but the
`is_active_user()` function below (migration 018) queries `profiles` from
inside `profiles`' own UPDATE policy, the exact shape this section warns
about, without hitting 42P17. The reason: `profiles: authenticated users can
read` is `using (true)`, a constant with nothing further to look up, so the
inner read `is_active_user()` performs resolves in one step and never calls
back into the UPDATE policy. `is_project_member`'s actual bug (003) was
different, `project_members`' own original SELECT policy queried
`project_members` again, a genuine cycle. `is_active_user()` keeps
`SECURITY DEFINER` anyway, for privilege-pattern consistency with
`is_project_member` and `lookup_user_id_by_email`, not because it's
structurally required here.

### Soft account deletion

`profiles.deleted_at` (see "Established Schema" above) needs the deleted
user's own session to lose access, without breaking other users' ability to
read that same profile row for display (name, avatar, in the activity log,
member lists, and the project avatar stack). These are two different
questions, and the fix only touches one of them:

```sql
create or replace function public.is_active_user()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and deleted_at is null
  );
end;
$$;
```

`is_active_user()` is added as an extra `and` condition to every policy that
governs what the *querying* user can do, on `profiles` (update), `projects`,
`project_members`, `tasks`, and `activity_log`. `profiles: authenticated
users can read` is deliberately left untouched, gating that policy on either
side's `deleted_at` would break every one of the display cases above, which
depend on a deleted user's row staying readable by everyone else regardless
of their own account status.

A second function blocks deleting an account that solely owns a project with
other members, since ownership transfer isn't built (`docs/roadmap.md`):

```sql
create or replace function public.owner_has_multi_member_project()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.projects p
    where p.owner_id = auth.uid()
    and exists (
      select 1
      from public.project_members pm
      where pm.project_id = p.id
      and pm.user_id <> auth.uid()
    )
  );
end;
$$;
```

This is enforced with a `WITH CHECK` on `profiles: users can update own
profile`, not a trigger, because the invariant only needs to look at the
resulting row, not compare old vs. new: `deleted_at is null or not
owner_has_multi_member_project()`. Once `deleted_at` is set,
`is_active_user()` blocks every further update to that row anyway (including
a second attempt at this same update), so this check never fires for an
ordinary name/avatar edit, only for the one update that actually sets
`deleted_at`. A `WITH CHECK` failure surfaces as the same `42501` that
`interpretSupabaseWriteError` already collapses into a generic forbidden
message, which is the right amount of detail for what should only ever be
reached by a direct API bypass, the real UI check lives client-side in
`features/profile/DeleteAccountSection.tsx` and hides the delete flow
entirely when this condition is true.

Full migration: `018_account_deletion.sql`.

### `handle_new_project`

An `AFTER INSERT ON projects` trigger inserts the owner's
`project_members` row.

The trigger function is `SECURITY DEFINER` so the side-effect insert is not
blocked by the invoking user's RLS constraints on `project_members`.

A one-time backfill covers projects created before the trigger existed.

### `lookup_user_id_by_email`

- `SECURITY DEFINER`;
- `LANGUAGE plpgsql`;
- reads `auth.users`;
- compares lowercased email;
- returns matched user ID or `null`;
- never returns the email.

`profiles.email` deliberately does not exist; email lives only in
`auth.users`, owned by Supabase Auth, avoiding a second source of truth and
a sync trigger. `SECURITY DEFINER` is required because a normal
authenticated role has no direct access to `auth.users`.

It is deliberately callable by authenticated users rather than restricted to
project owners. Since project creation is free and unrestricted, an ownership
gate would be trivial to bypass and would provide security theater rather than
a meaningful boundary.

Account-existence probing is an accepted property of invite-by-email workflows
in this project's scope.

Use this pattern for future reads from `auth.users`. Never expose `auth.users`
to direct client queries.

---

## Grants and Policies Are Separate

A correct RLS policy is not enough.

PostgreSQL checks table/view privileges before evaluating RLS. Every new table,
view, or operation must explicitly verify the relevant grant:

```sql
grant select on public.x to authenticated;
grant insert, update, delete on public.x to authenticated;
```

Only grant the operations the application needs.

This class of bug has already occurred for:

- `project_task_stats` view `SELECT`;
- `profiles` `UPDATE`;
- original tables before explicit grants were added.

Never loosen RLS to work around a missing grant.

A view's ownership and its `security_invoker` setting are a third, separate
layer from both grants and RLS policies. A view can have a correct grant
and query tables with correct RLS, and still bypass that RLS entirely if
it's owned by a role RLS doesn't apply to, the default, and
`security_invoker` isn't set. `project_task_stats` has had two confirmed
incidents now, on two different layers: a missing grant
(`008_grant_project_task_stats_select.sql`) and a missing
`security_invoker` (`017_fix_view_rls_and_search_path.sql`). Any new view
over an RLS-protected table needs `security_invoker = true` checked
explicitly, confirmed by querying as a real non-privileged user, not
assumed from the view's SQL looking correct.

---

## Supabase Migrations

`supabase/migrations/` contains numbered SQL history:

```text
001_...
002_...
003_...
```

The project is not CLI-linked, and early execution timestamps were not
recoverable when migrations were reconstructed. Do not replace the numbering
scheme with assumed CLI timestamp names.

### Workflow

For every schema change:

1. Check the current highest migration number.
2. Add a new migration file.
3. Run it through the Supabase SQL editor.
4. Commit the migration immediately.
5. Regenerate database types.
6. Verify required `GRANT`s.
7. Verify RLS behavior against live data.

Never reuse a skipped number.

### Historical honesty

Do not rewrite earlier migrations to make the history appear perfect.

Example:

- `002_rls_policies.sql` contains the original recursive policy.
- `003_fix_project_members_recursion.sql` contains the fix.

The diagnosis/fix sequence is intentional portfolio evidence.

A clean clone plus running migrations in order should reproduce the current
schema.

---

## Storage: Avatar Bucket

### Bucket

`avatars` is public with:

- 2 MB maximum file size;
- `image/jpeg`;
- `image/png`;
- `image/webp`.

Client validation provides immediate feedback. Bucket configuration is the
enforcement boundary.

### Object path and overwrite strategy

Use a fixed per-user path:

```text
avatars/{userId}/avatar.{ext}
```

Upload with `upsert: true` so files do not accumulate.

Because the URL path stays stable, append a cache-busting query parameter after
each successful upload:

```typescript
?t=${Date.now()}
```

Store the updated URL in `avatar_url`.

### Storage RLS

Write policies restrict users to their own first path segment:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Apply this to `INSERT`, `UPDATE`, and `DELETE`.

Storage `SELECT` governs both known-path reads and bucket listing. Do not remove
the bucket's `SELECT` policy merely to silence a listing concern; doing so may
break `upsert: true` re-uploads.

Read `docs/decisions.md` before changing the current public-read tradeoff.

### Client preview

`next/image` does not support local `blob:` URLs. Use a plain `<img>` for
`URL.createObjectURL(file)` previews.

Revoke object URLs:

- before adopting a new preview URL;
- after a successful save clears the staged file;
- on unmount for the current URL.

Use a ref mirroring the latest URL so the unmount cleanup can keep an empty
dependency array.

Persisted HTTPS avatar URLs continue to use `next/image`.

### Remote image configuration

`next.config.ts` must narrowly allow the avatar bucket host and path:

```text
hostname: {project-ref}.supabase.co
pathname: /storage/v1/object/public/avatars/**
```

Do not broaden this to all public Storage buckets. Add a separate explicit
pattern when a new public bucket genuinely needs `next/image`.

---

## Authentication-Related Database Rules

- Match Supabase Auth failures with documented `error.code` values.
- Do not branch on `error.message`.
- The confirmation template must send `type=email`.
- `EmailOtpType` is widened enough that TypeScript may accept plausible but
  incorrect values.
- Verify OTP type against current Supabase documentation and the actual email
  template.
- Server-side auth transport and proxy behavior live in `docs/auth.md`.
