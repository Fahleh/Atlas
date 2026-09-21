-- Removing a project member should also clear their assignee_id on any
-- task in that project, a real database-enforced invariant rather than
-- something left to removeMember's application code to remember.
--
-- Not SECURITY DEFINER. Only the project owner can delete a project_members
-- row ("project_members: owner can delete"), and the owner already
-- satisfies "tasks: project members can update" through either their own
-- project_members row or the owner_id branch, so invoker security is
-- correct here, same reasoning as check_assignee_is_project_member.
--
-- Guarded by the same "does the project still exist" check already used in
-- handle_task_activity's DELETE branch and handle_member_activity. Without
-- it, deleting a project whose tasks still have assignees would fail: the
-- project_members cascade fires before the tasks cascade, so this trigger's
-- UPDATE would run on tasks whose parent project row is already gone,
-- and the resulting task_unassigned insert into activity_log would hit
-- that table's own FK to projects and abort the whole delete.
create or replace function public.clear_assignee_on_member_removal()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.projects where id = old.project_id) then
    update public.tasks
    set assignee_id = null
    where project_id = old.project_id
    and assignee_id = old.user_id;
  end if;
  return old;
end;
$$;

create trigger clear_assignee_on_member_removal
  after delete on public.project_members
  for each row execute function public.clear_assignee_on_member_removal();
