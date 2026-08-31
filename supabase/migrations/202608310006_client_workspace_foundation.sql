-- Phase 1D: private client delivery workspace, separate from public portfolio projects.

alter table public.inquiries drop constraint if exists inquiries_status_check;
alter table public.inquiries add constraint inquiries_status_check
  check (status in ('new','contacted','qualified','converted','closed')) not valid;
alter table public.inquiries validate constraint inquiries_status_check;

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  source_inquiry_id uuid unique references public.inquiries(id) on delete set null,
  name text not null,
  client_name text not null,
  summary text not null default '',
  status text not null default 'planning' check (status in ('planning','active','client_review','on_hold','completed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  current_phase text not null default 'Planning',
  next_action text not null default '',
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  ,check (target_date is null or start_date is null or target_date >= start_date)
);

create table public.client_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('client','studio')),
  created_at timestamptz not null default now(),
  unique(project_id,user_id)
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','in_progress','client_review','completed')),
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'preparing' check (status in ('preparing','ready_for_review','approved','delivered')),
  external_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (external_url is null or external_url ~ '^https?://')
);

create index client_projects_status_order on public.client_projects(status, updated_at desc);
create index client_project_members_user on public.client_project_members(user_id, project_id);
create index project_milestones_order on public.project_milestones(project_id, sort_order, created_at);
create index project_updates_order on public.project_updates(project_id, published_at desc);
create index project_deliverables_order on public.project_deliverables(project_id, updated_at desc);

create or replace function public.touch_client_workspace_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

create trigger client_projects_updated_at before update on public.client_projects
for each row execute function public.touch_client_workspace_updated_at();
create trigger project_milestones_updated_at before update on public.project_milestones
for each row execute function public.touch_client_workspace_updated_at();
create trigger project_updates_updated_at before update on public.project_updates
for each row execute function public.touch_client_workspace_updated_at();
create trigger project_deliverables_updated_at before update on public.project_deliverables
for each row execute function public.touch_client_workspace_updated_at();

alter table public.client_projects enable row level security;
alter table public.client_project_members enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_deliverables enable row level security;

create or replace function public.is_client_project_member(target_project_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.client_project_members
    where project_id=target_project_id and user_id=auth.uid()
  )
$$;

create policy "members read authorized client projects" on public.client_projects for select
using (public.is_studio_admin() or public.is_client_project_member(id));
create policy "admins manage client projects" on public.client_projects for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read their memberships" on public.client_project_members for select
using (public.is_studio_admin() or user_id=auth.uid());
create policy "admins manage client memberships" on public.client_project_members for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read authorized milestones" on public.project_milestones for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "admins manage milestones" on public.project_milestones for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read authorized updates" on public.project_updates for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "admins manage updates" on public.project_updates for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read authorized deliverables" on public.project_deliverables for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "admins manage deliverables" on public.project_deliverables for all
using (public.is_studio_admin()) with check (public.is_studio_admin());

revoke all on function public.is_client_project_member(uuid) from public,anon;
grant execute on function public.is_client_project_member(uuid) to authenticated;

create or replace function public.convert_qualified_inquiry(
  inquiry_id uuid, project_name text, business_name text, project_summary text,
  project_status text default 'planning', phase text default 'Planning', next_step text default '',
  project_start date default null, project_target date default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare lead public.inquiries%rowtype; existing_id uuid; created_id uuid;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  select * into lead from public.inquiries where id=inquiry_id for update;
  if not found then raise exception 'Inquiry not found'; end if;
  select id into existing_id from public.client_projects where source_inquiry_id=inquiry_id;
  if existing_id is not null then
    update public.inquiries set status='converted' where id=inquiry_id and status<>'converted';
    return existing_id;
  end if;
  if lead.status<>'qualified' then raise exception 'Only qualified inquiries can be converted'; end if;
  insert into public.client_projects(reference,source_inquiry_id,name,client_name,summary,status,current_phase,next_action,start_date,target_date)
  values(lead.reference,inquiry_id,project_name,business_name,project_summary,project_status,phase,next_step,project_start,project_target)
  returning id into created_id;
  update public.inquiries set status='converted' where id=inquiry_id;
  return created_id;
end $$;

create or replace function public.add_client_project_member_by_email(target_project_id uuid, member_email text, member_role text default 'client')
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare target_user uuid; member_id uuid;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  if member_role not in ('client','studio') then raise exception 'Invalid member role'; end if;
  select id into target_user from auth.users where lower(email)=lower(trim(member_email)) limit 1;
  if target_user is null then raise exception 'No Supabase Auth user exists for this email'; end if;
  insert into public.client_project_members(project_id,user_id,email,role)
  values(target_project_id,target_user,lower(trim(member_email)),member_role)
  on conflict(project_id,user_id) do update set email=excluded.email,role=excluded.role
  returning id into member_id;
  return member_id;
end $$;

revoke all on function public.convert_qualified_inquiry(uuid,text,text,text,text,text,text,date,date) from public,anon;
grant execute on function public.convert_qualified_inquiry(uuid,text,text,text,text,text,text,date,date) to authenticated;
revoke all on function public.add_client_project_member_by_email(uuid,text,text) from public,anon;
grant execute on function public.add_client_project_member_by_email(uuid,text,text) to authenticated;

comment on table public.client_projects is 'Private operational delivery projects. Never use public portfolio projects for client workspace data.';
comment on column public.client_projects.reference is 'Human-facing identifier only; never an authentication credential.';
comment on column public.project_deliverables.storage_path is 'Reserved for a future private client-deliverables bucket and signed URL flow. Phase 1D does not upload files.';
