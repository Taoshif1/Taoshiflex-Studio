import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Postgres enforces review eligibility, uniqueness, immutable testimony and public privacy', async () => {
  const db = new PGlite();
  const user='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222', project='33333333-3333-4333-8333-333333333333', active='44444444-4444-4444-8444-444444444444';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;
      create table public.client_projects(id uuid primary key,status text);
      create table public.client_project_members(project_id uuid,user_id uuid,role text);
      create table public.projects(id uuid primary key,slug text,name text,accent text,published boolean);
      grant select on public.client_projects,public.client_project_members to authenticated;
      alter table public.client_projects enable row level security;
      alter table public.client_project_members enable row level security;
      create policy own_members on public.client_project_members for select to authenticated using(user_id=auth.uid());
      create policy own_projects on public.client_projects for select to authenticated using(exists(select 1 from public.client_project_members m where m.project_id=id and m.user_id=auth.uid()));
      create function public.touch_client_workspace_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
      insert into auth.users values('${user}'),('${other}');
      insert into public.client_projects values('${project}','completed'),('${active}','active');
      insert into public.client_project_members values('${project}','${user}','client'),('${active}','${user}','client');`);
    await db.exec(readFileSync(new URL('../supabase/migrations/20260921202534_verified_project_reviews.sql',import.meta.url),'utf8'));
    const insert=id=>`insert into public.project_reviews(client_project_id,reviewer_name,rating,review_text) values('${id}','Real client',5,'A thoughtful and reliable delivery experience.')`;
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${other}',false);`);
    await assert.rejects(db.exec(insert(project)),/row-level security/);
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false);`);
    await assert.rejects(db.exec(insert(active)),/row-level security/);
    await db.exec(insert(project));
    await assert.rejects(db.exec(insert(project)),/unique constraint/);
    await assert.rejects(db.exec(`update public.project_reviews set published=true`),/permission denied/);
    await assert.rejects(db.query(`select moderation_note from public.project_reviews`),/permission denied/);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.project_reviews'),/permission denied/);
    assert.equal((await db.query('select * from public.published_project_reviews')).rows.length,0);
    await db.exec('reset role');
    await assert.rejects(db.exec("update public.project_reviews set review_text='Admin rewrote this client review.'"),/immutable/);
    await db.exec('update public.project_reviews set published=true,featured=true');
    await db.exec('set role anon');
    const rows=(await db.query('select * from public.published_project_reviews')).rows;
    assert.equal(rows.length,1);assert.equal(rows[0].featured,true);
    for(const key of ['reviewer_user_id','client_project_id','moderation_note','email'])assert.equal(key in rows[0],false);
    await assert.rejects(db.query('select * from public.client_projects'),/permission denied/);
    await assert.rejects(db.query('select * from public.client_project_members'),/permission denied/);
  } finally { await db.close(); }
});
