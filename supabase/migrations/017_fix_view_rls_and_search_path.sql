-- project_task_stats had no security_invoker set, so it ran with the view
-- owner's permissions instead of the querying user's, bypassing RLS on the
-- underlying tasks table. Also pins search_path on handle_new_user and
-- handle_new_project, the only two SECURITY DEFINER functions in the
-- schema without one. See docs/database.md's "Grants and Policies Are
-- Separate" section for the full reasoning.

alter view public.project_task_stats set (security_invoker = true);

alter function public.handle_new_user() set search_path = public;
alter function public.handle_new_project() set search_path = public;
