-- Ensures every project's owner also has a corresponding project_members row
-- (role = 'owner'). Without this, a project's own creator would never
-- appear when querying "who are the members of this project" via
-- project_members alone — ownership was tracked only via projects.owner_id,
-- with no enforced consistency between the two.
--
-- SECURITY DEFINER here is required for a different reason than the
-- recursion fix in 003: this trigger fires as a side effect of the
-- invoking user's own `insert into projects`, and the resulting
-- `insert into project_members` must succeed regardless of how the
-- invoking user's own RLS policies on project_members would otherwise
-- apply to a trigger-initiated insert.

create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();

-- Backfill: this trigger didn't exist when earlier projects were created,
-- so give any pre-existing project an owner row if it doesn't already have one.
insert into public.project_members (project_id, user_id, role)
select id, owner_id, 'owner' from public.projects
where not exists (
  select 1 from public.project_members
  where project_members.project_id = projects.id
  and project_members.user_id = projects.owner_id
);
