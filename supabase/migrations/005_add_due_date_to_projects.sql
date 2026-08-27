-- Adds an optional due date to projects, mirroring tasks.due_date exactly
-- (same type, same nullability, same handling downstream in the app's
-- parseDates()/timezone-safe display logic).

alter table public.projects
  add column due_date timestamp with time zone;
