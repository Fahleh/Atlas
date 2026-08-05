-- Column + backfill: projects
alter table public.projects add column updated_at timestamptz;
update public.projects set updated_at = created_at where updated_at is null;
alter table public.projects alter column updated_at set not null;
alter table public.projects alter column updated_at set default now();

-- Column + backfill: tasks
alter table public.tasks add column updated_at timestamptz;
update public.tasks set updated_at = created_at where updated_at is null;
alter table public.tasks alter column updated_at set not null;
alter table public.tasks alter column updated_at set default now();

-- Column + backfill: profiles
alter table public.profiles add column updated_at timestamptz;
update public.profiles set updated_at = created_at where updated_at is null;
alter table public.profiles alter column updated_at set not null;
alter table public.profiles alter column updated_at set default now();

-- Shared trigger function
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger attachments
create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function set_updated_at();

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function set_updated_at();