-- Phase 1F: private Client -> Studio feedback and review workflow.
-- Apply only after migration 006. This migration is additive and does not alter
-- Studio-owned milestone, update or deliverable records.

create table if not exists public.project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  target_type text not null check (target_type in ('project','milestone','update','deliverable')),
  target_id uuid,
  target_label text not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  intent text not null check (intent in ('looks_good','changes_requested','comment')),
  message text not null default '',
  status text not null default 'open' check (status in ('open','resolved')),
  studio_response text,
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_feedback_target_shape check (
    (target_type = 'project' and target_id is null)
    or (target_type <> 'project' and target_id is not null)
  ),
  constraint project_feedback_message_bounds check (
    char_length(message) <= 2000
    and (
      intent = 'looks_good'
      or (intent = 'comment' and char_length(btrim(message)) >= 2)
      or (intent = 'changes_requested' and char_length(btrim(message)) >= 10)
    )
  ),
  constraint project_feedback_response_bounds check (
    studio_response is null
    or (char_length(btrim(studio_response)) >= 2 and char_length(studio_response) <= 2000)
  ),
  constraint project_feedback_response_metadata check (
    (studio_response is null and responded_by is null and responded_at is null)
    or (studio_response is not null and responded_at is not null)
  ),
  constraint project_feedback_resolution_metadata check (
    (status = 'open' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create index if not exists project_feedback_project_history
  on public.project_feedback(project_id, created_at, id);
create index if not exists project_feedback_project_open
  on public.project_feedback(project_id, created_at desc)
  where status = 'open';
create index if not exists project_feedback_target_history
  on public.project_feedback(project_id, target_type, target_id, created_at, id);
create index if not exists project_feedback_author
  on public.project_feedback(author_user_id, created_at desc);

create or replace function public.validate_project_feedback_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_label text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception using errcode = '42501', message = 'Authentication required';
    end if;

    -- Authorship and lifecycle metadata always come from the authenticated
    -- database context, never from browser-supplied values.
    new.author_user_id := auth.uid();
    new.status := 'open';
    new.studio_response := null;
    new.responded_by := null;
    new.responded_at := null;
    new.resolved_at := null;
    new.created_at := now();
    new.updated_at := now();
  end if;

  case new.target_type
    when 'project' then
      if new.target_id is not null then
        raise exception using errcode = '23514', message = 'General project feedback cannot include a target id';
      end if;
      select name into verified_label
      from public.client_projects
      where id = new.project_id;
    when 'milestone' then
      select title into verified_label
      from public.project_milestones
      where id = new.target_id and project_id = new.project_id;
    when 'update' then
      select title into verified_label
      from public.project_updates
      where id = new.target_id and project_id = new.project_id;
    when 'deliverable' then
      select title into verified_label
      from public.project_deliverables
      where id = new.target_id and project_id = new.project_id;
    else
      raise exception using errcode = '23514', message = 'Invalid feedback target type';
  end case;

  if verified_label is null then
    raise exception using errcode = '23514', message = 'Feedback target does not belong to this Client Project';
  end if;

  -- Snapshot only a database-verified label so feedback remains understandable
  -- if a Studio-owned source record is later removed.
  new.target_label := verified_label;
  return new;
end
$$;

drop trigger if exists project_feedback_validate_target on public.project_feedback;
create trigger project_feedback_validate_target
before insert or update of project_id, target_type, target_id
on public.project_feedback
for each row execute function public.validate_project_feedback_target();

drop trigger if exists project_feedback_updated_at on public.project_feedback;
create trigger project_feedback_updated_at
before update on public.project_feedback
for each row execute function public.touch_client_workspace_updated_at();

alter table public.project_feedback enable row level security;

drop policy if exists "members read authorized project feedback" on public.project_feedback;
create policy "members read authorized project feedback"
on public.project_feedback for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));

drop policy if exists "clients create their own project feedback" on public.project_feedback;
create policy "clients create their own project feedback"
on public.project_feedback for insert
with check (
  auth.uid() is not null
  and author_user_id = auth.uid()
  and public.is_client_project_member(project_id)
  and status = 'open'
  and studio_response is null
  and responded_by is null
  and responded_at is null
  and resolved_at is null
);

drop policy if exists "admins update project feedback" on public.project_feedback;
create policy "admins update project feedback"
on public.project_feedback for update
using (public.is_studio_admin())
with check (public.is_studio_admin());

revoke all on table public.project_feedback from public, anon;
revoke delete, truncate on table public.project_feedback from authenticated;
grant select, insert, update on table public.project_feedback to authenticated;

revoke all on function public.validate_project_feedback_target() from public, anon, authenticated;

comment on table public.project_feedback is
  'Private Client Project feedback. Client entries are append-only; Studio responses and resolution remain historical.';
comment on column public.project_feedback.target_label is
  'Database-verified snapshot of the target title/name. Browser input is always overwritten by the validation trigger.';
comment on column public.project_feedback.intent is
  'Client intent only. looks_good does not automatically change Studio-owned deliverable status.';
