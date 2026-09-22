
create table public.products (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=80),
 name text not null check(length(trim(name)) between 2 and 160),
 tagline text not null default '' check(length(tagline)<=200),
 summary text not null default '' check(length(summary)<=500),
 story text not null default '' check(length(story)<=8000),
 problem text not null default '' check(length(problem)<=4000),
 solution text not null default '' check(length(solution)<=4000),
 roadmap text not null default '' check(length(roadmap)<=4000),
 status text not null default 'In Development' check(status in ('Live','Beta','In Development','Coming Soon')),
 category text not null default 'Software' check(length(category)<=80),
 accent text not null default '#b89055' check(accent ~ '^#[0-9a-fA-F]{6}$'),
 features text[] not null default '{}', technologies text[] not null default '{}',
 product_url text check(product_url is null or product_url ~ '^https://'),
 repository_url text check(repository_url is null or repository_url ~ '^https://'),
 show_repository boolean not null default false,
 source_repository_private boolean not null default false,
 pricing_model text not null default '' check(length(pricing_model)<=160),
 launch_date date,
 featured boolean not null default false, published boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not featured or published),
 check(not source_repository_private or (not show_repository and repository_url is null)),
 check(not published or (length(trim(summary))>=20 and length(trim(tagline))>=2)),
 check(cardinality(features)<=30 and cardinality(technologies)<=30)
);
alter table public.products enable row level security;
revoke all on public.products from anon,authenticated;
grant all on public.products to service_role;
create policy "admins manage products" on public.products for all to authenticated using(public.is_studio_admin()) with check(public.is_studio_admin());
create trigger products_updated_at before update on public.products for each row execute function public.touch_client_workspace_updated_at();
create table public.product_media (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,
 role text not null check(role in ('cover','gallery')),storage_path text not null unique,
 alt text not null check(length(trim(alt)) between 1 and 240),sort_order integer not null default 0,
 metadata jsonb not null default '{}',created_at timestamptz not null default now(),
 check(storage_path like 'products/' || product_id::text || '/%')
);
create unique index product_one_cover on public.product_media(product_id) where role='cover';
create index product_gallery_order on public.product_media(product_id,sort_order);
alter table public.product_media enable row level security;
revoke all on public.product_media from anon,authenticated;
grant all on public.product_media to service_role;
-- Constrained public projection; private source flag and hidden URLs never leave the DB.
create view public.published_products with(security_barrier=true) as
select p.id,p.slug,p.name,p.tagline,p.summary,p.story,p.problem,p.solution,p.roadmap,p.status,p.category,p.accent,p.features,p.technologies,
 p.product_url,case when p.show_repository and not p.source_repository_private then p.repository_url else null end as repository_url,
 p.pricing_model,p.launch_date,p.featured,p.sort_order,p.created_at,p.updated_at,
 coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'storage_path',m.storage_path,'alt',m.alt,'sort_order',m.sort_order) order by m.sort_order,m.id) from public.product_media m where m.product_id=p.id),'[]'::jsonb) as media
from public.products p where p.published;
revoke all on public.published_products from public,anon,authenticated;
grant select on public.published_products to anon,authenticated,service_role;
create index products_public_order on public.products(published,featured,sort_order);

-- Imported sources are private until verified otherwise. This does not publish drafts.
alter table public.projects add column source_repository_private boolean not null default false;
update public.projects set source_repository_private=true where github_repository_id is not null;
-- Keep the existing row policies, but remove raw access to source metadata and JSON.
revoke select on public.projects from anon,authenticated;
grant select(id,slug,name,category,status,summary,published,sort_order,created_at,updated_at,client,accent,featured,live_url,behance_url,facebook_url) on public.projects to anon,authenticated;
create view public.published_work with(security_barrier=true) as
select p.id,p.slug,p.name,p.category,p.status,p.summary,p.published,p.sort_order,p.created_at,p.updated_at,p.client,p.accent,p.featured,p.live_url,p.behance_url,p.facebook_url,
 case when p.show_repository and not p.source_repository_private then p.repository_url else null end as repository_url,
 (p.show_repository and not p.source_repository_private) as show_repository,
 jsonb_build_object('year',p.content->'year','context',p.content->'context','challenge',p.content->'challenge','approach',p.content->'approach','solution',p.content->'solution','result',p.content->'result','capabilities',p.content->'capabilities','features',p.content->'features','technicalNotes',p.content->'technicalNotes','media',p.content->'media') as content,
 coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'storage_path',m.storage_path,'alt',m.alt,'sort_order',m.sort_order,'metadata',m.metadata)) from public.project_media m where m.project_id=p.id),'[]'::jsonb) as project_media
from public.projects p where p.published;
revoke all on public.published_work from public,anon,authenticated;
grant select on public.published_work to anon,authenticated,service_role;
