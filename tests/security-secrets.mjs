import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const git=(args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:100*1024*1024,stdio:['pipe','pipe','ignore']});
const objects=git(['rev-list','--objects','--all']).trim().split('\n').map(line=>{const i=line.indexOf(' ');return [line.slice(0,i),line.slice(i+1)];}).filter(([,p])=>/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|env|local|example|config)$|(^|\/)\.env/.test(p));
const findings=[];
const inspect=(text,label)=>{
 const patterns=[['Supabase secret',/sb_secret_[A-Za-z0-9_-]{20,}/g],['GitHub token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],['Google key',/AIza[A-Za-z0-9_-]{30,}/g],['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],['credential URL',/postgres(?:ql)?:\/\/[^:\s]+:[^@\s]{4,}@/g]];
 for(const [kind,pattern]of patterns)if(pattern.test(text))findings.push({kind,location:label});
 for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(match[0].split('.')[1],'base64url')).role==='service_role')findings.push({kind:'service role JWT',location:label});}catch{}}
};
for(const [hash,path]of objects){try{inspect(git(['cat-file','blob',hash]),hash.slice(0,12)+':'+path);}catch{}}
const tracked=git(['ls-files','--cached','--others','--exclude-standard']).trim().split('\n');
for(const file of tracked)if(existsSync(file)&&/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|example)$/.test(file))inspect(readFileSync(file,'utf8'),'working:'+file);
console.log(JSON.stringify({historyObjectsScanned:objects.length,trackedPaths:tracked.length,findings},null,2));
const env=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
console.log(JSON.stringify({publicVerificationConfigured:/^NEXT_PUBLIC_SUPABASE_URL=.+/m.test(env)&&/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.+/m.test(env),privilegedPublicVariableNames:[...env.matchAll(/^(NEXT_PUBLIC_[A-Z_]*(?:SECRET|SERVICE_ROLE|PASSWORD|GEMINI_API_KEY|CURATOR_TOKEN))=/gm)].map(m=>m[1])}));
