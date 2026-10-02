-- Forward-only production hardening. Apply before deploying application code.
begin;
-- Definer routines may resolve names only through trusted schemas. Explicitly
-- put pg_temp last so temporary relations cannot shadow trusted public objects.
revoke create on schema public from public, anon, authenticated;
do $$
declare routine regprocedure;
begin
 for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosecdef
 loop
   execute format('alter function %s set search_path = public, pg_temp', routine);
 end loop;
end $$;
-- Remove Supabase default grants that bypass RLS (notably TRUNCATE), while
-- preserving the authenticated operations used by existing admin policies.
revoke all on public.admin_users from public, anon, authenticated;
revoke all on public.client_projects, public.client_project_members, public.project_milestones,
 public.project_updates, public.project_deliverables from public, anon, authenticated;
grant select,insert,update,delete on public.client_projects, public.client_project_members,
 public.project_milestones, public.project_updates, public.project_deliverables to authenticated;
revoke truncate,references,trigger on all tables in schema public from anon, authenticated;
-- Public policies refer to membership only for authenticated requests. Anonymous
-- reads must not evaluate a subquery against the private membership table.
drop policy "public reads available policy families" on public.policies;
create policy "public reads available policy families" on public.policies for select to anon,authenticated
using (public.policy_family_has_published_audience(id,array['public','both']) or public.is_studio_admin());
create policy "clients read available policy families" on public.policies for select to authenticated
using (exists(select 1 from public.client_project_members m where m.user_id=auth.uid())
 and public.policy_family_has_published_audience(id,array['client','both']));
drop policy "read permitted policy versions" on public.policy_versions;
create policy "read public policy versions" on public.policy_versions for select to anon,authenticated
using (public.is_studio_admin() or (is_published and public.policy_family_is_active(policy_id) and audience in ('public','both')));
create policy "read client policy versions" on public.policy_versions for select to authenticated
using (is_published and public.policy_family_is_active(policy_id) and audience in ('client','both')
 and exists(select 1 from public.client_project_members m where m.user_id=auth.uid()));
-- Keep explicitly authored marketing content; never project arbitrary media JSON.
revoke select on public.project_media from anon,authenticated;
grant select(id,project_id,kind,storage_path,alt,sort_order,role) on public.project_media to anon,authenticated;
create or replace view public.published_work with(security_barrier=true) as
select p.id,p.slug,p.name,p.category,p.status,p.summary,p.published,p.sort_order,p.created_at,p.updated_at,p.client,p.accent,p.featured,p.live_url,p.behance_url,p.facebook_url,
 case when p.show_repository and not p.source_repository_private then p.repository_url else null end as repository_url,
 (p.show_repository and not p.source_repository_private) as show_repository,
 jsonb_build_object('year',p.content->'year','context',p.content->'context','challenge',p.content->'challenge','approach',p.content->'approach','solution',p.content->'solution','result',p.content->'result','capabilities',p.content->'capabilities','features',p.content->'features','technicalNotes',p.content->'technicalNotes','media','[]'::jsonb) as content,
 coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'storage_path',m.storage_path,'alt',m.alt,'sort_order',m.sort_order,
 'metadata',jsonb_build_object('width',m.metadata->'width','height',m.metadata->'height','mime',m.metadata->'mime','size',m.metadata->'size')))
 from public.project_media m where m.project_id=p.id),'[]'::jsonb) as project_media
from public.projects p where p.published;
-- NOT VALID preserves legacy rows but enforces all new/updated records.
alter table public.projects add constraint projects_feature_requires_publication check(not featured or published) not valid;
alter table public.project_deliverables add constraint deliverable_path_scope check(storage_path is null or
 storage_path ~ ('^' || project_id::text || '/' || id::text || '/[a-zA-Z0-9][a-zA-Z0-9._-]{0,160}$')) not valid;
-- Durable public endpoint budgets, shared by all serverless instances.
create table public.request_budgets (
 key text primary key check(length(key)<=100), hits integer not null, expires_at timestamptz not null
);
alter table public.request_budgets enable row level security;
revoke all on public.request_budgets from public,anon,authenticated;
grant all on public.request_budgets to service_role;
create index request_budgets_expiry on public.request_budgets(expires_at);
create function public.consume_request_budget(budget_key text, maximum integer, seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
 if maximum<1 or maximum>10000 or seconds<1 or seconds>86400 or length(budget_key)>100 then raise exception 'Invalid budget'; end if;
 delete from public.request_budgets where expires_at<now();
 insert into public.request_budgets as b(key,hits,expires_at) values(budget_key,1,now()+make_interval(secs=>seconds))
 on conflict(key) do update set hits=b.hits+1 where b.hits<maximum returning hits into count_now;
 return count_now is not null;
end $$;
revoke all on function public.consume_request_budget(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_budget(text,integer,integer) to service_role;
-- Direct authenticated REST writes cannot bypass these per-account budgets.
create index project_payments_submitter_time on public.project_payments(submitted_by,created_at);
create function public.guard_client_write_rate() returns trigger language plpgsql security definer set search_path='' as $$
declare recent_count integer;
begin
 if auth.uid() is null or public.is_studio_admin() then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || tg_table_name,0));
 if tg_table_name='project_feedback' then
   select count(*) into recent_count from public.project_feedback where author_user_id=auth.uid() and created_at>now()-interval '1 minute';
   if recent_count>=20 then raise exception 'Feedback rate exceeded'; end if;
 elsif tg_table_name='project_payments' then
   select count(*) into recent_count from public.project_payments where submitted_by=auth.uid() and created_at>now()-interval '1 hour';
   if recent_count>=20 then raise exception 'Payment submission rate exceeded'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_client_write_rate() from public,anon,authenticated;
create trigger feedback_rate before insert on public.project_feedback for each row execute function public.guard_client_write_rate();
create trigger payments_rate before insert on public.project_payments for each row execute function public.guard_client_write_rate();

-- One-use recovery intents. The server-signed cookie authorizes password recovery;
-- this authenticated RPC records consumption only for the calling user.
create table public.used_recovery_intents (
 user_id uuid not null references auth.users(id) on delete cascade,
 intent_id uuid not null, expires_at timestamptz not null, primary key(user_id,intent_id)
);
alter table public.used_recovery_intents enable row level security;
revoke all on public.used_recovery_intents from public,anon,authenticated;
create function public.consume_recovery_intent(intent_id uuid,intent_expiry bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
 if auth.uid() is null or intent_id is null or intent_expiry is null or intent_expiry<=extract(epoch from now()) or intent_expiry>extract(epoch from now())+900 then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || 'recovery-intent',0));
 delete from public.used_recovery_intents where user_id=auth.uid() and expires_at<now();
 if (select count(*) from public.used_recovery_intents where user_id=auth.uid())>=30 then return false; end if;
 insert into public.used_recovery_intents(user_id,intent_id,expires_at)
 values(auth.uid(),intent_id,to_timestamp(intent_expiry)) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count=1;
end $$;
revoke all on function public.consume_recovery_intent(uuid,bigint) from public,anon;
grant execute on function public.consume_recovery_intent(uuid,bigint) to authenticated;

commit;
