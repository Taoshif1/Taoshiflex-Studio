-- Phase 1C.1: stable, non-sequential client-facing inquiry references.

alter table public.inquiries add column if not exists reference text;

update public.inquiries
set reference = 'TS-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
where reference is null;

alter table public.inquiries
  alter column reference set default ('TS-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))),
  alter column reference set not null;

create unique index if not exists inquiries_reference_key on public.inquiries(reference);

alter table public.inquiries drop constraint if exists inquiries_reference_format;
alter table public.inquiries
  add constraint inquiries_reference_format check (reference ~ '^TS-[0-9A-F]{8}$');
