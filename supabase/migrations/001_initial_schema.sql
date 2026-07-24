-- Profiles: extends auth.users with display data
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Projects
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Project members (many-to-many)
create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'collaborator' check (role in ('owner', 'collaborator')),
  joined_at timestamptz default now() not null,
  primary key (project_id, user_id)
);

-- Tasks
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  project_id uuid references public.projects(id) on delete cascade not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  due_date timestamptz
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant API access to tables
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant all on public.projects to authenticated;
grant all on public.project_members to authenticated;
grant all on public.tasks to authenticated;
