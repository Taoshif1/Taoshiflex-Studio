-- Phase 1C: public project image storage and explicit cover/gallery roles.
alter table public.project_media
  add column if not exists role text not null default 'gallery'
  check (role in ('cover','gallery'));

alter table public.project_media drop constraint if exists project_media_kind_check;
alter table public.project_media add constraint project_media_kind_check check (kind = 'image') not valid;

create unique index if not exists project_media_one_cover_per_project
  on public.project_media(project_id) where role = 'cover';
create index if not exists project_media_project_order
  on public.project_media(project_id, role, sort_order);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-media','project-media',true,6291456,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public reads project media objects" on storage.objects;
create policy "public reads project media objects" on storage.objects for select
using (bucket_id = 'project-media');

comment on column public.project_media.role is 'Editorial role: one cover per project or an ordered gallery image.';
