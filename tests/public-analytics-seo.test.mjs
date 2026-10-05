import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { loadTs } from "./security-loader.mjs";
const source = path => readFileSync(path, "utf8");
const analytics = loadTs("src/lib/public-analytics.ts");
test("missing or invalid tracker IDs disable analytics", () => {
  const originalGA=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, originalClarity=process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  try {
    for(const value of ["", "invalid/id", "<script>"]) {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID=value; process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID=value;
      const mod=loadTs("src/lib/public-analytics.ts"); assert.equal(mod.analyticsConfigured,false);
      assert.doesNotThrow(()=>mod.trackPublicEvent("inquiry_start"));
    }
  } finally {
    if(originalGA===undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID; else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID=originalGA;
    if(originalClarity===undefined) delete process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID; else process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID=originalClarity;
  }
});
test("public route allowlist fails closed for all private routes and unknown paths",()=>{
  for(const path of ["/client","/client/projects/secret","/studio-admin","/studio-admin/reviews","/api/inquiries","/api","/unknown","//work","/work/a?email=a@b.com"]) {
    assert.equal(analytics.publicPath(path),null,path);
    assert.equal(analytics.eventPayload("inquiry_start",path),null,path);
  }
  for(const path of ["/","/work","/work/public-project","/products/my-product","/services","/pricing","/start-a-project","/policies/privacy-policy"]) assert.equal(analytics.publicPath(path),path);
});
test("event payloads discard PII and unexpected parameter names",()=>{
  const unsafe={name:"Jane",email:"private@example.com",details:"secret brief",client_project_id:"secret",payment:500,project_slug:"public-project",language:"bn",page_path:"/client/secret"};
  assert.deepEqual(JSON.parse(JSON.stringify(analytics.eventPayload("case_study_open","/work/public-project",unsafe))),{page_path:"/work/public-project",project_slug:"public-project"});
  assert.deepEqual(JSON.parse(JSON.stringify(analytics.eventPayload("inquiry_submit_success","/start-a-project",unsafe))),{page_path:"/start-a-project"});
  assert.equal(analytics.eventPayload("toString","/"),null);
  assert.doesNotMatch(JSON.stringify(analytics.eventPayload("outbound_social_click","/",{platform:"private@example.com"})),/private/);
});
test("page URLs preserve conventional campaign attribution without arbitrary fields or fragments",()=>{
  assert.equal(analytics.analyticsLocation("https://studio.test/?utm_source=facebook&utm_medium=social&utm_campaign=studio_launch&email=private@example.com#secret"),"https://studio.test/?utm_source=facebook&utm_medium=social&utm_campaign=studio_launch");
  assert.equal(analytics.analyticsLocation("https://studio.test/client/secret?utm_source=facebook"),null);
  assert.equal(analytics.analyticsLocation("https://studio.test/work?utm_campaign=person@example.com"),"https://studio.test/work");
});
test("separate root documents prevent loaded trackers surviving private or inquiry navigation",()=>{
  assert.equal(existsSync("src/app/layout.tsx"),false);
  for(const path of ["src/app/client/layout.tsx","src/app/studio-admin/layout.tsx"]) {
    assert.match(source(path),/DocumentShell/); assert.doesNotMatch(source(path),/PublicAnalytics/);
  }
  assert.match(source("src/app/(public)/layout.tsx"),/PublicAnalytics/);
  assert.match(source("src/app/start-a-project/layout.tsx"),/PublicAnalytics/);
  const tracker=source("src/components/analytics/public-analytics.tsx");
  assert.match(tracker,/consent !== "accepted"/);
  assert.match(tracker,/location.pathname !== "\/start-a-project"/);
  assert.match(tracker,/send_page_view: false/);
  assert.match(tracker,/lastPage.current !== page/);
  assert.match(tracker,/location.reload\(\)/);
  assert.match(source("src/components/global/document-shell.tsx"),/data-clarity-mask="true"/);
});
test("sitemap includes public pages, uses actual dates and excludes private pages",async()=>{
  const {default:sitemap}=loadTs("src/app/sitemap.ts",{
    "@/content/site":{site:{url:"https://taoshiflexstudio.me"}},
    "@/lib/studio-data":{getPublishedProjects:async()=>[{slug:"public-work",updatedAt:"2026-10-01T00:00:00Z"}],getPublishedProducts:async()=>[{slug:"public-product",updatedAt:"invalid"}]},
    "@/lib/policies":{getPublicPolicies:async()=>[],currentVersion:policy=>policy},
  });
  const entries=await sitemap(),urls=entries.map(entry=>new URL(entry.url).pathname);
  for(const path of ["/","/work","/products","/services","/pricing","/start-a-project","/policies","/work/public-work","/products/public-product"]) assert.ok(urls.includes(path),path);
  assert.doesNotMatch(JSON.stringify(entries),/client|studio-admin|\/api/);
  assert.equal(entries.find(entry=>entry.url.endsWith("/services")).lastModified,undefined);
  assert.equal(entries.find(entry=>entry.url.endsWith("/work/public-work")).lastModified.toISOString(),"2026-10-01T00:00:00.000Z");
  assert.equal(entries.find(entry=>entry.url.endsWith("/products/public-product")).lastModified,undefined);
});
test("robots excludes private routes and retains canonical sitemap URL",()=>{
  const {default:robots}=loadTs("src/app/robots.ts",{"@/content/site":{site:{url:"https://taoshiflexstudio.me"}}});
  const data=robots(); assert.equal(data.sitemap,"https://taoshiflexstudio.me/sitemap.xml");
  for(const path of ["/client","/studio-admin","/api"]) assert.ok(data.rules.disallow.includes(path));
});
test("public metadata keeps canonical, OG and Twitter consistent",()=>{
  const {publicMetadata}=loadTs("src/lib/seo.ts",{"@/content/site":{site:{name:"Studio"}}});
  const data=publicMetadata("Services","Custom development","/services");
  assert.equal(data.alternates.canonical,"/services"); assert.equal(data.openGraph.url,"/services");
  assert.equal(data.description,data.openGraph.description); assert.equal(data.description,data.twitter.description);
});
test("private CSP never adds tracker script or connection hosts",async()=>{
  const {default:config}=loadTs("next.config.ts");
  const headers=await config.headers();
  for(const source of ["/client/:path*","/studio-admin/:path*","/api/:path*"]) {
    const rule=headers.find(rule=>rule.source===source && rule.headers.some(header=>header.key==="Content-Security-Policy"));
    assert.ok(rule); assert.doesNotMatch(rule.headers.find(h=>h.key==="Content-Security-Policy").value,/googletagmanager|google-analytics|clarity/);
    assert.equal(rule.headers.find(h=>h.key==="X-Robots-Tag").value,"noindex, nofollow");
  }
});

import vm from "node:vm";
import ts from "typescript";
function mountAnalytics({configured=true,choice="accepted",pathname="/work",hasGA=true,hasClarity=true}={}) {
  const scripts=[],events=[],refs=[],listeners=new Map();
  let currentPath=pathname,currentChoice=choice,effects=[],refIndex=0,reloads=0;
  const location={origin:"https://studio.test",hostname:"studio.test",pathname,href:"https://studio.test"+pathname,search:"",hash:"",reload:()=>reloads++};
  const window={location};
  const document={referrer:"https://search.example/private?email=secret@example.com",getElementById:id=>scripts.find(s=>s.id===id),createElement:()=>({}),head:{appendChild:script=>scripts.push(script)},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const jsx=(type,props)=>({type,props});
  const mocks={
    react:{useRef:value=>refs[refIndex++]??(refs[refIndex-1]={current:value}),useState:value=>[value,()=>{}],useSyncExternalStore:()=>currentChoice,useEffect:fn=>effects.push(fn)},
    "react/jsx-runtime":{jsx,jsxs:jsx},"next/link":{default:"Link"},
    "next/navigation":{usePathname:()=>currentPath},
    "@/i18n/language-context":{useLanguage:()=>({language:"en"})},
    "@/lib/public-analytics":{...analytics,analyticsConfigured:configured,gaId:hasGA?"unit-test-only":"",clarityId:hasClarity?"unit-test-only":"",readConsent:()=>currentChoice,saveConsent:value=>{currentChoice=value;},clearAnalyticsCookies:()=>{},trackPublicEvent:(...args)=>events.push(args)},
    "./public-analytics.css":{},
  };
  const js=ts.transpileModule(source("src/components/analytics/public-analytics.tsx"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const exports={};
  vm.runInNewContext(js,{exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},window,document,location,URL,Element:class {}});
  function render(path=currentPath,consent=currentChoice) {
    currentPath=path;currentChoice=consent;location.pathname=path;location.href=location.origin+path;effects=[];refIndex=0;
    const tree=exports.PublicAnalytics();const cleanups=effects.map(fn=>fn()).filter(Boolean);return {tree,cleanups};
  }
  return {render,scripts,window,events,listeners,reloads:()=>reloads};
}
test("runtime: absent configuration and rejection never load scripts",()=>{
  for(const options of [{configured:false,hasGA:false,hasClarity:false},{choice:"rejected"},{choice:"unset"},{pathname:"/client/projects/private"},{pathname:"/studio-admin"},{pathname:"/api/inquiries"}]) {
    const h=mountAnalytics(options);h.render();assert.equal(h.scripts.length,0);
  }
});
test("runtime: consent starts once, route visits get one manual page view and referrers are sanitized",()=>{
  const h=mountAnalytics();h.render();h.render();
  assert.equal(h.scripts.length,2);
  const pages=()=>h.window.dataLayer.filter(args=>args[0]==="event"&&args[1]==="page_view");
  assert.equal(pages().length,1);
  h.render("/products");assert.equal(pages().length,2);
  h.render("/work");assert.equal(pages().length,3);
  assert.doesNotMatch(JSON.stringify(h.window.dataLayer),/secret@example|\/private/);
  assert.equal(h.window.dataLayer.find(args=>args[0]==="config")[2].send_page_view,false);
});
test("runtime: inquiry document omits Clarity and withdrawal reloads to unload trackers",()=>{
  const h=mountAnalytics({pathname:"/start-a-project"});h.render();
  assert.equal(h.scripts.length,1);assert.equal(h.scripts[0].id,"studio-ga");
  h.render("/start-a-project","rejected");assert.equal(h.reloads(),1);
});
test("runtime: GA can be enabled after an earlier decline",()=>{
  const h=mountAnalytics({choice:"rejected"});h.window["ga-disable-unit-test-only"]=true;h.render();
  h.render("/","accepted");assert.equal(h.window["ga-disable-unit-test-only"],false);assert.equal(h.scripts.length,2);
});
