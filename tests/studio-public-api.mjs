// Read-only production verification. Never creates, edits, or deletes data.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^"|"$/g,'')]}));
const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Public Supabase configuration required');
for(const path of ['products?select=*','product_media?select=*','project_reviews?select=*','projects?select=repository_url,github_repository_id,content','client_projects?select=*','client_project_members?select=*']){
 const response=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key}});
 const data=await response.json();assert.ok(response.status===401||response.status===403||(response.ok&&Array.isArray(data)&&data.length===0),`Unexpected anonymous access: ${path}`);console.log(`PASS anonymous blocked: ${path} (${response.status})`);
}
for(const path of ['published_products?select=*','published_project_reviews?select=*','published_work?select=*']){
 const response=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key}});assert.equal(response.status,200,path);const rows=await response.json();
 for(const row of rows)for(const field of ['reviewer_user_id','client_project_id','moderation_note','github_repository_id','github_updated_at','source_repository_private'])assert.equal(field in row,false,field);
 console.log(`PASS public projection: ${path} (${rows.length} records)`);
}
