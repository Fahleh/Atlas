# Supabase Migrations

This folder is a **retroactive** reconstruction of Atlas's schema history.
The project was not CLI-linked to Supabase during initial development —
every migration listed here was originally run manually via the Supabase
SQL editor, in the order shown, before this folder existed. They were
compiled from the actual SQL run at each step and added to version control
after the fact.

Sequential numbering (`001`, `002`, ...) is used instead of the CLI's
timestamp-prefix convention, since original execution timestamps were not
recoverable — Supabase's dashboard does not retain a durable history of
ad hoc SQL editor executions, and no `supabase_migrations` tracking table
exists for an unlinked project. The order below is accurate; the specific
dates are not recorded.

## Files, in order

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables (`profiles`, `projects`, `project_members`, `tasks`), RLS enabled on all four, `handle_new_user` trigger, base grants |
| `002_rls_policies.sql` | Original RLS policies for all four tables — **intentionally includes** the self-referencing `project_members` SELECT policy that later caused infinite recursion, preserved for historical accuracy |
| `003_fix_project_members_recursion.sql` | Fixes the recursion via a `SECURITY DEFINER`/`plpgsql` helper function |
| `004_handle_new_project_trigger.sql` | Auto-creates an `owner` row in `project_members` on project creation, plus a backfill for projects created before this trigger existed |
| `005_add_due_date_to_projects.sql` | Adds `projects.due_date`, mirroring `tasks.due_date` |
| `006_lookup_user_id_by_email.sql` | `SECURITY DEFINER` function enabling add-member-by-email without exposing `profiles.email` (which deliberately does not exist) |

## Going forward

Any new schema change should be added here as a new numbered file **at the
time it's made** — run it via the SQL editor as usual, then immediately
commit the corresponding migration file, rather than letting the two drift
apart again.
