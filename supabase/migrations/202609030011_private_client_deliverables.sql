-- Phase 1J: private client deliverable files.
-- Files remain private in Supabase Storage and are exposed to clients only through
-- short-lived signed URLs created after application-level project authorization.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-deliverables',
  'client-deliverables',
  false,
  26214400,
  array[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.project_deliverables.storage_path is
  'Private object path in the client-deliverables bucket. Never expose this path as a public Storage URL.';
