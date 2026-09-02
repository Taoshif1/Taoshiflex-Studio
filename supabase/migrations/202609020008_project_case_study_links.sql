alter table public.projects
  add column if not exists behance_url text,
  add column if not exists facebook_url text;

alter table public.projects
  drop constraint if exists projects_behance_url_http_check,
  add constraint projects_behance_url_http_check
    check (behance_url is null or behance_url ~* '^https?://');

alter table public.projects
  drop constraint if exists projects_facebook_url_http_check,
  add constraint projects_facebook_url_http_check
    check (facebook_url is null or facebook_url ~* '^https?://');
