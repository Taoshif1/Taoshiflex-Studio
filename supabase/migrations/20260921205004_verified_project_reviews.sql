create table public.project_reviews (
 id uuid primary key default gen_random_uuid(),
 client_project_id uuid not null references public.client_projects(id) on delete restrict,
 public_project_id uuid references public.projects(id) on delete set null,
 reviewer_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 reviewer_name text not null check(length(trim(reviewer_name)) between 2 and 100),
 reviewer_role text not null default '' check(length(reviewer_role)<=100),
 reviewer_company text not null default '' check(length(reviewer_company)<=120),
 rating integer not null check(rating between 1 and 5),
 review_text text not null check(length(trim(review_text)) between 20 and 1500),
 submitted_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 published boolean not null default false,
 featured boolean not null default false,
 sort_order integer not null default 0,
 moderation_note text not null default '' check(length(moderation_note)<=2000),
 unique(client_project_id,reviewer_user_id),
 check(not featured or published)
);
alter table public.project_reviews enable row level security;
revoke all on public.project_reviews from anon,authenticated;
grant select(id,client_project_id,reviewer_user_id,reviewer_name,reviewer_role,reviewer_company,rating,review_text,submitted_at,published) on public.project_reviews to authenticated;
grant insert(client_project_id,reviewer_name,reviewer_role,reviewer_company,rating,review_text) on public.project_reviews to authenticated;
grant all on public.project_reviews to service_role;
create policy "clients read own reviews" on public.project_reviews for select to authenticated using(reviewer_user_id=auth.uid());
create policy "completed project clients submit once" on public.project_reviews for insert to authenticated with check(
 reviewer_user_id=auth.uid() and not published and not featured and public_project_id is null
 and exists(select 1 from public.client_project_members m where m.project_id=client_project_id and m.user_id=auth.uid() and m.role='client')
 and exists(select 1 from public.client_projects p where p.id=client_project_id and p.status='completed')
);
create trigger project_reviews_updated_at before update on public.project_reviews for each row execute function public.touch_client_workspace_updated_at();
create function public.preserve_review_testimony() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.client_project_id,new.reviewer_user_id,new.reviewer_name,new.reviewer_role,new.reviewer_company,new.rating,new.review_text,new.submitted_at)
 is distinct from (old.client_project_id,old.reviewer_user_id,old.reviewer_name,old.reviewer_role,old.reviewer_company,old.rating,old.review_text,old.submitted_at)
 then raise exception 'Submitted testimony is immutable'; end if;
 return new;
end $$;
create trigger preserve_review_testimony before update on public.project_reviews for each row execute function public.preserve_review_testimony();
-- Intentionally constrained definer projection. Base rows are not public;
-- only published testimony and public project fields, never private identities.
create view public.published_project_reviews with(security_barrier=true) as
select r.id,r.reviewer_name,r.reviewer_role,r.reviewer_company,r.rating,r.review_text,r.featured,r.sort_order,
 p.slug as project_slug,p.name as project_name,p.accent
from public.project_reviews r left join public.projects p on p.id=r.public_project_id and p.published
where r.published;
revoke all on public.published_project_reviews from public,anon,authenticated;
grant select on public.published_project_reviews to anon,authenticated,service_role;
create index project_reviews_public_order on public.project_reviews(published,featured,sort_order);
