import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('full migration chain enforces anonymous isolation, client IDOR, ledger and review integrity',async()=>{
 const db=new PGlite();
 const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',admin='99999999-9999-4999-8999-999999999999';
 const one='33333333-3333-4333-8333-333333333333',two='44444444-4444-4444-8444-444444444444',delivery='55555555-5555-4555-8555-555555555555';
 try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function public.gen_random_bytes(n integer) returns bytea language sql as $$select substring(decode(md5(random()::text),'hex') from 1 for n)$$;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;");
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
  const sql=readFileSync('supabase/migrations/'+file,'utf8').replace('create extension if not exists pgcrypto;','');
  await db.exec(sql);
 }
 await db.exec("insert into auth.users values('"+alice+"','alice@example.test'),('"+bob+"','bob@example.test'),('"+admin+"','admin@example.test');insert into public.admin_users(user_id) values('"+admin+"');"+
 "insert into public.client_projects(id,reference,name,client_name,status) values('"+one+"','TS-11111111','One','Alice','completed'),('"+two+"','TS-22222222','Two','Bob','active');"+
 "insert into public.client_project_members(project_id,user_id,email) values('"+one+"','"+alice+"','alice@example.test'),('"+two+"','"+bob+"','bob@example.test');"+
 "insert into public.project_milestones(project_id,title) values('"+one+"','One milestone'),('"+two+"','Two milestone');"+
 "insert into public.project_updates(project_id,title,body) values('"+one+"','One update','Private'),('"+two+"','Two update','Private');"+
 "insert into public.project_deliverables(id,project_id,title,storage_path) values('"+delivery+"','"+one+"','File','"+one+"/"+delivery+"/file.pdf');"+
 "select set_config('request.jwt.claim.sub','"+admin+"',false);select public.initialize_project_billing('"+one+"',10000,'BDT',2::smallint,30);select public.initialize_project_billing('"+two+"',10000,'BDT',2::smallint,30);");
 await db.exec("set role anon;select set_config('request.jwt.claim.sub','',false)");
 for(const table of ['admin_users','client_projects','client_project_members','project_milestones','project_updates','project_deliverables','project_billing','project_payment_schedule','project_payments','project_feedback','notifications','products','product_media','project_reviews','request_budgets']){
  await assert.rejects(db.query('select * from public.'+table),/permission denied/,table);
 }
 for(const table of ['inquiries','assistant_conversations'])assert.equal((await db.query('select * from public.'+table)).rows.length,0);
 for(const view of ['published_work','published_products','published_project_reviews','policies','policy_versions'])assert.ok((await db.query('select * from public.'+view)).rows);
 await assert.rejects(db.query("select public.consume_request_budget('x',1,60)"),/permission denied/);
 await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','"+bob+"',false)");
 for(const [table,col] of [['client_projects','id'],['client_project_members','project_id'],['project_milestones','project_id'],['project_updates','project_id'],['project_deliverables','project_id'],['project_billing','project_id'],['project_payment_schedule','project_id'],['project_billing_summaries','project_id'],['project_payments','project_id'],['project_feedback','project_id'],['notifications','project_id']]){
  assert.equal((await db.query("select * from public."+table+" where "+col+"='"+one+"'")).rows.length,0,table);
 }
 await assert.rejects(db.exec("insert into public.client_project_members(project_id,user_id,email) values('"+one+"','"+bob+"','bob@example.test')"),/row-level security/);
 await assert.rejects(db.exec("select public.add_client_project_member_by_email('"+one+"','bob@example.test')"),/authorization required/);
 await assert.rejects(db.exec('truncate public.client_projects cascade'),/permission denied/);
 await assert.rejects(db.exec("insert into public.project_feedback(project_id,target_type,intent,message) values('"+one+"','project','comment','forged feedback')"),/row-level security/);
 await assert.rejects(db.exec("insert into public.project_reviews(client_project_id,reviewer_name,rating,review_text) values('"+one+"','Forged review',5,'A forged review from a different client.')"),/row-level security/);
 await assert.rejects(db.exec("insert into public.project_payments(project_id,amount_minor,currency,payment_method) values('"+one+"',100,'BDT','bank_transfer')"),/membership required/);
 await db.exec("select set_config('request.jwt.claim.sub','"+alice+"',false)");
 await db.exec("insert into public.project_payments(project_id,amount_minor,currency,payment_method,submitted_by,origin,status,confirmed_by,confirmed_at) values('"+one+"',100,'BDT','bank_transfer','"+bob+"','admin_manual','confirmed','"+admin+"',now())");
 const payment=(await db.query('select * from public.project_payments')).rows[0];
 assert.equal(payment.status,'pending');assert.equal(payment.submitted_by,alice);assert.equal(payment.confirmed_by,null);
 for(const amount of [-1,0,10001])await assert.rejects(db.exec("insert into public.project_payments(project_id,amount_minor,currency,payment_method) values('"+one+"',"+amount+",'BDT','bank_transfer')"));
 const otherSchedule=(await db.query("select id from public.project_payment_schedule where project_id='"+two+"'")).rows;
 assert.equal(otherSchedule.length,0);
 await db.exec("insert into public.project_feedback(project_id,target_type,intent,message,author_user_id,status) values('"+one+"','project','comment','Real feedback','"+bob+"','resolved')");
 const feedback=(await db.query('select * from public.project_feedback')).rows[0];
 assert.equal(feedback.author_user_id,alice);assert.equal(feedback.status,'open');
 await db.exec("insert into public.project_reviews(client_project_id,reviewer_name,rating,review_text) values('"+one+"','Alice',5,'A legitimate completed project review.')");
 await assert.rejects(db.exec("update public.project_reviews set published=true"),/permission denied/);
 const intentId='88888888-8888-4888-8888-888888888888';
 const expiry=Math.floor(Date.now()/1000)+800;
 assert.equal((await db.query("select public.consume_recovery_intent('"+intentId+"',"+expiry+") as ok")).rows[0].ok,true);
 assert.equal((await db.query("select public.consume_recovery_intent('"+intentId+"',"+expiry+") as ok")).rows[0].ok,false);
 await assert.rejects(db.exec("insert into public.admin_users(user_id) values('"+alice+"')"),/permission denied/);
 await assert.rejects(db.exec("select public.decide_project_payment('"+payment.id+"','confirmed','forged')"),/authorization required/);
 assert.equal((await db.query("select id from public.client_projects where id='"+one+"'")).rows.length,1);
 for(let i=1;i<20;i++)await db.exec("insert into public.project_feedback(project_id,target_type,intent,message) values('"+one+"','project','comment','Rate fixture')");
 await assert.rejects(db.exec("insert into public.project_feedback(project_id,target_type,intent,message) values('"+one+"','project','comment','Blocked rate fixture')"),/rate exceeded/);
 for(let i=1;i<20;i++)await db.exec("insert into public.project_payments(project_id,amount_minor,currency,payment_method) values('"+one+"',1,'BDT','bank_transfer')");
 await assert.rejects(db.exec("insert into public.project_payments(project_id,amount_minor,currency,payment_method) values('"+one+"',1,'BDT','bank_transfer')"),/rate exceeded/);
 await db.exec("select set_config('request.jwt.claim.sub','"+admin+"',false)");
 assert.equal((await db.query('select id from public.client_projects')).rows.length,2);
 await db.exec("select public.decide_project_payment('"+payment.id+"','confirmed','Verified')");
 assert.equal((await db.query("select status from public.project_payments where id='"+payment.id+"'")).rows[0].status,'confirmed');
 await db.exec('reset role');
 const unsafe=(await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proconfig is null")).rows;
 assert.equal(unsafe.length,0);
 await db.exec("insert into public.projects(slug,name,category,status,summary,published,repository_url,show_repository,source_repository_private,content) values('security-public','Public Work','Website','Live','Public summary',true,'https://github.com/private/source',true,true,'{\"year\":\"2026\",\"context\":\"Public context\",\"github_token\":\"private-fixture\",\"media\":[{\"secret\":true}]}');");
 await db.exec("insert into public.products(slug,name,tagline,summary,published,source_repository_private) values('security-product','Public Product','Public tagline','A published product description.',true,true)");
 await db.exec("update public.project_reviews set published=true,featured=true");
 await db.exec('set role anon');
 const work=(await db.query("select * from public.published_work where slug='security-public'")).rows[0];
 assert.equal(work.repository_url,null);assert.equal(work.content.context,'Public context');assert.equal(work.content.github_token,undefined);assert.deepEqual(work.content.media,[]);
 assert.equal((await db.query("select name from public.published_products where slug='security-product'")).rows[0].name,'Public Product');
 assert.equal((await db.query('select reviewer_name from public.published_project_reviews')).rows[0].reviewer_name,'Alice');
 await assert.rejects(db.query('select metadata from public.project_media'),/permission denied/);
 await assert.rejects(db.query('select content,repository_url from public.projects'),/permission denied/);
 await db.exec('reset role');
 await assert.rejects(db.exec("update public.project_deliverables set storage_path='"+two+"/"+delivery+"/evil.pdf'"),/check constraint/);
 await db.exec('set role service_role');
 assert.equal((await db.query("select public.consume_request_budget('test-budget',2,60) as ok")).rows[0].ok,true);
 assert.equal((await db.query("select public.consume_request_budget('test-budget',2,60) as ok")).rows[0].ok,true);
 assert.equal((await db.query("select public.consume_request_budget('test-budget',2,60) as ok")).rows[0].ok,false);
 }finally{await db.close();}
});
