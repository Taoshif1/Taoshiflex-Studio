-- Phase 1 future foundation. The public application uses typed local content.
create extension if not exists pgcrypto;
create table public.projects (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, category text not null, status text not null, summary text not null, content jsonb not null default '{}'::jsonb, published boolean not null default false, sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.project_media (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, kind text not null check(kind in ('image','video')), storage_path text, alt text not null, metadata jsonb not null default '{}'::jsonb, sort_order integer not null default 0);
create table public.capabilities (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, content jsonb not null default '{}'::jsonb, published boolean not null default false, sort_order integer not null default 0);
create table public.inquiries (id uuid primary key default gen_random_uuid(), payload jsonb not null, email text not null, status text not null default 'new', created_at timestamptz not null default now());
create table public.testimonials (id uuid primary key default gen_random_uuid(), quote text not null, author text not null, role text, published boolean not null default false, sort_order integer not null default 0);
create table public.site_settings (key text primary key, value jsonb not null default '{}'::jsonb, public boolean not null default false);
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.projects enable row level security; alter table public.project_media enable row level security; alter table public.capabilities enable row level security; alter table public.inquiries enable row level security; alter table public.testimonials enable row level security; alter table public.site_settings enable row level security; alter table public.admin_users enable row level security;
create policy "published projects are public" on public.projects for select using (published = true);
create policy "published project media are public" on public.project_media for select using (exists(select 1 from public.projects p where p.id=project_id and p.published=true));
create policy "published capabilities are public" on public.capabilities for select using (published = true);
create policy "published testimonials are public" on public.testimonials for select using (published = true);
create policy "public settings are readable" on public.site_settings for select using (public = true);
-- Inquiry inserts should go through a validated, rate-limited server route using a service role; no anonymous insert policy is intentionally created.
-- Admin CRUD policies will verify auth.uid() exists in admin_users when the private studio manager is built.
