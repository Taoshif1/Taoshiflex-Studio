import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {parseProduct, mapPublishedProduct} from '../src/lib/product-contract.ts';
const valid={slug:'owned-tool',name:'Owned Tool',tagline:'A useful tool',summary:'A manually authored product summary.',story:'',problem:'',solution:'',roadmap:'',category:'Software',accent:'#b89055',pricing_model:'',status:'Beta',features:['Useful feature'],technologies:['TypeScript'],product_url:null,repository_url:null,show_repository:false,source_repository_private:true,published:true,featured:true,sort_order:0,launch_date:null};
test('private-source product can publish authored content without repository',()=>{assert.ok(parseProduct(valid));assert.equal(parseProduct({...valid,repository_url:'https://github.com/private/source'}),null);assert.equal(parseProduct({...valid,show_repository:true}),null)});
test('product rejects invalid slugs, statuses, URLs, dates and featured drafts',()=>{for(const patch of [{slug:'Bad Slug'},{status:'Unknown'},{product_url:'javascript:alert(1)'},{product_url:'https://user:pass@example.com'},{launch_date:'2026-02-31'},{published:false},{features:['x'.repeat(201)]},{accent:'red; display:none'},{sort_order:1.2}])assert.equal(parseProduct({...valid,...patch}),null)});
test('private GitHub import stays draft and strips source-derived public links',()=>{const source=readFileSync(new URL('../src/app/api/studio/github/route.ts',import.meta.url),'utf8');assert.match(source,/featured:false,published:false,show_repository:false/);assert.match(source,/repository_url:repo.private\?null:repo.html_url/);assert.match(source,/live_url:repo.private\?null/);assert.match(source,/getAdminSession\(\)/);assert.match(source,/authorizeMutation\(request\)/)});
test('Postgres protects product drafts, source URLs, uniqueness and Work metadata',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create function public.is_studio_admin() returns boolean language sql as $$select false$$;
 create function public.touch_client_workspace_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
 create table public.projects(id uuid primary key default gen_random_uuid(),slug text,name text,category text,status text,summary text,published boolean,sort_order integer,created_at timestamptz,updated_at timestamptz,client text,accent text,featured boolean,live_url text,behance_url text,facebook_url text,repository_url text,show_repository boolean,github_repository_id bigint,github_updated_at timestamptz,content jsonb);
 create table public.project_media(id uuid,project_id uuid,role text,storage_path text,alt text,sort_order integer,metadata jsonb);
 grant select on public.projects to anon,authenticated;
 alter table public.projects enable row level security;create policy published on public.projects for select using(published);
 insert into public.projects(slug,name,published,repository_url,show_repository,github_repository_id,content) values('work','Authored work',true,'https://github.com/private/source',true,1,'{"github_token":"secret","context":"Authored context"}');`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260921203739_studio_products_and_source_privacy.sql',import.meta.url),'utf8'));
 await db.exec(`insert into public.products(slug,name,tagline,summary,published,featured,source_repository_private) values('private-product','Private source product','Authored tagline','An independently authored product description.',true,true,true);
 insert into public.products(slug,name) values('draft','Draft');`);
 await assert.rejects(db.exec("insert into public.products(slug,name) values('draft','Duplicate')"),/unique constraint/);
 await assert.rejects(db.exec("update public.products set repository_url='https://github.com/private/source' where source_repository_private"),/check constraint/);
 await assert.rejects(db.exec("update public.products set featured=true where slug='draft'"),/check constraint/);
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from public.product_media'),/permission denied/);
 await assert.rejects(db.query('select * from public.products'),/permission denied/);
 const rows=(await db.query('select * from public.published_products')).rows;assert.equal(rows.length,1);assert.equal(rows[0].slug,'private-product');assert.equal(rows[0].repository_url,null);assert.equal('source_repository_private' in rows[0],false);
 await assert.rejects(db.query('select repository_url from public.projects'),/permission denied/);
 await assert.rejects(db.query('select github_repository_id from public.projects'),/permission denied/);
 await assert.rejects(db.query('select content from public.projects'),/permission denied/);
 const work=(await db.query('select * from public.published_work')).rows[0];assert.equal(work.repository_url,null);assert.equal(work.show_repository,false);assert.equal(work.content.github_token,undefined);
 await db.exec('set role authenticated');await assert.rejects(db.exec("update public.products set published=true"),/permission denied/);
 }finally{await db.close();}
});

test('public product mapper drops private fields and maps only supplied media',()=>{
 const mapped=mapPublishedProduct({...valid,id:'public-id',source_repository_private:true,github_repository_id:123,token:'secret',media:[{metadata:{secret:true}}]},[]);
 assert.equal(mapped.name,valid.name);assert.equal(mapped.repository_url,null);assert.deepEqual(mapped.media,[]);
 for(const key of ['source_repository_private','github_repository_id','token','show_repository','published'])assert.equal(key in mapped,false);
});
test('public loader and assistant read only the published product projection',()=>{
 const data=readFileSync(new URL('../src/lib/studio-data.ts',import.meta.url),'utf8');
 const loader=data.slice(data.indexOf('export const getPublishedProducts'));
 assert.match(loader,/published_products\?select=/);assert.doesNotMatch(loader,/['"]products\?/);assert.match(loader,/mapPublishedProduct/);
 const assistant=readFileSync(new URL('../src/lib/studio-assistant-knowledge.ts',import.meta.url),'utf8');
 assert.match(assistant,/getPublishedProducts\(\)/);assert.match(assistant,/allowed.has\("products"\)/);
 assert.doesNotMatch(assistant,/repository_url|source_repository_private|github_repository_id/);
});
import vm from 'node:vm';
import ts from 'typescript';

function loadRoute(path, mocks) {
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(js,{exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name]},Response,Request,File,FormData,Uint8Array,URL});
 return exports;
}
test('admin product mutations reject unauthorized requests and invalid products before writes',async()=>{
 let writes=0;
 const mocks={
  '@/lib/admin-security':{authorizeMutation:async()=>({error:Response.json({error:'Unauthorized'},{status:401})})},
  '@/lib/product-contract':{parseProduct},'@/lib/review-contract':{reviewUuid:/^[0-9a-f-]{36}$/},
  '@/lib/supabase-rest':{supabaseRest:async()=>{writes++;return [{id:'33333333-3333-4333-8333-333333333333'}]}}
 };
 const route=loadRoute('../src/app/api/studio/products/route.ts',mocks);
 const request=body=>new Request('https://example.test/api/studio/products',{method:'POST',body:JSON.stringify(body)});
 assert.equal((await route.POST(request(valid))).status,401);assert.equal(writes,0);
 mocks['@/lib/admin-security'].authorizeMutation=async()=>({error:null});
 assert.equal((await route.POST(request({...valid,source_repository_private:true,repository_url:'https://github.com/private/source'}))).status,400);
 assert.equal((await route.PATCH(request({...valid,id:'bad'}))).status,400);assert.equal(writes,0);
 assert.equal((await route.POST(request(valid))).status,200);assert.equal(writes,1);
});
test('media replacement preserves the attached image when old storage cleanup fails',async()=>{
 const id='33333333-3333-4333-8333-333333333333',oldPath=`products/${id}/old.png`;const removed=[];let attached;
 const route=loadRoute('../src/app/api/studio/product-media/route.ts',{
  'node:crypto':{randomUUID:()=>id},
  '@/lib/admin-security':{authorizeMutation:async()=>({error:null}),cleanText:value=>typeof value==='string'?value:null},
  '@/lib/review-contract':{reviewUuid:/^[0-9a-f-]{36}$/},
  '@/lib/project-media':{PROJECT_MEDIA_MAX_BYTES:6000000,PROJECT_MEDIA_TYPES:['image/png'],validProjectImage:()=>true,uploadProjectMedia:async()=>{},removeProjectMedia:async paths=>{removed.push(...paths);throw Error('storage unavailable')}},
  '@/lib/supabase-rest':{supabaseRest:async(path,init)=>{if(init.method==='PATCH'){attached=JSON.parse(init.body);return []}return path.startsWith('products?')?[{id}]:[{id,product_id:id,role:'cover',storage_path:oldPath}]}},
 });
 const form=new FormData();form.set('productId',id);form.set('role','cover');form.set('alt','Product screenshot');form.set('file',new File(['fixture'],'image.png',{type:'image/png'}));
 const response=await route.POST(new Request('https://example.test/api/studio/product-media',{method:'POST',body:form}));
 assert.equal(response.status,200);assert.ok((await response.json()).warning);assert.deepEqual(removed,[oldPath]);assert.notEqual(attached.storage_path,oldPath);
});
