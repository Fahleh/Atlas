create view public.project_task_stats as
select
  project_id,
  count(*) as total_tasks,
  count(*) filter (where status = 'done') as done_tasks
from public.tasks
group by project_id;