-- Phase 1G: persisted, recipient-specific attention signals.
-- Apply after migration 008. Trigger creation is intentionally non-retroactive:
-- existing workspace records and inquiries do not receive notifications.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null check (audience in ('client','studio')),
  project_id uuid references public.client_projects(id) on delete cascade,
  type text not null check (type in (
    'project_update',
    'milestone_status',
    'deliverable_review',
    'studio_feedback_response',
    'feedback_resolved',
    'client_feedback',
    'client_changes_requested',
    'new_inquiry'
  )),
  priority text not null default 'normal' check (priority in ('normal','attention')),
  source_type text not null check (source_type in (
    'project_update',
    'project_milestone',
    'project_deliverable',
    'project_feedback',
    'inquiry'
  )),
  source_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null default '' check (char_length(message) <= 280),
  href text not null check (
    char_length(href) between 1 and 500
    and href ~ '^/[A-Za-z0-9]'
    and href !~ '^//'
    and href !~ '[[:cntrl:]]'
  ),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_latest
  on public.notifications(recipient_user_id, created_at desc, id desc);
create index if not exists notifications_recipient_unread
  on public.notifications(recipient_user_id, created_at desc, id desc)
  where read_at is null;
create index if not exists notifications_project_unread
  on public.notifications(recipient_user_id, project_id, created_at desc)
  where read_at is null and project_id is not null;

create or replace function public.emit_notification(
  target_user_id uuid,
  target_audience text,
  target_project_id uuid,
  event_type text,
  event_priority text,
  event_source_type text,
  event_source_id uuid,
  event_title text,
  event_message text,
  event_href text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then return; end if;
  if target_audience = 'client' and (
    target_project_id is null
    or not exists (
      select 1 from public.client_project_members
      where project_id = target_project_id
        and user_id = target_user_id
        and role = 'client'
    )
  ) then return; end if;
  if target_audience = 'studio' and not exists (
    select 1 from public.admin_users where user_id = target_user_id
  ) then return; end if;

  insert into public.notifications(
    recipient_user_id, audience, project_id, type, priority,
    source_type, source_id, title, message, href
  ) values (
    target_user_id, target_audience, target_project_id, event_type, event_priority,
    event_source_type, event_source_id, left(event_title,120),
    left(coalesce(event_message,''),280), event_href
  );
end
$$;

create or replace function public.guard_notification_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.id, new.recipient_user_id, new.audience, new.project_id, new.type,
    new.priority, new.source_type, new.source_id, new.title, new.message,
    new.href, new.created_at
  ) is distinct from row(
    old.id, old.recipient_user_id, old.audience, old.project_id, old.type,
    old.priority, old.source_type, old.source_id, old.title, old.message,
    old.href, old.created_at
  ) then
    raise exception using errcode = '55000', message = 'Notification history is immutable';
  end if;
  if old.read_at is not null then
    raise exception using errcode = '55000', message = 'Read notifications cannot be marked unread or rewritten';
  end if;
  if new.read_at is null then
    raise exception using errcode = '23514', message = 'Notifications may only transition from unread to read';
  end if;
  new.read_at := now();
  return new;
end
$$;

drop trigger if exists notifications_guard_history on public.notifications;
create trigger notifications_guard_history
before update on public.notifications
for each row execute function public.guard_notification_history();

create or replace function public.notify_clients_project_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare member record;
begin
  for member in
    select user_id from public.client_project_members
    where project_id = new.project_id and role = 'client'
  loop
    perform public.emit_notification(
      member.user_id, 'client', new.project_id, 'project_update', 'normal',
      'project_update', new.id, 'New project update', new.title,
      '/client/projects/' || new.project_id::text || '#updates'
    );
  end loop;
  return new;
end
$$;

drop trigger if exists project_updates_notify_clients on public.project_updates;
create trigger project_updates_notify_clients
after insert on public.project_updates
for each row execute function public.notify_clients_project_update();

create or replace function public.notify_clients_milestone_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare member record; state_label text;
begin
  state_label := case new.status
    when 'pending' then 'Pending'
    when 'in_progress' then 'In Progress'
    when 'client_review' then 'Client Review'
    when 'completed' then 'Completed'
    else initcap(replace(new.status,'_',' '))
  end;
  for member in
    select user_id from public.client_project_members
    where project_id = new.project_id and role = 'client'
  loop
    perform public.emit_notification(
      member.user_id, 'client', new.project_id, 'milestone_status', 'normal',
      'project_milestone', new.id, 'Milestone updated',
      new.title || ' is now ' || state_label || '.',
      '/client/projects/' || new.project_id::text || '#milestones'
    );
  end loop;
  return new;
end
$$;

drop trigger if exists project_milestones_notify_clients on public.project_milestones;
create trigger project_milestones_notify_clients
after update of status on public.project_milestones
for each row when (old.status is distinct from new.status)
execute function public.notify_clients_milestone_status();

create or replace function public.notify_clients_deliverable_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare member record;
begin
  for member in
    select user_id from public.client_project_members
    where project_id = new.project_id and role = 'client'
  loop
    perform public.emit_notification(
      member.user_id, 'client', new.project_id, 'deliverable_review', 'attention',
      'project_deliverable', new.id, 'Deliverable ready for review',
      new.title || ' is ready for your review.',
      '/client/projects/' || new.project_id::text || '#deliverables'
    );
  end loop;
  return new;
end
$$;

drop trigger if exists project_deliverables_notify_clients_insert on public.project_deliverables;
create trigger project_deliverables_notify_clients_insert
after insert on public.project_deliverables
for each row when (new.status = 'ready_for_review')
execute function public.notify_clients_deliverable_review();
drop trigger if exists project_deliverables_notify_clients_update on public.project_deliverables;
create trigger project_deliverables_notify_clients_update
after update of status on public.project_deliverables
for each row when (
  old.status is distinct from new.status and new.status = 'ready_for_review'
)
execute function public.notify_clients_deliverable_review();

create or replace function public.notify_client_feedback_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare feedback_href text;
begin
  feedback_href := '/client/projects/' || new.project_id::text || '#' ||
    case new.target_type
      when 'milestone' then 'milestones'
      when 'update' then 'updates'
      when 'deliverable' then 'deliverables'
      else 'feedback'
    end;

  if new.studio_response is distinct from old.studio_response
     and new.studio_response is not null then
    perform public.emit_notification(
      new.author_user_id, 'client', new.project_id,
      'studio_feedback_response', 'normal', 'project_feedback', new.id,
      'Studio replied',
      'Taoshiflex Studio replied to your feedback on ' || new.target_label || '.',
      feedback_href
    );
  elsif old.status is distinct from new.status
        and new.status = 'resolved'
        and new.studio_response is null then
    perform public.emit_notification(
      new.author_user_id, 'client', new.project_id,
      'feedback_resolved', 'normal', 'project_feedback', new.id,
      'Feedback resolved',
      'Your feedback on ' || new.target_label || ' was resolved.',
      feedback_href
    );
  end if;
  return new;
end
$$;

drop trigger if exists project_feedback_notify_client on public.project_feedback;
create trigger project_feedback_notify_client
after update of studio_response, status on public.project_feedback
for each row execute function public.notify_client_feedback_lifecycle();

create or replace function public.notify_admins_client_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare admin record; project_name text;
begin
  select name into project_name from public.client_projects where id = new.project_id;
  for admin in select user_id from public.admin_users
  loop
    perform public.emit_notification(
      admin.user_id, 'studio', new.project_id,
      case when new.intent = 'changes_requested'
        then 'client_changes_requested' else 'client_feedback' end,
      case when new.intent = 'changes_requested'
        then 'attention' else 'normal' end,
      'project_feedback', new.id,
      case when new.intent = 'changes_requested'
        then 'Client requested changes' else 'New Client feedback' end,
      new.target_label || ' — ' || coalesce(project_name,'Client Project'),
      '/studio-admin/client-projects/' || new.project_id::text || '#client-feedback'
    );
  end loop;
  return new;
end
$$;

drop trigger if exists project_feedback_notify_admins on public.project_feedback;
create trigger project_feedback_notify_admins
after insert on public.project_feedback
for each row execute function public.notify_admins_client_feedback();

create or replace function public.notify_admins_inquiry()
returns trigger language plpgsql security definer set search_path = public as $$
declare admin record; sender text;
begin
  sender := coalesce(
    nullif(btrim(new.payload->>'business'),''),
    nullif(btrim(new.payload->>'name'),''),
    new.email
  );
  for admin in select user_id from public.admin_users
  loop
    perform public.emit_notification(
      admin.user_id, 'studio', null, 'new_inquiry', 'attention',
      'inquiry', new.id, 'New project inquiry',
      'New inquiry from ' || sender || '.',
      '/studio-admin/inquiries/' || new.id::text
    );
  end loop;
  return new;
end
$$;

drop trigger if exists inquiries_notify_admins on public.inquiries;
create trigger inquiries_notify_admins
after insert on public.inquiries
for each row execute function public.notify_admins_inquiry();

alter table public.notifications enable row level security;

drop policy if exists "recipients read their notifications" on public.notifications;
create policy "recipients read their notifications"
on public.notifications for select
using (
  recipient_user_id = auth.uid()
  and (
    (audience = 'studio' and public.is_studio_admin())
    or (
      audience = 'client'
      and project_id is not null
      and public.is_client_project_member(project_id)
    )
  )
);

drop policy if exists "recipients mark their notifications read" on public.notifications;
create policy "recipients mark their notifications read"
on public.notifications for update
using (
  recipient_user_id = auth.uid()
  and read_at is null
  and (
    (audience = 'studio' and public.is_studio_admin())
    or (
      audience = 'client'
      and project_id is not null
      and public.is_client_project_member(project_id)
    )
  )
)
with check (
  recipient_user_id = auth.uid()
  and read_at is not null
  and (
    (audience = 'studio' and public.is_studio_admin())
    or (
      audience = 'client'
      and project_id is not null
      and public.is_client_project_member(project_id)
    )
  )
);

revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update(read_at) on table public.notifications to authenticated;

revoke all on function public.emit_notification(uuid,text,uuid,text,text,text,uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.guard_notification_history()
  from public, anon, authenticated;
revoke all on function public.notify_clients_project_update()
  from public, anon, authenticated;
revoke all on function public.notify_clients_milestone_status()
  from public, anon, authenticated;
revoke all on function public.notify_clients_deliverable_review()
  from public, anon, authenticated;
revoke all on function public.notify_client_feedback_lifecycle()
  from public, anon, authenticated;
revoke all on function public.notify_admins_client_feedback()
  from public, anon, authenticated;
revoke all on function public.notify_admins_inquiry()
  from public, anon, authenticated;

comment on table public.notifications is
  'Persisted per-recipient attention signals. Read state is independent for every Auth user.';
comment on column public.notifications.href is
  'Database-generated internal application destination only; external and protocol-relative URLs are rejected.';
