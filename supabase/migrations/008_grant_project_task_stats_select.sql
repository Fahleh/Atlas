-- Views need their own explicit GRANT, separate from their underlying
-- tables' grants — missed here initially, caused a 403 on every query.
grant select on public.project_task_stats to authenticated;