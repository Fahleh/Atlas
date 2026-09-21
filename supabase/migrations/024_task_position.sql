-- Adds tasks.position for drag-and-drop reordering and a trigger WHEN
-- clause so position-only writes skip the activity log. See docs/decisions.md.

alter table public.tasks
  add column position double precision not null default 0;

-- Backfill using current created_at order, spaced widely so early
-- reorders have headroom before renormalization is ever needed.
with ordered as (
  select id, row_number() over (partition by project_id order by created_at asc) as rn
  from public.tasks
)
update public.tasks
set position = ordered.rn * 1000
from ordered
where tasks.id = ordered.id;

create index tasks_project_id_position_idx
  on public.tasks (project_id, position);

-- Position-only writes must not fire the activity trigger. See docs/decisions.md.
drop trigger on_task_updated_activity on public.tasks;
create trigger on_task_updated_activity
  after update on public.tasks
  for each row
  when (
    old.status is distinct from new.status
    or old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.due_date is distinct from new.due_date
    or old.assignee_id is distinct from new.assignee_id
  )
  execute function public.handle_task_activity();

-- Renormalization must be atomic, all rows or none, so it runs inside one
-- function rather than N independent client updates. See docs/decisions.md.
create or replace function public.renormalize_task_positions(
  _project_id uuid,
  _ordered_task_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    is_active_user()
    and (
      is_project_member(auth.uid(), _project_id)
      or exists (
        select 1 from public.projects
        where id = _project_id and owner_id = auth.uid()
      )
    )
  ) then
    raise exception 'Only project members can reorder this project''s tasks.';
  end if;

  if (
    select array_agg(id order by id) from public.tasks where project_id = _project_id
  ) is distinct from (
    select array_agg(id order by id) from unnest(_ordered_task_ids) as id
  ) then
    raise exception 'Task list is out of date, refresh and try again.';
  end if;

  with ordered as (
    select id, row_number() over (order by ord) as rn
    from unnest(_ordered_task_ids) with ordinality as u(id, ord)
  )
  update public.tasks
  set position = ordered.rn * 1000
  from ordered
  where tasks.id = ordered.id;
end;
$$;

grant execute on function public.renormalize_task_positions(uuid, uuid[]) to authenticated;
