# Supabase Migrations

This folder is a **retroactive** reconstruction of Atlas's schema history.
The project was not CLI-linked to Supabase during initial development,
so every migration listed here was originally run manually via the
Supabase SQL editor, in the order shown, before this folder existed.
They were compiled from the actual SQL run at each step and added to
version control after the fact.

Sequential numbering (`001`, `002`, ...) is used instead of the CLI's
timestamp-prefix convention, since original execution timestamps were
not recoverable. Supabase's dashboard does not retain a durable history
of ad hoc SQL editor executions, and no `supabase_migrations` tracking
table exists for an unlinked project. The order below is accurate; the
specific dates are not recorded.

`011` is intentionally skipped and stays skipped. Never reused.

## Files, in order

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables (`profiles`, `projects`, `project_members`, `tasks`), RLS enabled on all four, `handle_new_user` trigger, base grants |
| `002_rls_policies.sql` | Original RLS policies for all four tables. **Intentionally includes** the self-referencing `project_members` SELECT policy that later caused infinite recursion, preserved for historical accuracy |
| `003_fix_project_members_recursion.sql` | Fixes the recursion via a `SECURITY DEFINER`/`plpgsql` helper function |
| `004_handle_new_project_trigger.sql` | Auto-creates an `owner` row in `project_members` on project creation, plus a backfill for projects created before this trigger existed |
| `005_add_due_date_to_projects.sql` | Adds `projects.due_date`, mirroring `tasks.due_date` |
| `006_lookup_user_id_by_email.sql` | `SECURITY DEFINER` function enabling add-member-by-email without exposing `profiles.email` (which deliberately does not exist) |
| `007_project_task_stats_view.sql` | Adds the `project_task_stats` view, per-project task counts for the dashboard |
| `008_grant_project_task_stats_select.sql` | Grants `SELECT` on `project_task_stats` to `authenticated`, the first of two incidents on this view: a missing grant underneath a correct RLS-protected query |
| `009_avatars_storage_bucket.sql` | Creates the `avatars` Storage bucket, size/type limits, and per-user path RLS policies |
| `010_grant_profiles_update.sql` | Grants `UPDATE` on `profiles` to `authenticated` |
| `012_add_updated_at.sql` | Adds `updated_at` to `projects`, `tasks`, and `profiles`, with a shared trigger to maintain it |
| `013_enable_rls_auto_trigger.sql` | Event trigger auto-enabling RLS on any future new table, defense in depth against a forgotten `enable row level security`; also revokes default sequence privileges from `anon`/`authenticated`/`service_role` |
| `014_activity_log.sql` | Adds `activity_log`, an append-only audit trail written entirely by triggers on `projects`, `tasks`, and `project_members` |
| `015_add_length_constraints.sql` | Adds length constraints on user-supplied text fields (name, title, description), verified against live data before applying |
| `016_fix_length_constraints_btrim.sql` | Closes a gap in `015`: constraints now check trimmed length, so whitespace padding can't satisfy a minimum |
| `017_fix_view_rls_and_search_path.sql` | Sets `security_invoker` on `project_task_stats`, the second confirmed incident on this view and a different layer than `008`, and pins `search_path` on `handle_new_user`/`handle_new_project` |
| `018_account_deletion.sql` | Adds `profiles.deleted_at`, `is_active_user()`, and `owner_has_multi_member_project()`; updates every table's RLS policies to deny a deleted user's own reads/writes while leaving their profile row readable by others |
| `019_reject_deleted_user_token_hook.sql` | Custom Access Token Hook denying sign-in and token refresh for a deleted account |
| `020_ownership_transfer.sql` | `SECURITY DEFINER` RPC `transfer_project_ownership`, atomically swapping owner/collaborator roles and updating `projects.owner_id` |
| `021_task_assignment.sql` | Adds `tasks.assignee_id` enforcement (must be a member of the task's project) and `task_assigned`/`task_unassigned` activity log verbs |
| `022_clear_assignee_on_member_removal.sql` | Clears a task's assignee when that member is removed from the project, rather than leaving a stale reference |
| `023_get_email_for_project_member.sql` | `SECURITY DEFINER` function resolving a project member's email from their user id, for the task-assigned notification; requires both caller and target to be members of the same project, since this direction of lookup is unsafe to open more broadly than that |
| `024_task_position.sql` | Adds fractional `tasks.position` for drag-and-drop reordering, plus `renormalize_task_positions`, a `SECURITY DEFINER` RPC that atomically re-spaces positions when the gap between adjacent tasks collapses |
| `025_ownership_transfer_deleted_target.sql` | Closes a bug allowing ownership transfer to a soft-deleted collaborator, which would have permanently orphaned the project |

## Going forward

Any new schema change should be added here as a new numbered file **at
the time it's made**. Run it via the SQL editor as usual, then
immediately commit the corresponding migration file, rather than
letting the two drift apart again.