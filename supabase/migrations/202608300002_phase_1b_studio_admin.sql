-- Phase 1B: curated projects, pricing, assistant settings, and private Studio Admin.
alter table public.projects
  add column if not exists client text,
  add column if not exists repository_url text,
  add column if not exists live_url text,
  add column if not exists github_repository_id bigint unique,
  add column if not exists github_updated_at timestamptz,
  add column if not exists featured boolean not null default false,
  add column if not exists show_repository boolean not null default false,
  add column if not exists accent text not null default '#b89055';

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  price_from integer, currency text not null default 'BDT' check (currency = 'BDT'), description text not null,
  delivery_estimate text not null, revisions text, support text, category text not null,
  featured boolean not null default false, enabled boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.package_features (
  id uuid primary key default gen_random_uuid(), package_id uuid not null references public.service_packages(id) on delete cascade,
  label text not null, sort_order integer not null default 0
);
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(), messages jsonb not null default '[]'::jsonb,
  lead jsonb, created_at timestamptz not null default now()
);

alter table public.service_packages enable row level security;
alter table public.package_features enable row level security;
alter table public.assistant_conversations enable row level security;
create policy "enabled packages are public" on public.service_packages for select using (enabled = true);
create policy "enabled package features are public" on public.package_features for select using (
  exists(select 1 from public.service_packages p where p.id=package_id and p.enabled=true)
);

create or replace function public.is_studio_admin() returns boolean language sql stable security definer
set search_path = public as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()) $$;
create policy "admins manage projects" on public.projects for all using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins manage project media" on public.project_media for all using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins manage packages" on public.service_packages for all using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins manage package features" on public.package_features for all using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins read inquiries" on public.inquiries for select using (public.is_studio_admin());
create policy "admins update inquiries" on public.inquiries for update using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins manage settings" on public.site_settings for all using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "admins read assistant conversations" on public.assistant_conversations for select using (public.is_studio_admin());

insert into public.site_settings(key,value,public) values ('assistant', '{"enabled":true,"name":"Studio Assistant","greeting":"What are you planning to build?","instructions":"Answer only from approved studio services, pricing and process information.","knowledgeCategories":["services","pricing","process","projects"],"showPricing":true,"leadCapture":true,"handoffUrl":"/start-a-project","maximumMessages":8,"logConversations":false}'::jsonb, true)
on conflict (key) do nothing;
